const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const crypto = require('node:crypto');
const path = require('node:path');
function load(file, mocks = {}, globals = {}) {
  const filename = path.resolve(file);
  const exports = {};
  const output = ts.transpileModule(fs.readFileSync(filename,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const sandbox = {exports, console, ...globals, require(name) {
    if (name in mocks) return mocks[name];
    if (name.startsWith('.')) return load(path.join(path.dirname(filename),name+'.ts'),mocks,globals);
    return require(name);
  }};
  vm.runInNewContext(output,sandbox,{filename}); return exports;
}
const parse = load('lib/signals/discovery.ts').parseDiscoveryObservation;
const id = '00000000-0000-4000-8000-000000000001';
const base = {observationId:id,signalType:'discovery_impression',surface:'homepage',subjectId:id,inventorySource:'hypeknight',placement:'tonight',metadata:{visible_fraction:0.5,visible_ms:1000}};
test('requires observation identity and observed visibility threshold',()=>{
  assert.ok(parse(base));
  for (const patch of [{observationId:'bad'},{subjectId:'bad'},{metadata:{}},{surface:'admin'},{inventorySource:'ticketmaster'}]) assert.equal(parse({...base,...patch}),null);
});
test('browser cannot promote evidence, actor or Featured attribution',()=>{
  const result = parse({...base,actorId:'admin',verificationLevel:'verified',venueId:id,marketId:id,metadata:{...base.metadata,exposure_class:'organic',acquisition_source:'paid',verified:true}});
  assert.equal(result.metadata.exposure_class,'organic');
  assert.equal(result.actorId,undefined); assert.equal(result.venueId,undefined); assert.equal(result.marketId,undefined);
  assert.equal(result.metadata.verified,undefined); assert.equal(result.metadata.acquisition_source,undefined);
  assert.equal(parse({...base,signalType:'featured_impression'}),null);
  assert.equal(parse({...base,signalType:'event_saved'}),null);
});
test('submission has no invented result count or canonical event identity',()=>{
  const result = parse({...base,signalType:'search_performed',metadata:{q:'  dancing ',city:'Kansas City',state:'MO',result_count:0},eventId:id});
  assert.equal(result.subjectId,null); assert.equal(result.inventorySource,null);
  assert.equal(result.metadata.q,'dancing'); assert.equal(result.metadata.result_count,null); assert.equal(result.metadata.result_coverage,'not_observed');
});
test('canonical registry covers 28 existing signals and distinguishes uninstrumented Featured',()=>{
  const definitions = load('lib/signals/definitions.ts');
  assert.equal(definitions.CANONICAL_SIGNAL_TYPES.length,30);
  assert.deepEqual(Object.keys(definitions.SIGNAL_DEFINITIONS).sort(),Array.from(definitions.CANONICAL_SIGNAL_TYPES).sort());
  assert.equal(definitions.SIGNAL_DEFINITIONS.featured_impression.instrumentation,'not_instrumented');
  for (const definition of Object.values(definitions.SIGNAL_DEFINITIONS)) for(const key of ['family','trigger','actor','context','attribution','verification','deduplication','instrumentation']) assert.ok(definition[key]);
});
test('transport retries exactly once with unchanged identity; reports storage failure',async()=>{
  const bodies=[]; let calls=0;
  const browser=load('lib/signals/discovery-browser.ts',{'./browser':{getAnonymousSessionId:()=>null}}, {crypto,fetch:async(_,options)=>{bodies.push(options.body);return {ok:++calls===2,status:calls===1?503:200};}});
  assert.equal(await browser.sendDiscoveryObservation(base),true);
  assert.equal(bodies.length,2); assert.equal(bodies[0],bodies[1]);
  const fail=load('lib/signals/discovery-browser.ts',{'./browser':{getAnonymousSessionId:()=>null}}, {crypto,console:{warn(){}},fetch:async()=>({ok:false,status:503})});
  assert.equal(await fail.sendDiscoveryObservation(base),false);
});
test('same placement/document identity survives remount but distinct inventory/placement does not collapse',()=>{
  const b=load('lib/signals/discovery-browser.ts',{'./browser':{getAnonymousSessionId:()=>null}},{crypto});
  const key=b.exposureKey('homepage','tonight','external',id);
  assert.equal(b.exposureObservationId(key),b.exposureObservationId(key));
  assert.notEqual(b.exposureObservationId(key),b.exposureObservationId(b.exposureKey('homepage','live','external',id)));
  assert.notEqual(b.exposureObservationId(key),b.exposureObservationId(b.exposureKey('homepage','tonight','hypeknight',id)));
});
test('only actual submissions emit searches, with a fresh identity each time',()=>{
  const queued=[];
  const b=load('lib/signals/discovery-browser.ts',{'./browser':{getAnonymousSessionId:()=>null}},{crypto,Blob,FormData:class{get(key){return key==='q'?'dance':null;}},navigator:{sendBeacon(url,blob){queued.push(blob);return true;}}});
  assert.equal(queued.length,0);
  b.recordSearchSubmission({},'homepage'); b.recordSearchSubmission({},'homepage');
  assert.equal(queued.length,2);
  return Promise.all(queued.map(blob=>blob.text())).then(bodies=>assert.notEqual(JSON.parse(bodies[0]).observationId,JSON.parse(bodies[1]).observationId));
});
function tracker() {
  const timers=new Map(); let next=0, observer, cleanup; const sent=[]; const listeners={};
  const doc={visibilityState:'visible',addEventListener(name,fn){listeners[name]=fn;},removeEventListener(name){delete listeners[name];}};
  const component=load('components/analytics/DiscoveryImpression.tsx',{
    react:{useRef:()=>({current:{}}),useEffect:fn=>{cleanup=fn();}},
    'react/jsx-runtime':{jsx:()=>null},
    '@/lib/signals/discovery-browser':{exposureKey:()=> 'key',exposureObservationId:()=>id,sendDiscoveryObservation:input=>{sent.push(input);return Promise.resolve(true);}},
  },{document:doc,IntersectionObserver:class{constructor(fn,opts){observer={fn,opts,disconnected:false};}observe(){}disconnect(){observer.disconnected=true;}},setTimeout(fn){timers.set(++next,fn);return next;},clearTimeout(id){timers.delete(id);}});
  component.default({subjectId:id,inventorySource:'hypeknight',surface:'homepage',placement:'tonight'});
  return {doc,sent,timers,listeners,observer,cleanup:()=>cleanup(),enter(ratio=0.5){observer.fn([{isIntersecting:ratio>0,intersectionRatio:ratio}]);},tick(){const jobs=[...timers.values()];timers.clear();jobs.forEach(fn=>fn());}};
}
test('render/prefetch/offscreen/subthreshold cards emit no impression',()=>{
  const t=tracker(); assert.equal(t.sent.length,0); t.enter(0.49);t.tick();assert.equal(t.sent.length,0);t.cleanup();assert.ok(t.observer.disconnected);
});
test('requires continuous visibility, resets on leave and hidden-tab transitions',()=>{
  const t=tracker();t.enter();assert.equal(t.timers.size,1);t.enter(0);t.tick();assert.equal(t.sent.length,0);
  t.enter();t.doc.visibilityState='hidden';t.listeners.visibilitychange();t.tick();assert.equal(t.sent.length,0);
  t.doc.visibilityState='visible';t.listeners.visibilitychange();t.tick();assert.equal(t.sent.length,1);
  t.enter();t.tick();assert.equal(t.sent.length,1);t.cleanup();
});
test('cleanup cancels uncompleted exposure',()=>{const t=tracker();t.enter();t.cleanup();t.tick();assert.equal(t.sent.length,0);});
test('SSR results no longer record searches and auth/public query guards stay present',()=>{
  const s=fs.readFileSync('app/events/page.tsx','utf8');
  assert.ok(!s.includes("signalType: 'search_performed'")); assert.ok(s.includes('<DiscoverySearchForm'));
  for(const guard of [".eq('is_public', true)",".is('removed_at', null)",".in('status', ['scheduled', 'active'])"]) assert.ok(s.includes(guard));
  assert.ok(!s.includes('service_role'));
});
test('API rejects forged/oversized observations and truthfully surfaces collector errors',async()=>{
  let error=null, calls=0;
  const route=load('app/api/signals/discovery/route.ts',{
    'next/server':{NextResponse:{json:(body,options)=>({body,status:options?.status||200})}},
    '@/lib/supabase/server':{createClient:async()=>({rpc:async(name,args)=>{calls++;assert.equal(name,'record_discovery_observation');assert.ok(!('p_actor_id' in args));return {error};}})},
    '@/lib/signals/discovery':{parseDiscoveryObservation:parse},
  },{console:{error(){}}});
  const request = body => ({text:async()=>typeof body==='string'?body:JSON.stringify(body)});
  assert.equal((await route.POST(request(base))).status,200);
  error={code:'missing_migration'};assert.equal((await route.POST(request(base))).status,503);
  assert.equal((await route.POST(request({...base,signalType:'event_saved'}))).status,400);
  assert.equal((await route.POST(request('a'.repeat(8193)))).status,413);assert.equal(calls,2);
});

test('known state names normalize without inventing unknown geography',()=>{
  assert.equal(parse({...base,signalType:'search_performed',metadata:{city:'Kansas City',state:'Missouri'}}).metadata.state,'MO');
});
test('unobserved searches are never averaged as zero and explicit zero remains an observation',()=>{
  const market={key:'registered',city:'Kansas City',state:'MO'};
  const module=load('lib/intelligence/market-intelligence.ts',{'@/lib/markets/normalize-market':{normalizeMarket:()=>market}});
  const now=new Date('2026-10-08T12:00:00Z');
  const signal=count=>({signal_type:'search_performed',city:'Kansas City',state:'MO',occurred_at:now.toISOString(),metadata:{result_count:count}});
  let row=module.buildMarketIntelligence({now,signals:[signal(null)]})[0];
  assert.equal(row.averageResultsPerSearch7d,null);assert.equal(row.searchesWithObservedResults7d,0);
  row=module.buildMarketIntelligence({now,signals:[signal(null),signal(8)]})[0];
  assert.equal(row.averageResultsPerSearch7d,8);assert.equal(row.searchesWithObservedResults7d,1);assert.equal(row.searches7d,2);
  row=module.buildMarketIntelligence({now,signals:[signal(0)]})[0];
  assert.equal(row.averageResultsPerSearch7d,0);assert.equal(row.searchesWithObservedResults7d,1);assert.equal(row.zeroResultSearches7d,1);
});

test('explicit Featured or invalid exposure classes are rejected rather than relabeled organic',()=>{
  for(const exposure_class of ['featured','paid',null,1]) assert.equal(parse({...base,metadata:{...base.metadata,exposure_class}}),null);
  assert.ok(parse({...base,metadata:{...base.metadata,exposure_class:'organic'}}));
});
