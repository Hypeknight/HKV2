/* Opt-in full Supabase Auth/PostgREST + Next HTTP integration. Empty loopback fixture only. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {randomUUID,randomBytes}=require('node:crypto');
const {spawn}=require('node:child_process');
const {Client}=require('pg');
const {createClient}=require('@supabase/supabase-js');
const {createServerClient}=require('@supabase/ssr');
const endpoint=process.env.COMMUNITY_PULSE_LOCAL_URL;
const database=process.env.COMMUNITY_PULSE_LOCAL_DATABASE_URL;
for(const value of [endpoint,database]){const url=new URL(value||'https://invalid');assert.ok(['127.0.0.1','localhost','[::1]'].includes(url.hostname),'Explicit loopback endpoints required');}
const publicKey=process.env.COMMUNITY_PULSE_LOCAL_ANON_KEY,serviceKey=process.env.COMMUNITY_PULSE_LOCAL_SERVICE_KEY;
assert.ok(publicKey&&serviceKey,'Disposable local keys required');
const origin='http://127.0.0.1:3234';
const db=new Client({connectionString:database});
const service=createClient(endpoint,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
const anon=createClient(endpoint,publicKey,{auth:{persistSession:false,autoRefreshToken:false}});
let server;
const log=fs.openSync('/tmp/hkv2-p3b-next-transport.log','w');
async function rpc(client,name,args={}){const result=await client.rpc(name,args);assert.ifError(result.error);return result.data;}
async function main(){
 await db.connect();
 assert.equal((await db.query("select to_regclass('public.profiles') as existing")).rows[0].existing,null,'Only an empty disposable application schema is allowed');
 await db.query(`create table public.profiles(id uuid primary key,app_role text,display_name text); alter table public.profiles enable row level security;
 create policy own_profile on public.profiles for select to authenticated using(id=(select auth.uid())); grant select on public.profiles to authenticated;
 create table public.markets(id uuid primary key,status text,name text); alter table public.markets enable row level security;
 create table public.market_areas(market_id uuid,city text,state text,is_active boolean); alter table public.market_areas enable row level security;
 create schema bm1_private; create function bm1_private.is_admin() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.profiles where id=auth.uid() and app_role='admin')$$;`);
 for(const ending of ['_bm1_public_community_pulse_p3a.sql','_community_pulse_home_and_editor.sql']){
 const filename=fs.readdirSync('supabase/migrations').find(n=>n.endsWith(ending));await db.query(fs.readFileSync('supabase/migrations/'+filename,'utf8'));}
 await db.query("notify pgrst,'reload schema'");
 const people=[];
 for(let i=0;i<7;i++){
  const email=`p3b-${randomUUID()}@example.test`,password=randomBytes(24).toString('base64url');
  const made=await service.auth.admin.createUser({email,password,email_confirm:true});assert.ifError(made.error);
  const id=made.data.user.id;await db.query('insert into public.profiles values($1,$2,$3)',[id,i===0?'admin':'member','Disposable P3B reviewer']);
  const cookies=[];const client=createServerClient(endpoint,publicKey,{cookies:{getAll:()=>cookies,setAll:values=>{for(const value of values){const index=cookies.findIndex(c=>c.name===value.name);if(index<0)cookies.push(value);else cookies[index]=value;}}}});
  assert.ifError((await client.auth.signInWithPassword({email,password})).error);
  people.push({id,client,cookie:()=>cookies.map(c=>c.name+'='+c.value).join('; ')});
 }
 // A real user token cannot call privileged collector/read RPCs or editorial functions.
 assert.ok((await anon.rpc('community_pulse_editor')).error);
 assert.ok((await people[1].client.rpc('community_pulse_editor')).error);
 assert.ok((await people[1].client.rpc('community_pulse_home',{p_city:'',p_state:''})).error);
 const make={p_prompt:'Disposable transport Friday?',p_description:null,p_options:['Music','Dancing'],p_market:null,p_city:null,p_state:null,p_opens:new Date(Date.now()-60000).toISOString(),p_closes:new Date(Date.now()+3600000).toISOString(),p_guests:false,p_supersedes:null};
 const question=await rpc(people[0].client,'community_pulse_create',make);
 await rpc(people[0].client,'community_pulse_transition',{p_question:question,p_status:'open'});
 await rpc(people[0].client,'community_pulse_set_home',{p_question:question,p_selected:true});
 const publicQuestion=await rpc(service,'community_pulse_home',{p_city:'',p_state:''});assert.equal(publicQuestion.id,question);
 const option=publicQuestion.options[0].id;
 assert.ok((await people[1].client.rpc('community_pulse_account_submit',{p_question:question,p_option:option,p_operation:randomUUID(),p_revision:0,p_notice:'community-pulse-v1',p_user:people[1].id})).error);
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3234'],{cwd:process.cwd(),env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:endpoint,NEXT_PUBLIC_SUPABASE_ANON_KEY:publicKey,SUPABASE_SERVICE_ROLE_KEY:serviceKey,NEXT_PUBLIC_SITE_URL:origin,HYPEKNIGHT_COMMUNITY_PULSE_ENABLED:'1',NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore',log,log]});
 let ready=false;for(let i=0;i<45;i++){try{if((await fetch(origin+'/api/community-pulse')).ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,1000));}assert.ok(ready,'Next HTTP server did not become ready');
 async function submit(person,payload,originHeader=origin){return fetch(origin+'/api/community-pulse',{method:'POST',headers:{Origin:originHeader,'Content-Type':'application/json',...(person?{Cookie:person.cookie()}:{})},body:JSON.stringify(payload)});}
 const payload={questionId:question,optionId:option,operationId:randomUUID(),expectedRevision:0,noticeVersion:'community-pulse-v1'};
 assert.equal((await submit(null,payload)).status,401);
 assert.equal((await submit(people[1],payload,'https://evil.test')).status,403);
 const receipt=await submit(people[1],{...payload,userId:people[2].id,participantId:people[2].id});assert.equal(receipt.status,200);assert.deepEqual(await receipt.json(),{state:'accepted',revision:1});
 assert.deepEqual(await (await submit(people[1],payload)).json(),{state:'accepted',revision:1});
 const own=await fetch(origin+'/api/community-pulse/state?question='+question,{headers:{Cookie:people[1].cookie()}});assert.match(own.headers.get('cache-control'),/no-store/);assert.equal((await own.json()).optionId,option);
 const unrelated=await fetch(origin+'/api/community-pulse/state?question='+question,{headers:{Cookie:people[2].cookie()}});assert.deepEqual(await unrelated.json(),{state:'none'});
 const race=await Promise.all([1,2].map(()=>submit(people[1],{...payload,optionId:publicQuestion.options[1].id,operationId:randomUUID(),expectedRevision:1}).then(r=>r.json())));assert.deepEqual(race.map(r=>r.state).sort(),['accepted','revision_conflict']);
 for(let i=2;i<people.length;i++)assert.equal((await (await submit(people[i],{...payload,operationId:randomUUID()})).json()).state,'accepted');
 await rpc(people[0].client,'community_pulse_transition',{p_question:question,p_status:'closed'});
 const result=await (await fetch(origin+'/api/community-pulse')).json();assert.equal(result.question.report.total,6);assert.equal(result.question.report.state,'available');assert.equal(result.question.report.options.reduce((n,o)=>n+o.count,0),6);
 const text=JSON.stringify(result);for(const person of people)assert.ok(!text.includes(person.id));assert.doesNotMatch(text,/participant_key|token|digest|response_id|service_role/);
 assert.equal((await fetch(origin+'/admin/community-pulse',{redirect:'manual'})).status,307);
 assert.equal((await fetch(origin+'/admin/community-pulse',{headers:{Cookie:people[1].cookie()},redirect:'manual'})).status,307);
 const admin=await fetch(origin+'/admin/community-pulse',{headers:{Cookie:people[0].cookie()}});assert.equal(admin.status,200);assert.match(await admin.text(),/Ask the community/);
 console.log('PASS real local Supabase Auth, PostgREST ACLs, Next cookie identity, no spoofing, duplicate replay, concurrent revisions, frozen aggregate, private state and admin access');
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(server)server.kill('SIGTERM');await db.end();fs.closeSync(log);});
