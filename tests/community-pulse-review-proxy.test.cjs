const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {load}=require('./helpers/homepage-render.cjs');
const {isCsrfOriginAllowed}=require('next/dist/server/app-render/csrf-protection');
const fixture={NODE_ENV:'development',HYPEKNIGHT_COMMUNITY_PULSE_LOCAL_REVIEW:'1',CODESPACE_NAME:'review-space',NEXT_PUBLIC_SITE_URL:'https://review-space-3234.app.github.dev',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:55471'};
function config(env){return new Function('process',fs.readFileSync('next.config.mjs','utf8').replace('export default nextConfig;','return nextConfig;'))({env});}
test('only an explicit local development Codespace gets the exact proxy form origin',()=>{
 const allowed=config(fixture).experimental.serverActions.allowedOrigins;
 assert.deepEqual(allowed,['localhost:3234']);
 assert.equal(isCsrfOriginAllowed('localhost:3234',allowed),true);
 for(const origin of ['evil.test','localhost:3235','localhost:3234.evil.test','other.app.github.dev'])assert.equal(isCsrfOriginAllowed(origin,allowed),false);
 for(const change of [{NODE_ENV:'production'},{HYPEKNIGHT_COMMUNITY_PULSE_LOCAL_REVIEW:''},{NEXT_PUBLIC_SUPABASE_URL:'https://production.supabase.co'},{NEXT_PUBLIC_SITE_URL:'https://hypeknight.fun'},{CODESPACE_NAME:''},{CODESPACE_NAME:'*'}])assert.equal(config({...fixture,...change}).experimental.serverActions.allowedOrigins,undefined);
});
test('Pulse JSON proxy exception requires local backend, exact tunnel, explicit opt-in and same-origin browser evidence',()=>{
 const keys=Object.keys(fixture),old=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 const http=load('lib/community-pulse/http.ts');
 const request=headers=>new Request('http://localhost:3234/api/community-pulse',{method:'POST',headers:{origin:'http://localhost:3234','x-forwarded-host':'review-space-3234.app.github.dev','sec-fetch-site':'same-origin','content-type':'application/json',...headers},body:'{}'});
 try{
 Object.assign(process.env,fixture);assert.equal(http.sameOriginJson(request()),true);
 for(const headers of [{origin:'https://evil.test'},{'x-forwarded-host':'other.app.github.dev'},{'sec-fetch-site':'cross-site'},{'sec-fetch-site':''},{'content-type':'text/plain'}])assert.equal(http.sameOriginJson(request(headers)),false);
 for(const change of [{NODE_ENV:'production'},{HYPEKNIGHT_COMMUNITY_PULSE_LOCAL_REVIEW:''},{NEXT_PUBLIC_SUPABASE_URL:'https://production.supabase.co'},{NEXT_PUBLIC_SITE_URL:'https://hypeknight.fun'},{CODESPACE_NAME:''}]){Object.assign(process.env,fixture,change);assert.equal(http.sameOriginJson(request()),false);}
 }finally{for(const key of keys){if(old[key]===undefined)delete process.env[key];else process.env[key]=old[key];}}
});
