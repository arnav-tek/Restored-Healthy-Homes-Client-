import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { openInquiryTestDatabase, a, b } from "./lib/inquiry-test-database.mjs";
const db = await openInquiryTestDatabase();
await db.exec(
  "create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb);",
);
for (const name of [
  "20261113010253_profile_media.sql",
  "20261113024706_connected_qa.sql",
  "20261113073823_credential_evidence_and_reviews.sql",
  "20261113082223_connected_qa_moderation.sql",
  "20261113083217_qa_moderation_queue_order.sql",
  "20261113090302_connected_reviews_and_ratings.sql",
  "20261113092925_preserve_published_review_note_edits.sql",
  "20261114191924_connected_consultations.sql",
  "20261114201534_member_consultation_participation.sql",
  "20261115210226_admin_category_management.sql",
  "20261115220610_connected_content_management.sql",
  "20261115221709_content_provider_url_validation.sql",
]) {
  if(name.endsWith('connected_content_management.sql')) await db.exec(`insert into rhh.articles(id,slug,title,category,summary,body,status) values('00000000-0000-4000-8000-000000000007','existing-published-url','Existing saved article','planning','Existing real-format editorial summary.','Existing saved article body must survive the migration unchanged.','published');
  insert into rhh.certification_pathways(category_id,introduction,provider_name,provider_url,qualification_kind,description,requirements,steps,timeline,costs,status) values('healthy-trades','Existing pathway introduction.','Existing provider','https://provider.example/legacy','Professional certification','Existing saved program description.','Existing saved entry requirements.',array['Existing saved first step'],'To be confirmed','To be confirmed','published');`);
  await db.exec(
    await readFile(
      new URL("../supabase/migrations/" + name, import.meta.url),
      "utf8",
    ),
  );
}
const admin = "00000000-0000-4000-8000-000000000004";
await db.query(
  "insert into auth.users(id,email_confirmed_at) values($1,now());",
  [admin],
);
await db.query("insert into auth.sessions(id,user_id) values($1,$1)", [admin]);
await db.query("insert into rhh.accounts(user_id,role) values($1,'admin')", [
  admin,
]);
let checks = 0;
const eq = (x, y) => {
  assert.deepEqual(x, y);
  checks++;
};
const denied = async (fn, code) => {
  await assert.rejects(fn, code ? { code } : undefined);
  checks++;
};
async function as(uid, fn) {
  await db.exec(
    `set role ${uid ? "authenticated" : "anon"};select set_config('request.jwt.claim.sub','${uid ?? ""}',false)`,
  );
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
  }
}
async function rpc(uid, name, payload) {
  return as(
    uid,
    async () =>
      (
        await db.query(`select public.${name}($1::jsonb) r`, [
          JSON.stringify(payload),
        ])
      ).rows[0].r,
  );
}

