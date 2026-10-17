const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const {renderToStaticMarkup: render} = require('react-dom/server');

function load(file, mocks={}) {
  const exports = {};
  const js = ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  new Function('exports','require','process',js)(exports, name => Object.hasOwn(mocks,name) ? mocks[name] : name === '@/lib/auth/return-path' ? paths : require(name), {env:{NEXT_PUBLIC_SITE_URL:'https://hypeknight.test'}});
  return exports;
}
const paths = load('lib/auth/return-path.ts');
const destinations = ['/events/native-event','/dashboard/events/event-id?tab=results','/dashboard/venues/venue-id','/admin/patron-pulse','/events?q=live%20music#results','/events?q=100%25#results'];
for(const destination of destinations) test('safe destination survives: '+destination,()=>{
  assert.equal(paths.safeReturnPath(destination),destination);
  assert.equal(new URL(paths.authHref('login',destination),'https://hypeknight.test').searchParams.get('next'),destination);
});
test('external, malformed, normalized auth loops and encoded redirects are rejected',()=>{
  for(const value of [null,undefined,[],42,'','https://evil.test','//evil.test','/\\evil.test','javascript:alert(1)','/\nevil','/%2f%2fevil.test','/%252f%252fevil.test','/%5cevil.test','/%255cevil.test','/%0a/evil.test','/%zz','/auth/login','/auth/callback?next=/auth/login','/x/../auth/login','/%61uth/login','/api/action','/AUTH/login']) assert.equal(paths.safeReturnPath(value),'/dashboard',String(value));
});

function actions({error=null,throws=false,session=null}={}) {
  const calls=[];
  const auth=Object.fromEntries(['signInWithPassword','signUp','signOut','exchangeCodeForSession'].map(method=>[method,async args=>{calls.push({method,args});if(throws)throw Error('private provider details');return {error,data:{session}};}]));
  const mocks={
    '@/lib/supabase/server':{createClient:async()=>({auth})},
    'next/navigation':{redirect:url=>{throw Object.assign(Error('redirect'),{destination:url});}},
    'next/cache':{revalidatePath:(...args)=>calls.push({invalidate:args})},
  };
  return {calls,mocks,module:load('app/auth/actions.ts',mocks)};
}
function form(next='/events/native-event'){return new Map([['email','user@example.test'],['password','test-only-password'],['display_name','Fixture'],['next',next]]);}
async function redirected(promise){try{await promise;assert.fail('expected redirect');}catch(e){if(!e.destination)throw e;return e.destination;}}
for(const next of destinations) test('login returns to intended event/workspace and invalidates layout: '+next,async()=>{
  const h=actions();assert.equal(await redirected(h.module.login(form(next))),next);
  assert.deepEqual(h.calls.at(-1),{invalidate:['/','layout']});
});
test('direct action redirect injection is rejected',async()=>{
  const h=actions();assert.equal(await redirected(h.module.login(form('//evil.test'))),'/dashboard');
});
for(const failure of [{error:{message:'private database detail'}},{throws:true}]) test('login failure is recoverable and preserves safe intent '+JSON.stringify(failure),async()=>{
  const h=actions(failure);const url=new URL(await redirected(h.module.login(form())),'https://hypeknight.test');
  assert.equal(url.pathname,'/auth/login');assert.equal(url.searchParams.get('next'),'/events/native-event');assert.equal(url.searchParams.get('error'),'sign_in_failed');assert.doesNotMatch(url.href,/private|password/);
});
test('sign-up carries destination through confirmation and login; optional immediate session works',async()=>{
  const h=actions();const url=new URL(await redirected(h.module.signup(form())),'https://hypeknight.test');
  assert.equal(url.searchParams.get('next'),'/events/native-event');assert.equal(url.searchParams.get('message'),'confirmation_sent');
  assert.equal(new URL(h.calls[0].args.options.emailRedirectTo).searchParams.get('next'),'/events/native-event');
  const immediate=actions({session:{user:{id:'test-only'}}});assert.equal(await redirected(immediate.module.signup(form())),'/events/native-event');
  assert.deepEqual(immediate.calls.at(-1),{invalidate:['/','layout']});
});
test('failed sign-up preserves destination without leaking provider errors',async()=>{
  const h=actions({error:{message:'private provider detail'}});const url=new URL(await redirected(h.module.signup(form())),'https://hypeknight.test');
  assert.equal(url.pathname,'/auth/sign-up');assert.equal(url.searchParams.get('next'),'/events/native-event');assert.equal(url.searchParams.get('error'),'sign_up_failed');
});
test('logout invalidates shared identity and does not claim success on failure',async()=>{
  const h=actions();assert.equal(await redirected(h.module.signOut()),'/');assert.deepEqual(h.calls.at(-1),{invalidate:['/','layout']});
  const bad=actions({throws:true});assert.equal(await redirected(bad.module.signOut()),'/auth/login?error=sign_out_failed');
});
test('callback requires successful exchange and retains sanitized intent on failure',async()=>{
  for(const [query,fails,expected] of [['code=valid&next=%2Fevents%2Fnative-event',false,'/events/native-event'],['code=valid&next=%2F%2Fevil.test',false,'/dashboard'],['next=%2Fdashboard%2Fvenues',false,'/auth/login'],['code=invalid&next=%2Fdashboard%2Fvenues',true,'/auth/login']]){
    const h=actions({throws:fails});const mod=load('app/auth/callback/route.ts',{...h.mocks,'next/server':{NextResponse:{redirect:url=>url}}});
    const result=await mod.GET(new Request('https://hypeknight.test/auth/callback?'+query));assert.equal(result.pathname,expected);
    if(expected==='/auth/login')assert.equal(result.searchParams.get('next'),'/dashboard/venues');
  }
});
test('protected redirects retain query intent and session-cookie updates without granting access',async()=>{
  const response=()=>({cookies:{values:[],set(...args){this.values.push([typeof args[0] === 'string' ? {name:args[0],value:args[1],...args[2]} : args[0]]);},getAll(){return this.values.map(args=>args[0]);}}});
  for(const route of ['/dashboard/events/one?tab=results','/dashboard/venues/one?view=overview','/admin?section=events']){
    const mod=load('lib/supabase/middleware.ts',{'@supabase/ssr':{createServerClient:(_url,_key,options)=>({auth:{getUser:async()=>{options.cookies.setAll([{name:'session',value:'',options:{maxAge:0}}]);return {data:{user:null}};}}})},'next/server':{NextResponse:{next:response,redirect:url=>Object.assign(response(),{url})}}});
    const url=new URL('https://hypeknight.test'+route);url.clone=()=>new URL(url);
    const result=await mod.updateSession({nextUrl:url,cookies:{getAll:()=>[],set(){}}});
    assert.equal(result.url.pathname,'/auth/login');assert.equal(result.url.searchParams.get('next'),route);assert.equal(result.cookies.values[0][0].name,'session');
  }
});

