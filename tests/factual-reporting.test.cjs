const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
function load(file,mocks={}) {
  const exports={};
  const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  new Function('exports','require','console',source)(exports,name=>name in mocks ? mocks[name] : require(name),{error(){}});
  return exports;
}
const facts=load('lib/reporting/factual.ts');
const Panel=load('components/patron-pulse/PulseResultsPanel.tsx').default;
const summary=(type,count,unique=count)=>({signal_type:type,signal_count:count,unique_actor_count:unique});
const pulse={id:'pulse',title:'Pick a song',status:'open',pulse_type:'poll',options:[{id:'a',label:'A'},{id:'b',label:'B'}]};
const answer=(id,option,time='2026-10-09T12:00:00Z')=>({id,pulse_id:'pulse',option_id:option,submitted_at:time,updated_at:time});
test('zero is observed; missing observations and query failures are distinct',()=>{
  assert.equal(facts.formatFact(facts.eventFacts([summary('event_view',0)],null).views),'0');
  assert.equal(facts.formatFact(facts.eventFacts([],null).views),'No observations');
  for(const [data,error] of [[null,null],[[],{message:'failed'}],[[summary('event_view',6)],{message:'partial'}]]) {
    const result=facts.eventFacts(data,error);assert.equal(result.available,false);assert.equal(facts.formatFact(result.views),'Unavailable');assert.equal(result.total.value,null);
  }
  assert.equal(facts.exactCount(0,null),0);assert.equal(facts.exactCount(null,null),null);assert.equal(facts.exactCount(4,{}),null);
});
test('malformed summary rows are unavailable rather than fabricated counts',()=>{
  for(const value of [null,'',-1,'broken',Infinity]) assert.equal(facts.eventFacts([summary('event_view',value)],null).available,false);
});
test('organic observations and unknown acquisition never imply Featured exposure',()=>{
  const result=facts.eventFacts([summary('discovery_impression',9),summary('featured_purchase',2)],null);
  assert.equal(result.discoveryImpressions.value,9);assert.equal(result.organicImpressions.value,null);assert.equal(result.featuredImpressions.value,null);assert.equal(result.featuredImpressions.state,'not_instrumented');
});
test('Pulse empty or incomplete samples withhold every percentage',()=>{
  let result=facts.pulseFacts([pulse],[],0,null)[0];assert.equal(result.totalResponses,0);assert.equal(result.options[0].count,0);assert.equal(result.options[0].percentage,null);
  for(const [rows,count,error] of [[null,null,null],[[answer('1','a')],2,null],[[answer('1','a')],1,{message:'failure'}]]) {
    result=facts.pulseFacts([pulse],rows,count,error)[0];assert.equal(result.available,false);assert.equal(result.totalResponses,null);assert.equal(result.options[0].percentage,null);
  }
});
test('latest revision contributes one current answer; separate participants remain distinct',()=>{
  const rows=[answer('guest','a'),answer('guest','b','2026-10-09T13:00:00Z'),answer('account','a')];
  const result=facts.pulseFacts([pulse],rows,3,null)[0];assert.equal(result.totalResponses,2);assert.equal(result.optionSample,2);assert.equal(result.options[0].percentage,50);assert.equal(result.options[1].count,1);
});
test('unmatched options are excluded from valid option percentage denominators',()=>{
  const result=facts.pulseFacts([pulse],[answer('1','a'),answer('2','wrong')],2,null)[0];assert.equal(result.totalResponses,2);assert.equal(result.optionSample,1);assert.equal(result.options[0].percentage,100);
});
test('actual result rendering has no empty-sample percentage or fabricated unavailable zero',()=>{
  const html=renderToStaticMarkup(React.createElement(Panel,{results:facts.pulseFacts([pulse],[],0,null)}));
  assert.match(html,/0 current answers/);assert.match(html,/percentages are withheld/);assert.doesNotMatch(html,/0\.0%|width:/);
  const unavailable=renderToStaticMarkup(React.createElement(Panel,{results:[],unavailable:true}));assert.match(unavailable,/results are unavailable/);assert.doesNotMatch(unavailable,/0 current/);
});
function client(summaryResult,{user='owner',owner='owner'}={}) {
  const queried=[];
  const event={id:'event',owner_id:owner,name:'Test',slug:'test',status:'scheduled',is_public:true,is_approved:true,event_start_at:'2026-11-01T19:00:00Z',included_promo_days:14};
  return {queried,auth:{getUser:async()=>({data:{user:user?{id:user}:null},error:null})},
    from(table){queried.push(table);const result={data:table==='events' && owner===user?event:null,error:null};const q={};for(const method of ['select','eq','in','order']) q[method]=()=>q;q.single=async()=>result;q.maybeSingle=async()=>result;return q;},
    rpc:async(name)=>name==='get_owned_event_signal_summary'?summaryResult:{data:[],error:null}};
}
function mission(db) {
  const empty=()=>null;
  return load('app/dashboard/events/[id]/page.tsx',{
    'next/link':{default:({children,...props})=>React.createElement('a',props,children)},
    'next/navigation':{redirect:()=>{throw new Error('redirect');}},
    '@/lib/supabase/server':{createClient:async()=>db},
    '@/lib/reporting/factual':facts,
    '@/app/dashboard/events/actions':{startEventRevision:empty},
    '@/lib/commerce/event-order':{getExtendedDiscoveryUpgradeOptions:()=>[]},
    '@/components/events/PublicEventLinkCard':{default:empty},
    '@/components/events/ExtendedDiscoveryUpgradeControl':{default:empty},
    '@/components/events/FeaturedPurchaseControl':{default:empty},
  }).default;
}
test('Mission Control renders identifier definition, current-state limits and canonical-only evidence',async()=>{
  const db=client({data:[summary('event_view',6,2),summary('event_saved',4)],error:null});
  const html=renderToStaticMarkup(await mission(db)({params:Promise.resolve({id:'event'})}));
  assert.match(html,/Distinct View Identifiers/);assert.match(html,/not unique people/);assert.doesNotMatch(html,/Unique Reach/);
  assert.match(html,/Historical Save Actions/);assert.match(html,/Currently Saved/);assert.match(html,/Unknown acquisition remains unknown/);
  assert.ok(!db.queried.includes('analytics_logs'));assert.ok(!db.queried.includes('event_rsvps'));
  assert.match(html,/Featured exposure is not instrumented/);
});
test('Mission Control error rendering withholds all signal counts',async()=>{
  const html=renderToStaticMarkup(await mission(client({data:[summary('event_view',99)],error:{message:'rpc failure'}}))({params:Promise.resolve({id:'event'})}));
  assert.match(html,/temporarily unavailable/);assert.doesNotMatch(html,/>99</);assert.doesNotMatch(html,/No observations for these actions/);
});
test('Mission Control preserves unauthenticated and non-owner access checks',async()=>{
  await assert.rejects(mission(client({data:[],error:null},{user:null}))({params:Promise.resolve({id:'event'})}),/redirect/);
  await assert.rejects(mission(client({data:[],error:null},{user:'other'}))({params:Promise.resolve({id:'event'})}),/Event not found/);
});
test('response and check-in identities stay out of factual result props',()=>{
  const result=facts.pulseFacts([pulse],[{...answer('1','a'),participant_id:'secret-participant',user_id:'secret-account',presence_verification_id:'secret-evidence'}],1,null);
  const html=renderToStaticMarkup(React.createElement(Panel,{results:result}));assert.doesNotMatch(JSON.stringify(result)+html,/secret-/);assert.doesNotMatch(html,/verified attendee/);
});
function pulseOwner(db) {
  const empty=()=>null;
  return load('app/dashboard/events/[id]/patron-pulse/page.tsx',{
    'next/link':{default:({children,...props})=>React.createElement('a',props,children)},
    'next/navigation':{redirect:()=>{throw new Error('redirect');},notFound:()=>{throw new Error('not found');}},
    '@/lib/supabase/server':{createClient:async()=>db},
    '@/lib/reporting/factual':facts,
    '@/components/patron-pulse/PulseResultsPanel':{default:Panel},
    '@/components/patron-pulse/PatronPulseAutoRefresh':{default:empty},
    '@/components/patron-pulse/PatronPulseActivityTimeline':{default:empty},
    './actions':{createPatronPulse:empty,createPatronPulseAnnouncement:empty,updatePatronPulseAnnouncementStatus:empty,updatePatronPulseSessionSettings:empty,updatePatronPulseStatus:empty},
  }).default;
}
function pulseClient({responseError=null,rows=[],count=rows.length,checkinError=null,user='owner',role='user'}={}) {
  const selects=[];
  return {selects,auth:{getUser:async()=>({data:{user:user?{id:user}:null},error:null})},from(table){
    let head=false;
    const result=()=> {
      if(table==='events') return {data:{id:'event',owner_id:'owner',name:'Test'},error:null};
      if(table==='platform_systems') return {data:{id:'system'},error:null};
      if(['event_system_activations','event_patron_pulse_settings'].includes(table)) return {data:null,error:null};
      if(table==='profiles') return {data:{app_role:role},error:null};
      if(table==='patron_pulse_sessions') return {data:{id:'session',status:'open'},error:null};
      if(table==='patron_pulses') return {data:[pulse],error:null};
      if(table==='patron_pulse_checkins') return {data:null,count:0,error:checkinError};
      if(table==='patron_pulse_responses') return {data:head?null:rows,count,error:responseError};
      return {data:[],error:null};
    };
    const q={select(columns,options){selects.push(columns);head=options?.head;return q;},then(resolve,reject){return Promise.resolve(result()).then(resolve,reject);},single:async()=>result(),maybeSingle:async()=>result()};
    for(const name of ['eq','in','order','limit']) q[name]=()=>q;return q;
  }};
}
test('organizer Pulse query errors and truncated rows render unavailable, never percentages',async()=>{
  for(const config of [{responseError:{message:'failed'}},{rows:[answer('1','a')],count:2}]) {
    const db=pulseClient(config);const html=renderToStaticMarkup(await pulseOwner(db)({params:Promise.resolve({id:'event'})}));
    assert.match(html,/Pulse results are unavailable/);assert.doesNotMatch(html,/100\.0%/);
    assert.ok(!db.selects.join(' ').includes('participant_token'));assert.ok(!db.selects.join(' ').includes('user_id'));
  }
});
test('organizer check-in query failure is unavailable while valid empty Pulse sample stays zero',async()=>{
  const html=renderToStaticMarkup(await pulseOwner(pulseClient({checkinError:{message:'failed'}}))({params:Promise.resolve({id:'event'})}));
  assert.match(html,/Unavailable/);assert.match(html,/0 current answers/);assert.doesNotMatch(html,/0\.0%/);
});
test('organizer Pulse authorizes owner/admin, denies other users and anonymous access',async()=>{
  await assert.rejects(pulseOwner(pulseClient({user:null}))({params:Promise.resolve({id:'event'})}),/redirect/);
  await assert.rejects(pulseOwner(pulseClient({user:'other'}))({params:Promise.resolve({id:'event'})}),/redirect/);
  await pulseOwner(pulseClient({user:'admin',role:'admin'}))({params:Promise.resolve({id:'event'})});
});
test('admin Pulse count query failures are unavailable in every count display',async()=>{
  const db=pulseClient({user:'admin',role:'admin',responseError:{message:'failed'},checkinError:{message:'failed'}});
  const page=load('app/admin/patron-pulse/[eventId]/page.tsx',{
    'next/link':{default:({children,...props})=>React.createElement('a',props,children)},
    'next/navigation':{redirect:()=>{throw new Error('redirect');},notFound:()=>{throw new Error('not found');}},
    '@/lib/supabase/server':{createClient:async()=>db},'@/lib/reporting/factual':facts,'../actions':{},
  }).default;
  const html=renderToStaticMarkup(await page({params:Promise.resolve({eventId:'event'})}));
  assert.match(html,/Current Answer Rows/);assert.match(html,/Unavailable/);assert.doesNotMatch(html,/>null</);
});
