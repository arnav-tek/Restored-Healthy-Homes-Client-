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
  "20261116000656_admin_featured_and_reporting.sql",
])
  await db.exec(
    await readFile(
      new URL("../supabase/migrations/" + name, import.meta.url),
      "utf8",
    ),
  );
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

const run=p=>rpc(admin,'rhh_admin_operations',p),get=(view='selected',page=1)=>run({action:'get_featured',view,page}),report=(month='2026-02',page=1)=>run({action:'report',page,month});
eq((await get('eligible')).items,[]);eq((await report()).total,0);eq((await report()).months.every(m=>m.count===0),true);
const ids=Array.from({length:9},(_,i)=>`10000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
await db.query("insert into rhh.accounts(user_id,role) values($1,'member'),($2,'member') on conflict do nothing",[a,b]);
const statuses=['active','active','inactive','active','trialing','past_due','canceled','unpaid',null],approvals=['approved','approved','approved','approved','pending','rejected','pending','pending','pending'];
for(let i=0;i<ids.length;i++) {
 await db.query("insert into rhh.professionals(id,business_name,city,state,description,healthy_home_practices) values($1,$2,'Fixture city','CA','Synthetic listing description for isolated tests.','Synthetic practices for isolated tests only.')",[ids[i],i<2?'Same fixture name':`Fixture ${i}`]);
 await db.query("insert into rhh.applications(professional_id,contact_name,contact_email,approval,suspended,submitted_at,internal_notes) values($1,'PRIVATE CONTACT','private@example.invalid',$2,$3,$4,'PRIVATE INTERNAL NOTE')",[ids[i],approvals[i],i===3,i===0?'2026-01-31T23:59:59.999999Z':i===2?'2026-03-01T00:00:00Z':'2026-02-01T00:00:00Z']);
 if(statuses[i])await db.query("insert into rhh.memberships(professional_id,status,featured_entitlement) values($1,$2,$3)",[ids[i],statuses[i],i===1?'active':'none']);
 await db.query("insert into rhh.professional_categories(professional_id,category_id) values($1,'mold-inspection')",[ids[i]]);
}
await db.query("insert into rhh.professional_categories(professional_id,category_id) values($1,'healthy-trades')",[ids[0]]);
await db.query("update rhh.professionals set owner_id=$1 where id=$2",[a,ids[0]]);await db.query("update rhh.professionals set owner_id=$1 where id=$2",[b,ids[1]]);
const mutation={action:'set_featured',page:1,view:'eligible',id:ids[0],selected:true,version:0,reason:'Isolated editorial selection'};
for(const uid of [null,a,b])for(const p of [{action:'get_featured',view:'eligible',page:1},{action:'report',page:1,month:'2026-02'},mutation])await denied(()=>rpc(uid,'rhh_admin_operations',p),'42501');
await denied(()=>rpc(b,'rhh_admin_operations',{...mutation,id:ids[1]}),'42501');
let r=await report();eq(r.total,9);eq(r.applicationStatuses,{pending:4,approved:4,rejected:1});eq(r.membershipStates,{active:3,inactive:1,past_due:1,canceled:1,trialing:1,unpaid:1,missing:1});eq(r.eligible,2);eq(r.featured,{selected:0,visibleEditorial:0,entitled:1,visibleEntitled:1,visible:1});eq(r.months.at(-1),{month:'2026-02',count:7});eq(r.months.at(-2),{month:'2026-01',count:1});eq(r.months.length,12);eq(r.categories.find(c=>c.id==='mold-inspection').total,9);eq(r.categories.find(c=>c.id==='healthy-trades').total,1);eq(r.categories.find(c=>c.id==='mold-inspection').eligible,2);eq(r.categories.find(c=>c.id==='healthy-trades').eligible,1);
eq((await get()).items,[]);eq((await get('eligible')).items.map(i=>i.id),ids.slice(0,2));eq((await get('entitled')).total,1);
for(const patch of [{selected:'true'},{version:'0'},{reason:''},{reason:'x'.repeat(301)},{actorId:admin},{role:'admin'},{approval:'approved'},{membership:'active'},{featured_entitlement:'active'},{order:1},{id:'guess'},{page:0},{view:'all'}])await denied(()=>run({...mutation,...patch}),'22023');
for(const i of [2,3,4,8])await denied(()=>run({...mutation,id:ids[i]}),'PT409');
const before=(await db.query('select professional_id,status,featured_entitlement from rhh.memberships order by professional_id')).rows;
let s=await run(mutation);eq(s.saved,true);eq(s.history.length,1);eq(s.history[0].actorId,admin);eq(s.items[0].selected,true);eq(s.items[0].version,1);
eq((await db.query('select professional_id,status,featured_entitlement from rhh.memberships order by professional_id')).rows,before);
const publicRead=async()=>as(null,async()=>(await db.query('select public.rhh_public_directory() r')).rows[0].r);
let pub=await publicRead();eq(pub.profiles.map(p=>p.id).sort(),ids.slice(0,2));eq(pub.profiles.find(p=>p.id===ids[0]).featured,false);eq(pub.profiles.find(p=>p.id===ids[0]).editorialFeatured,true);eq(pub.profiles.find(p=>p.id===ids[1]).featured,true);eq(pub.profiles.find(p=>p.id===ids[1]).editorialFeatured,false);
s=await run({...mutation,version:1});eq(s.unchanged,true);eq(s.history.length,1);
await denied(()=>run({...mutation,selected:false}),'PT409');
r=await report();eq(r.featured.visible,2);eq(r.featured.selected,1);
await db.query('update rhh.applications set suspended=true where professional_id=$1',[ids[0]]);eq((await publicRead()).profiles.some(p=>p.id===ids[0]),false);s=await get();eq(s.items[0].selected,true);eq(s.items[0].visible,false);eq((await report()).featured.visibleEditorial,0);await denied(()=>run({...mutation,version:1}),'PT409');
s=await run({...mutation,selected:false,version:1,view:'selected'});eq(s.items.length,0);eq(s.history.length,2);eq(s.history[0].selected,false);eq((await report()).featured.selected,0);
await db.query('update rhh.applications set suspended=false where professional_id=$1',[ids[0]]);eq((await publicRead()).profiles.find(p=>p.id===ids[0]).editorialFeatured,false);s=await run({...mutation,version:2});eq(s.items[0].version,3);
// Entitlement and editorial overlap is counted as one visible featured listing.
await run({...mutation,id:ids[1],version:0});r=await report();eq(r.featured,{selected:2,visibleEditorial:2,entitled:1,visibleEntitled:1,visible:2});
for(const uid of [null,a,b])for(const table of ['editorial_featured','featured_changes'])await denied(()=>as(uid,()=>db.query(`select * from rhh_private.${table}`)),'42501');
await denied(()=>db.query('update rhh_private.featured_changes set reason=$1',['forged history']),'42501');
await db.query("update rhh.accounts set role='member' where user_id=$1",[admin]);await denied(get,'42501');await denied(report,'42501');await denied(()=>run({...mutation,version:3,selected:false}),'42501');await db.query("update rhh.accounts set role='admin' where user_id=$1",[admin]);await db.query('delete from auth.sessions where user_id=$1',[admin]);await denied(report,'42501');await db.query('insert into auth.sessions(id,user_id) values($1,$1)',[admin]);
await db.exec("set time zone 'Pacific/Auckland'");eq((await report()).months.at(-1),{month:'2026-02',count:7});await db.exec("set time zone 'UTC'");
eq((await report('0001-01')).months,[{month:'0001-01',count:0}]);eq((await report('9999-12')).months.at(-1),{month:'9999-12',count:0});for(const month of ['0000-01','2026-13','2026-00','2026-2','bad'])await denied(()=>report(month),'22023');
// Supporting pages are bounded and ties use immutable UUID order.
for(let i=10;i<=32;i++){const id=`10000000-0000-4000-8000-${String(i).padStart(12,'0')}`;await db.query("insert into rhh.professionals(id,business_name,city,state,description,healthy_home_practices) values($1,'Same fixture name','Fixture city','CA','Synthetic listing description for isolated tests.','Synthetic practices for isolated tests only.')",[id]);await db.query("insert into rhh.applications(professional_id,contact_name,contact_email,approval,submitted_at) values($1,'PRIVATE','private@example.invalid','approved','2026-02-01T00:00Z')",[id]);await db.query("insert into rhh.memberships(professional_id,status) values($1,'active')",[id]);}
const f1=await get('eligible'),f2=await get('eligible',2);eq(f1.items.length,20);eq(f2.items.length,5);eq(new Set([...f1.items,...f2.items].map(i=>i.id)).size,25);eq((await report('2026-02',2)).items.length,12);eq(new Set([...(await report()).items,...(await report('2026-02',2)).items].map(i=>i.id)).size,32);
const previous=await report();
await db.exec("insert into rhh.professionals(id,business_name,city,state,description,healthy_home_practices) values('10000000-0000-4000-8000-000000000099','Unlinked membership fixture','Fixture city','CA','Synthetic listing description for isolated tests.','Synthetic practices for isolated tests only.');insert into rhh.memberships(professional_id,status) values('10000000-0000-4000-8000-000000000099','active');");
const withUnlinked=await report();eq(withUnlinked.membershipStates.active,previous.membershipStates.active+1);eq(withUnlinked.total,previous.total);eq(withUnlinked.eligible,previous.eligible);
for(const value of [await get('eligible'),await report(),await publicRead()])eq(/PRIVATE CONTACT|PRIVATE INTERNAL|private@example|stripe_|owner_id|internal_notes/.test(JSON.stringify(value)),false);
console.log(`PASS: ${checks} isolated featured/reporting SQL assertions; synthetic identities/data. Sequential CAS, not overlapping hosted transactions or real authenticated acceptance.`);await db.close();
