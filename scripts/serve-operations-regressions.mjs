// Controlled actual-component harness. Synthetic data, no hosted Auth/database or billing.
import {createRequire} from 'node:module';import {createServer} from 'node:http';import {mkdir,readFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{build}=require('esbuild'),dir='output/operations-regressions';await mkdir(dir,{recursive:true});
const alias={'next/link':'./tests/fixtures/consultation-link.tsx'};
await build({entryPoints:['tests/fixtures/operations-management.tsx'],bundle:true,outfile:dir+'/bundle.js',jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'},alias});
await build({entryPoints:['tests/fixtures/operations-ssr.tsx'],bundle:true,outfile:dir+'/ssr.cjs',platform:'node',format:'cjs',jsx:'automatic',packages:'external',loader:{'.css':'empty'},alias});
const {editor,report,publicViews,parse}=require('../'+dir+'/ssr.cjs');
const base=()=>({kind:'featured',page:1,view:'selected',total:0,items:[],history:[]});
const record=()=>({id:'00000000-0000-4000-8000-000000000001',businessName:'Synthetic eligible listing',approval:'approved',membership:'active',suspended:false,entitlement:'none',selected:false,version:0,eligible:true,visible:false});
let rows=[record()],history=[],failNext=false,denied=false;
const workspace=(view='selected',page=1)=>{const filtered=rows.filter(i=>view==='selected'?i.selected:view==='eligible'?i.eligible:i.entitlement==='active');return {...base(),view,page,total:filtered.length,items:filtered.slice((page-1)*20,page*20),history};};
const reportValue=()=>({kind:'report',asOf:new Date().toISOString(),month:'2026-11',page:1,total:rows.length,eligible:rows.filter(i=>i.eligible).length,undated:0,applicationStatuses:{pending:0,approved:rows.length,rejected:0},membershipStates:{active:rows.length,inactive:0,past_due:0,canceled:0,trialing:0,unpaid:0,missing:0},featured:{selected:rows.filter(i=>i.selected).length,visibleEditorial:rows.filter(i=>i.selected&&i.eligible).length,entitled:0,visibleEntitled:0,visible:rows.filter(i=>i.selected&&i.eligible).length},categories:[{id:'mold-inspection',name:'Synthetic category',active:true,total:rows.length,activeMemberships:rows.length,eligible:rows.filter(i=>i.eligible).length}],months:[{month:'2026-10',count:0},{month:'2026-11',count:rows.length}],items:rows.slice(0,20).map(i=>({id:i.id,businessName:i.businessName,approval:i.approval,membership:i.membership,suspended:i.suspended,submittedAt:'2026-11-01T00:00:00Z'}))});
createServer(async(req,res)=>{
 const json=(value,status=200)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(value));};const url=new URL(req.url,'http://127.0.0.1:3246');
 if(url.pathname==='/reset'){rows=[record()];history=[];failNext=denied=false;return json({reset:true});}
 if(url.pathname==='/fail-next'){failNext=true;return json({ready:true});}
 if(url.pathname==='/stale'){rows[0].version++;rows[0].selected=false;rows[0].visible=false;return json({saved:true});}
 if(url.pathname==='/suspend'){rows[0].suspended=true;rows[0].eligible=false;rows[0].visible=false;return json({saved:true});}
 if(url.pathname==='/many'){rows=Array.from({length:23},(_,i)=>({...record(),id:`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,businessName:`Synthetic listing ${String(i+1).padStart(2,'0')}`}));return json({ready:true});}
 if(url.pathname==='/revoke'){denied=true;return json({ready:true});}
 if(url.pathname==='/api/admin/featured'){
  if(denied)return json({error:'Current administrator access is required.'},403);
  if(req.method==='GET')return json(workspace(url.searchParams.get('view')??'selected',Number(url.searchParams.get('page')??1)));
  if(!req.headers['content-type']?.startsWith('application/json'))return json({error:'Use JSON. Native submission cannot save.'},415);
  if(failNext){failNext=false;return json({error:'Saving failed. Your draft is retained.'},503);}
  let raw='';for await(const chunk of req)raw+=chunk;const p=parse(JSON.parse(raw));if(!p||p.action!=='set_featured')return json({error:'Invalid change'},400);const row=rows.find(i=>i.id===p.id);
  if(!row||p.version!==row.version)return json({error:'The saved selection changed. Your draft is retained; reload and compare before retrying.'},409);
  if(p.selected&&!row.eligible)return json({error:'This listing is no longer eligible. Your draft is retained.'},409);
  const unchanged=row.selected===p.selected;if(!unchanged){row.selected=p.selected;row.version++;row.visible=row.eligible&&(row.selected||row.entitlement==='active');history.unshift({id:crypto.randomUUID(),professionalId:row.id,actorId:'00000000-0000-4000-8000-000000000004',selected:p.selected,version:row.version,reason:p.reason,at:new Date().toISOString()});}return json({...workspace(p.view,p.page),saved:true,unchanged});
 }
 if(url.pathname==='/bundle.js'||url.pathname==='/bundle.css'){res.setHeader('content-type',url.pathname.endsWith('css')?'text/css':'text/javascript');return res.end(await readFile(dir+url.pathname));}
 const publicPage=url.pathname==='/public',reportPage=url.pathname==='/admin/reports',gated=denied&&url.pathname==='/admin';
 res.setHeader('content-type','text/html; charset=utf-8');res.end(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Controlled operations fixture</title><link rel="stylesheet" href="/bundle.css"><style>*,*::before,*::after{box-sizing:border-box}body{margin:0;padding:20px;background:#f4f1ea;color:#263e29;font:16px Arial}main{max-width:1050px;margin:auto}.panel{padding:20px;background:white;border:1px solid #ddd;margin-block:20px}.member-form-fields{display:grid;gap:12px;border:0;padding:0}.search-field{display:grid;gap:8px}button,.button{padding:10px;min-height:44px}input,textarea,select{padding:10px;font:inherit}h1,h2,h3{font-family:Georgia}.field-error{color:#8d3422}p{line-height:1.5}.admin-stat-grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}.admin-breakdown>div{display:flex;gap:20px;justify-content:space-between}.admin-inline-actions{display:flex;gap:12px;flex-wrap:wrap}th,td{padding:10px;text-align:left}details{margin-block:12px}.featured-card,.professional-card{padding:20px;border:1px solid #ddd}</style></head><body><h1>Controlled operations acceptance</h1><p>Synthetic data and controlled APIs; actual components, no live authorization.</p><main id="root">${gated?'<p>Administrator access required.</p>':publicPage?publicViews(rows):reportPage?report(reportValue()):editor(workspace())}</main>${publicPage||reportPage||gated?'':`<script id="fixture-data" type="application/json">${JSON.stringify(workspace()).replaceAll('<','\\u003c')}</script><script src="/bundle.js"></script>`}</body></html>`);
}).listen(3246,'127.0.0.1');