const Link=({href,children,...props})=>React.createElement('a',{href,...props},children);
test('forms associate labels, required fields, autocomplete, feedback and safe cross-flow links',async()=>{
  for(const [file,heading]of [['login','Welcome back'],['sign-up','Create your account']]){
    const Page=load('app/auth/'+file+'/page.tsx',{'next/link':{default:Link},'@/app/auth/actions':{login(){},signup(){}},'@/components/auth/AuthFeedback':{default:()=>React.createElement('p',{id:'auth-feedback',role:'alert'},'Safe message')},'@/components/auth/AuthSubmit':{default:({children})=>React.createElement('button',{type:'submit'},children)}}).default;
    const html=render(await Page({searchParams:Promise.resolve({next:'/events/native-event',error:'private provider details'})}));
    assert.match(html,new RegExp(heading));assert.match(html,/aria-describedby="auth-feedback"/);assert.doesNotMatch(html,/private provider/);
    for(const name of file==='login'?['email','password']:['email','password','display_name']){assert.ok(html.includes('for="auth-'+name+'"'));assert.ok(html.includes('id="auth-'+name+'"'));}
    assert.match(html,/required=""/);assert.match(html,/autoComplete=/);assert.match(html,/next=%2Fevents%2Fnative-event/);
  }
});
test('header uses fresh server identity across login, logout, reload and history renders without session polling',()=>{
  const hooks={...React,useState:()=>[false,()=>{}],useEffect:()=>{},useRef:()=>({current:null})};
  const Nav=load('components/navigation/HypeKnightNavigation.tsx',{'next/link':{default:Link},'next/navigation':{usePathname:()=>'/events/native-event',useSearchParams:()=>new URLSearchParams()},react:hooks,'@/app/auth/actions':{signOut(){}}}).default;
  for(const user of [null,{id:'authorized-fixture',email:'private@example.test'},null,{id:'authorized-fixture',email:'private@example.test'}]){
    const html=render(React.createElement(Nav,{initialUser:user,initialRole:user?'admin':null}));
    assert.equal(html.includes('My Night'),Boolean(user));assert.equal(html.includes('Log in'),!user);assert.equal(html.includes('href="/admin"'),Boolean(user));assert.doesNotMatch(html,/private@example/);
  }
  const source=fs.readFileSync('components/navigation/HypeKnightNavigation.tsx','utf8');assert.doesNotMatch(source,/useState.*initialUser|getSession\(|getUser\(/);
});
test('mobile disclosure supports keyboard escape, expanded state and focus return',()=>{
  let closed=false,focused=false;const ref={current:{focus(){focused=true;}}};
  const Nav=load('components/navigation/HypeKnightNavigation.tsx',{'next/link':{default:Link},'next/navigation':{usePathname:()=>'/events',useSearchParams:()=>new URLSearchParams()},react:{...React,useState:()=>[true,value=>{closed=value===false;}],useEffect:()=>{},useRef:()=>ref},'@/app/auth/actions':{signOut(){}}}).default;
  const tree=Nav({initialUser:null,initialRole:null});const header=tree.props.children[0];header.props.onKeyDown({key:'Escape'});assert.ok(closed&&focused);
  const html=render(tree);assert.match(html,/aria-expanded="true"/);assert.match(html,/aria-controls="mobile-navigation"/);assert.match(html,/id="mobile-navigation"/);
});
test('header auth links retain discovery queries and existing auth return intent',()=>{
  for(const [pathname,query,expected] of [['/events','q=live+music&city=Kansas+City','/events?q=live+music&city=Kansas+City'],['/auth/login','next=%2Fevents%2Fnative-event','/events/native-event'],['/auth/login','redirect=%2Fdashboard%2Fvenues','/dashboard/venues']]){
    const Nav=load('components/navigation/HypeKnightNavigation.tsx',{'next/link':{default:Link},'next/navigation':{usePathname:()=>pathname,useSearchParams:()=>new URLSearchParams(query)},react:{...React,useState:()=>[false,()=>{}],useEffect:()=>{},useRef:()=>({current:null})},'@/app/auth/actions':{signOut(){}}}).default;
    const html=render(React.createElement(Nav,{initialUser:null,initialRole:null}));assert.ok(html.includes(paths.authHref('sign-up',expected).replaceAll('&','&amp;')));
  }
});
test('non-admin identity never receives administrator navigation',()=>{
  const Nav=load('components/navigation/HypeKnightNavigation.tsx',{'next/link':{default:Link},'next/navigation':{usePathname:()=>'/dashboard',useSearchParams:()=>new URLSearchParams()},react:{...React,useState:()=>[false,()=>{}],useEffect:()=>{},useRef:()=>({current:null})},'@/app/auth/actions':{signOut(){}}}).default;
  const html=render(React.createElement(Nav,{initialUser:{id:'test-only',email:'private@example.test'},initialRole:'user'}));assert.doesNotMatch(html,/href="\/admin"|private@example/);
});
test('validation feedback receives focus and pending submissions announce progress',()=>{
  let focus=0,effect;
  const Feedback=load('components/auth/AuthFeedback.tsx',{react:{...React,useRef:()=>({current:{focus(){focus++;}}}),useEffect:fn=>{effect=fn;}}}).default;
  const node=Feedback({error:'Try again'});effect();assert.equal(focus,1);assert.equal(node.props.role,'alert');assert.equal(node.props.tabIndex,-1);
  const Submit=load('components/auth/AuthSubmit.tsx',{'react-dom':{useFormStatus:()=>({pending:true})}}).default;
  const html=render(React.createElement(Submit,{pendingLabel:'Signing in…'},'Sign in'));assert.match(html,/disabled=""/);assert.match(html,/role="status"/);assert.match(html,/Signing in/);
});
test('event login links use next and comment return intent; native authorization guards are retained',()=>{
  const event=fs.readFileSync('app/events/[slug]/page.tsx','utf8');assert.doesNotMatch(event,/auth\/login\?redirect=/);assert.match(event,/auth\/login\?next=/);
  assert.match(fs.readFileSync('components/events/EventComments.tsx','utf8'),/authHref\('login', eventPath\)/);
  assert.match(fs.readFileSync('app/events/external/[id]/claim/page.tsx','utf8'),/if \(!user\) redirect\(`/);
  assert.match(fs.readFileSync('app/globals.css','utf8'),/button:focus-visible/);
  assert.match(fs.readFileSync('app/layout.tsx','utf8'),/href="#main-content"/);
});
