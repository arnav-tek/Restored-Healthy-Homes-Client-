import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
// Isolated test dependency; see docs/database-foundation-handoff.md.
const { PGlite } = await import('../output/database-test/node_modules/@electric-sql/pglite/dist/index.js');
const db = new PGlite();
const sql = await readFile(new URL('../supabase/migrations/20261107231103_database_foundation.sql', import.meta.url), 'utf8');
await db.exec('create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key);');
await db.exec(sql);
assert.equal((await db.query('select count(*)::int n from rhh.categories')).rows[0].n, 8);
const catalogSource = await readFile(new URL('../src/domain/categories.ts', import.meta.url), 'utf8');
const expectedCategories = [...catalogSource.matchAll(/id: "([^"]+)"[\s\S]*?name: "([^"]+)"[\s\S]*?monthlyUsd: (\d+)[\s\S]*?billingKey: "([^"]+)"/g)].map(([,id,name,price,billing_key]) => ({id,name,monthly_usd:Number(price),billing_key})).sort((a,b)=>a.id.localeCompare(b.id));
assert.equal(expectedCategories.length,8);
assert.deepEqual((await db.query('select id,name,monthly_usd,billing_key from rhh.categories order by id')).rows,expectedCategories);
assert.equal((await db.query("select count(*)::int n from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='rhh' and c.relkind='r' and c.relrowsecurity and c.relforcerowsecurity")).rows[0].n, 15);
for (const approval of ['pending','approved','rejected']) for (const subscription of ['active','inactive','past_due','canceled','trialing','unpaid']) for (const suspended of [true,false]) {
  const { rows } = await db.query('select rhh.is_publicly_eligible($1,$2,$3) ok',[approval,subscription,suspended]);
  assert.equal(rows[0].ok, approval==='approved' && subscription==='active' && !suspended);
}
for (const role of ['anon','authenticated']) {
  await db.exec(`set role ${role}`);
  await assert.rejects(db.query('select * from rhh.applications'), /permission denied/);
  await assert.rejects(db.query("insert into rhh.categories values ('bad','bad',1,'bad',true)"), /permission denied/);
  await db.exec('reset role');
}
await assert.rejects(db.query("insert into rhh.professional_categories values (gen_random_uuid(),'missing')"), /foreign key/);
await db.exec("insert into rhh.professionals (business_name,city,state,description,healthy_home_practices) values ('Test','Test','NC',repeat('x',20),repeat('y',20));");
const id = (await db.query('select id from rhh.professionals')).rows[0].id;
await db.query('insert into rhh.applications (professional_id,contact_name,contact_email) values ($1,$2,$3)',[id,'Sample','sample@example.invalid']);
await db.query('insert into rhh.memberships(professional_id) values ($1)',[id]);
assert.equal((await db.query('select approval from rhh.applications')).rows[0].approval,'pending');
assert.equal((await db.query('select status from rhh.memberships')).rows[0].status,'inactive');
await assert.rejects(db.query("insert into rhh.credentials(professional_id,name,verification) values ($1,'Test','verified')",[id]), /check constraint/);
await assert.rejects(db.query("insert into rhh.reviews(professional_id,display_name,rating,body) values ($1,'Test',6,repeat('x',20))",[id]), /check constraint/);
await db.query("insert into rhh.professional_categories values ($1,'healthy-builders')",[id]);
await db.exec("update rhh.categories set name='Renamed' where id='healthy-builders'");
assert.equal((await db.query('select category_id from rhh.professional_categories')).rows[0].category_id,'healthy-builders');
await assert.rejects(db.exec(sql), /already exists/);
await db.exec('rollback');
assert.equal((await db.query('select count(*)::int n from rhh.categories')).rows[0].n,8);
await db.close();
console.log('PASS: migration, 36 eligibility combinations, 15 forced-RLS tables, role denials, defaults, constraints, category identity and safe rerun.');
