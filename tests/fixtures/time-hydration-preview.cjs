// Local-only, data-free browser verification. Run with NODE_ENV=production node
// tests/fixtures/time-hydration-preview.cjs; never add this fixture to app routes.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const ts = require('typescript');
const React = require('react');
const {renderToString} = require('react-dom/server');
const root = path.resolve(__dirname, '../..');
const source = file => ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const application = {
  '@/lib/time/event-time': source('lib/time/event-time.ts'),
  './useEventClock': source('components/ui/useEventClock.ts'),
  EventTime: source('components/ui/EventTime.tsx'),
  EventStatusBadge: source('components/ui/EventStatusBadge.tsx'),
};
const packageSource = (name,file) => fs.readFileSync(path.join(path.dirname(require.resolve(`${name}/package.json`)),file),'utf8');
const browserModules = {
  ...application,
  react: packageSource('react','cjs/react.production.js'),
  'react/jsx-runtime': packageSource('react','cjs/react-jsx-runtime.production.js'),
  'react-dom': packageSource('react-dom','cjs/react-dom.production.js'),
  'react-dom/client': packageSource('react-dom','cjs/react-dom-client.production.js'),
  scheduler: packageSource('scheduler','cjs/scheduler.production.js'),
};
function load(name, cache={}) {
  if (!(name in application)) return require(name);
  if (cache[name]) return cache[name].exports;
  const module=cache[name]={exports:{}};
  new Function('module','exports','require',application[name])(module,module.exports,child=>load(child,cache));
  return module.exports;
}
function fixture(React, Time, Badge, start, end) {
  return React.createElement('section',null,
    React.createElement('h2',null,'Absolute timestamp'),
    React.createElement(Time,{value:'2026-10-16T19:30:00Z'}),
    React.createElement('h2',null,'Offset-bearing wall display'),
    React.createElement(Time,{value:'2026-11-01T01:30:00-05:00'}),
    React.createElement('h2',null,'Ambiguous wall time: no countdown'),
    React.createElement(Time,{value:'2026-11-01T01:30:00'}),
    React.createElement('h2',null,'Live boundary fixture (local synthetic data only)'),
    React.createElement(Time,{value:start}),
    React.createElement(Badge,{startAt:start,endAt:end}));
}
const escape = value => value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const server=http.createServer((_req,res)=>{
  const start=new Date(Date.now()+15000).toISOString(),end=new Date(Date.now()+25000).toISOString();
  const initial=renderToString(fixture(React,load('EventTime').default,load('EventStatusBadge').default,start,end));
  const modules=Object.entries(browserModules).map(([name,code])=>`${JSON.stringify(name)}:function(module,exports,require){${code}\n}`).join(',');
  const script=`const process={env:{NODE_ENV:'production'}},modules={${modules}},cache={};function require(name){if(cache[name])return cache[name].exports;const module=cache[name]={exports:{}};modules[name](module,module.exports,require);return module.exports;}const React=require('react');const fixture=${fixture.toString()};document.getElementById('zone').textContent='Browser timezone: '+Intl.DateTimeFormat().resolvedOptions().timeZone;require('react-dom/client').hydrateRoot(document.getElementById('root'),fixture(React,require('EventTime').default,require('EventStatusBadge').default,${JSON.stringify(start)},${JSON.stringify(end)}),{onRecoverableError(error){document.getElementById('errors').textContent+=error.message+'\\n';}});`;
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
  res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>UX-B2I local hydration fixture</title><body><h1>UX-B2I local hydration fixture</h1><p>Server timezone: ${escape(Intl.DateTimeFormat().resolvedOptions().timeZone)}</p><p id="zone"></p><h2>Recoverable hydration errors</h2><pre id="errors"></pre><div id="root">${initial}</div><details><summary>Server-rendered initial markup</summary><pre>${escape(initial)}</pre></details><script>${script.replaceAll('</script','<\\/script')}</script></body></html>`);
});
server.listen(3199,'0.0.0.0',()=>console.log('Local hydration fixture listening on http://localhost:3199'));