const get=()=>rpc(admin,'rhh_admin_content',{action:'get'});
const read=async(kind,key=null)=>as(null,async()=> (await db.query('select public.rhh_public_content($1,$2) r',[kind,key])).rows[0].r);
const fields={title:'Synthetic resource',summary:'Synthetic editorial summary for isolated tests.',category:'planning',body:'Synthetic article body for isolated database publication testing only.'};
const create={action:'create',kind:'resource',key:'isolated-test-resource',fields,reason:'Synthetic testing'};
for(const uid of [null,a,b]){await denied(()=>rpc(uid,'rhh_admin_content',{action:'get'}),'42501');await denied(()=>rpc(uid,'rhh_admin_content',create),'42501');}
eq((await read('resource')).items[0].key,'existing-published-url');
eq((await read('pathway')).items[0].key,'healthy-trades');
eq((await db.query("select id,slug,status from rhh.articles where slug='existing-published-url'")).rows[0],{id:'00000000-0000-4000-8000-000000000007',slug:'existing-published-url',status:'published'});
let state=await rpc(admin,'rhh_admin_content',create), doc=state.items[0];
eq(doc.version,1);eq(doc.published,null);eq(state.history.length,1);eq((await read('resource',doc.key)).items,[]);
await denied(()=>rpc(admin,'rhh_admin_content',create),'PT409');
await denied(()=>rpc(admin,'rhh_admin_content',{...create,key:'Bad Slug'}),'22023');
await denied(()=>rpc(admin,'rhh_admin_content',{...create,key:'other',actorId:admin}),'22023');
await denied(()=>rpc(admin,'rhh_admin_content',{...create,key:'other',fields:{...fields,status:'published'}}),'22023');
await denied(()=>rpc(admin,'rhh_admin_content',{...create,key:'other',fields:{...fields,title:'x'.repeat(121)}}),'22023');
const mutate=(action,extra={})=>rpc(admin,'rhh_admin_content',{action,kind:doc.kind,id:doc.id,version:doc.version,reason:'Synthetic decision',...extra});
await denied(()=>mutate('publish',{approved:'true'}),'22023');
state=await mutate('publish',{approved:true});doc=state.items[0];eq(doc.version,2);eq(doc.published.fields.title,fields.title);eq((await read('resource',doc.key)).items[0].fields,fields);
eq(Object.keys((await read('resource',doc.key)).items[0]).sort(),['fields','key','kind']);
eq((await db.query('select slug,status from rhh.articles where id=$1',[doc.id])).rows[0],{slug:doc.key,status:'published'});
const privateDraft={...fields,title:'PRIVATE DRAFT MARKER',body:'Edited body remains unpublished until another explicit publication decision.'};
state=await mutate('save',{fields:privateDraft});const old=doc;doc=state.items[0];eq(doc.version,3);eq(doc.published.fields.title,fields.title);eq((await read('resource',doc.key)).items[0].fields.title,fields.title);
await denied(()=>rpc(admin,'rhh_admin_content',{action:'save',kind:doc.kind,id:doc.id,version:old.version,fields,reason:'Stale competitor'}),'PT409');
eq((await read('resource',doc.key)).total,1);
state=await mutate('publish',{approved:true});doc=state.items[0];eq((await read('resource',doc.key)).items[0].fields.title,privateDraft.title);
state=await mutate('publish',{approved:true});eq(state.unchanged,true);eq(state.items[0].version,doc.version);eq(state.history.length,4);
state=await mutate('unpublish');doc=state.items[0];eq((await read('resource',doc.key)).items,[]);eq((await read('resource')).total,1);eq(doc.fields.title,privateDraft.title);
eq((await db.query('select status from rhh.articles where id=$1',[doc.id])).rows[0].status,'draft');
for(const uid of [null,a,b]) {await denied(()=>as(uid,()=>db.query('select draft from rhh_private.content_documents')),'42501');await denied(()=>as(uid,()=>db.query('select * from rhh_private.content_changes')),'42501');await denied(()=>as(uid,()=>db.query('select * from rhh.articles')),'42501');}
await db.query("update rhh.accounts set role='member' where user_id=$1",[admin]);await denied(get,'42501');await denied(()=>mutate('publish',{approved:true}),'42501');await db.query("update rhh.accounts set role='admin' where user_id=$1",[admin]);
await db.query('delete from auth.sessions where user_id=$1',[admin]);await denied(get,'42501');await db.query('insert into auth.sessions(id,user_id) values($1,$1)',[admin]);
await denied(()=>as(admin,()=>db.query('update rhh_private.content_changes set reason=$1',['forged'])),'42501');
await denied(()=>db.query('delete from rhh_private.content_changes'),'42501');
const empty=(kind)=>Object.fromEntries(Object.keys(spec[kind]).map(k=>[k,'']));
const {contentFields:spec}=await import("../src/domain/site-content.ts");
for(const kind of ['about','contact','terms','privacy','disclaimer']) {
 const f=empty(kind);f.title='Synthetic '+kind;f.summary='Synthetic approved copy in isolated tests only.';if(kind==='about'){f.story='Synthetic story';f.why='Synthetic reason';}else f.body='Synthetic client-provided copy. This is isolated test content only.';
 let r=await rpc(admin,'rhh_admin_content',{action:'create',kind,key:kind,fields:f,reason:'Synthetic testing'});let row=r.items[0];eq((await read(kind)).items,[]);
 if(kind==='about') {await denied(()=>rpc(admin,'rhh_admin_content',{action:'save',kind,id:row.id,version:row.version,fields:{...f,videoSrc:'https://evil.example/iframe'},reason:'Unsafe video'}),'22023');await denied(()=>rpc(admin,'rhh_admin_content',{action:'save',kind,id:row.id,version:row.version,fields:{...f,videoSrc:'/media/client/../secret.mp4'},reason:'Unsafe video'}),'22023');}
 if(kind==='contact'){await denied(()=>rpc(admin,'rhh_admin_content',{action:'save',kind,id:row.id,version:row.version,fields:{...f,email:'x@example.com\nBcc:evil'},reason:'Invalid contact'}),'22023');}
 r=await rpc(admin,'rhh_admin_content',{action:'publish',kind,id:row.id,version:row.version,approved:true,reason:'Synthetic approval'});row=r.items[0];eq((await read(kind,kind)).items[0].fields,f);
}
const pathway={introduction:'Synthetic education introduction.',providerName:'Synthetic provider',providerUrl:'https://provider.example/program',kind:'Professional certification',description:'Synthetic program description only.',requirements:'Synthetic eligibility requirements.',steps:'Synthetic step one\nSynthetic step two',timeline:'To be confirmed',costs:'To be confirmed'};
let r=await rpc(admin,'rhh_admin_content',{action:'create',kind:'pathway',key:'mold-inspection',fields:pathway,reason:'Synthetic pathway'}),row=r.items[0];
for(const u of ['javascript:alert(1)','https://user:pass@provider.example','https://example.com\\@evil.example','//provider.example','http://provider.example','https://provider#not-a-domain.example'])await denied(()=>rpc(admin,'rhh_admin_content',{action:'save',kind:'pathway',id:row.id,version:row.version,fields:{...pathway,providerUrl:u},reason:'Unsafe provider'}),'22023');
r=await rpc(admin,'rhh_admin_content',{action:'publish',kind:'pathway',id:row.id,version:row.version,approved:true,reason:'Synthetic approval'});eq((await read('pathway','mold-inspection')).items[0].fields,pathway);
eq((await db.query("select steps,status from rhh.certification_pathways where category_id='mold-inspection'")).rows[0],{steps:['Synthetic step one','Synthetic step two'],status:'published'});
eq((await get()).total,9);
console.log(`PASS: ${checks} isolated content assertions. Synthetic identities/data; not hosted authenticated acceptance or overlapping transactions.`);
await db.close();
