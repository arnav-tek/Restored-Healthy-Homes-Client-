// Controlled actual-component harness only. No Supabase, Auth, email or publication side effects.
import {createRequire} from 'node:module';import {createServer} from 'node:http';import {mkdir,readFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{build}=require('esbuild'),dir='output/content-regressions';await mkdir(dir,{recursive:true});
const alias={'next/link':'./tests/fixtures/consultation-link.tsx'};
await build({entryPoints:['tests/fixtures/content-management.tsx'],bundle:true,outfile:dir+'/bundle.js',jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'},alias});
await build({entryPoints:['tests/fixtures/content-ssr.tsx'],bundle:true,outfile:dir+'/ssr.cjs',platform:'node',format:'cjs',jsx:'automatic',packages:'external',loader:{'.css':'empty'},alias});
const {editor,preview,parse}=require('../'+dir+'/ssr.cjs');
const initial=()=>({page:1,total:1,items:[{id:'00000000-0000-4000-8000-000000000001',kind:'resource',key:'synthetic-article',fields:{title:'Synthetic published article',summary:'Synthetic approved summary for controlled UI tests.',category:'planning',body:'Synthetic published article body for controlled UI tests only.'},version:1,publishedVersion:null,published:null}],history:[]});let state=initial(),failNext=false;
createServer(async(req,res)=>{
 const json=(value,status=200)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(value));};
 const url=new URL(req.url,'http://127.0.0.1:3245');if(url.pathname==='/reset'){state=initial();return json({reset:true});}
 if(url.pathname==='/fail-next'){failNext=true;return json({ready:true});}
 if(url.pathname==='/stale'){state.items[0].version++;state.items[0].fields.title='Competing saved title';return json({saved:true});}
 if(url.pathname==='/api/admin/content'){
  if(req.method==='GET')return json(state);
  if(!req.headers['content-type']?.startsWith('application/json'))return json({error:'Use JSON. Native submission cannot save.'},415);
  if(failNext){failNext=false;return json({error:'Temporary save failure. Your draft is retained.'},503);}
  let raw='';for await(const chunk of req)raw+=chunk;const p=parse(JSON.parse(raw));if(!p)return json({error:'Invalid content'},400);
  let doc=state.items[0];if(p.action!=='create'&&p.version!==doc.version)return json({error:'This content changed. Your draft is retained; reload and compare before retrying.'},409);
  if(p.action==='create'){doc={id:'00000000-0000-4000-8000-000000000002',kind:p.kind,key:p.key,fields:p.fields,version:1,publishedVersion:null,published:null};state.items=[doc];state.total=1;}
  else {doc.version++;if(p.action==='save')doc.fields=p.fields;if(p.action==='publish'){doc.published={kind:doc.kind,key:doc.key,fields:structuredClone(doc.fields)};doc.publishedVersion=doc.version;}if(p.action==='unpublish'){doc.published=null;doc.publishedVersion=null;}}
  state.history.unshift({id:crypto.randomUUID(),action:p.action,version:doc.version,at:new Date().toISOString(),reason:p.reason});return json({...state,saved:true});
 }
 if(url.pathname==='/bundle.js'||url.pathname==='/bundle.css'){res.setHeader('content-type',url.pathname.endsWith('css')?'text/css':'text/javascript');return res.end(await readFile(dir+url.pathname));}
 const publicPage=url.pathname.startsWith('/resources/'),content=state.items[0].published;
 res.setHeader('content-type','text/html; charset=utf-8');res.end(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Controlled editorial fixture</title><link rel="stylesheet" href="/bundle.css"><style>*,*::before,*::after{box-sizing:border-box}body{margin:0;padding:20px;background:#f4f1ea;color:#263e29;font:16px Arial}.panel{padding:20px;background:white;border:1px solid #ddd;margin-block:20px}.member-form-fields{display:grid;gap:12px;border:0;padding:0}.search-field{display:grid;gap:8px}button{padding:10px;min-height:44px}input,textarea,select{padding:10px;font:inherit}h1,h2,h3{font-family:Georgia}.field-error{color:#8d3422}p{line-height:1.5}details{margin-block:12px}.session-resource-paragraph{white-space:pre-wrap}</style></head><body><h1>Controlled content acceptance</h1><p>Synthetic records; actual components. No live authentication or database.</p><main id="root">${publicPage?(content?preview(content):'<p>Unpublished content unavailable.</p>'):editor(state)}</main>${publicPage?'':`<script id="fixture-data" type="application/json">${JSON.stringify(state).replaceAll('<','\\u003c')}</script><script src="/bundle.js"></script>`}</body></html>`);
}).listen(3245,'127.0.0.1');
