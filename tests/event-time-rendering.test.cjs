const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const {renderToStaticMarkup: render} = require('react-dom/server');
const {execFileSync} = require('node:child_process');

function harness(react = require('react'), environment = {}) {
  const cache = {};
  function load(file) {
    if (cache[file]) return cache[file];
    const exports = cache[file] = {};
    const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX}}).outputText;
    new Function('exports', 'require', 'Date', 'setInterval', 'clearInterval', js)(exports, name => {
      if (name === 'react') return react;
      if (name === '@/lib/time/event-time') return load('lib/time/event-time.ts');
      if (name === './useEventClock') return load('components/ui/useEventClock.ts');
      return require(name);
    }, environment.Date || Date, environment.setInterval || setInterval, environment.clearInterval || clearInterval);
    return exports;
  }
  return {load};
}
const {load} = harness();
const time = load('lib/time/event-time.ts');
const parse = time.parseEventTimestamp;
const props = {value: '2026-10-16T19:30:00Z'};

test('end-time consumer shows the factual date without calling the end a start', () => {
  assert.match(fs.readFileSync('app/events/[slug]/page.tsx','utf8'), /value=\{event\.event_end_at\}\s+mode="wall"\s+showStatus=\{false\}/);
  const client = harness({...React, useSyncExternalStore: (_subscribe, get) => get()});
  const html = render(React.createElement(client.load('components/ui/EventTime.tsx').default, {...props, showStatus:false}));
  assert.match(html,/7:30 PM · UTC/);assert.doesNotMatch(html,/Starts in|Started/);
});

test('SSR and initial hydration render agree without reading a clock; start information remains visible', () => {
  const env = {Date: class extends Date {static now() {throw Error('initial render must not read clock');}}};
  const server = harness(React, env);
  const initialClient = harness({...React, useSyncExternalStore: (_subscribe, _get, getServer) => getServer()}, env);
  for (const file of ['EventTime', 'EventStatusBadge']) {
    const values = file === 'EventTime' ? props : {startAt: props.value, endAt:'2026-10-16T21:00:00Z'};
    const html = render(React.createElement(server.load(`components/ui/${file}.tsx`).default, values));
    assert.equal(html, render(React.createElement(initialClient.load(`components/ui/${file}.tsx`).default, values)));
    assert.doesNotMatch(html, /Starts in|Live Now|Ended/);
    if (file === 'EventTime') {assert.match(html, /Oct 16, 2026/);assert.match(html, /7:30 PM/);assert.match(html, /UTC/);assert.match(html, /<time dateTime=/);}
  }
});

test('identical initial HTML across UTC, Chicago and Tokyo, including offset and ambiguous wall inputs', () => {
  const script = `const fs=require('fs'),ts=require('typescript'),React=require('react'),{renderToStaticMarkup:render}=require('react-dom/server');${harness.toString()};const {load}=harness();for(const value of ['2026-10-16T19:30:00Z','2026-11-01T01:30:00-05:00','2026-11-01T01:30:00'])console.log(render(React.createElement(load('components/ui/EventTime.tsx').default,{value})));console.log(render(React.createElement(load('components/ui/EventStatusBadge.tsx').default,{startAt:'2026-10-16T19:30:00Z'})));`;
  const results = ['UTC','America/Chicago','Asia/Tokyo'].map(TZ => execFileSync(process.execPath, ['-e', script], {env:{...process.env,TZ},encoding:'utf8'}));
  assert.equal(results[0],results[1]);assert.equal(results[1],results[2]);
});

test('absolute offset is honored; wall display preserves supplied fields and UTC mode normalizes explicitly', () => {
  const value = parse('2026-10-16T19:30:00-05:00');
  assert.equal(value.instant, Date.parse('2026-10-17T00:30:00Z'));
  assert.match(time.eventTimeLabel(value,'wall'),/7:30 PM · UTC-05:00/);
  assert.match(time.eventTimeLabel(value,'utc'),/Oct 17, 2026, 12:30 AM · UTC/);
  assert.equal(time.relativeEventTime(value,Date.parse('2026-10-16T23:30:00Z'),'wall'),'Starts in 1 hr');
});

test('naive wall times retain meaningful fields without an invented timezone, countdown or live claim', () => {
  for (const input of ['2026-03-08T02:30:00','2026-11-01T01:30:00','2026-10-16 19:30']) {
    const value = parse(input);assert.equal(value.instant,null);
    assert.match(time.eventTimeLabel(value,'wall'),/Timezone unavailable/);
    assert.equal(time.relativeEventTime(value,0,'wall'),null);
    assert.equal(time.eventScheduleBadge(value,null,0),null);
  }
});

test('future, starting, active and ended boundaries are factual, with an exclusive end', () => {
  const start = parse('2026-10-16T20:00:00Z'), end = parse('2026-10-16T21:00:00Z');
  const at = text => Date.parse(`2026-10-16T${text}Z`);
  assert.equal(time.eventScheduleBadge(start,end,at('16:59:59')),null);
  assert.equal(time.eventScheduleBadge(start,end,at('17:00:00')),'Starting Soon');
  assert.equal(time.eventScheduleBadge(start,end,at('19:59:59')),'Starting Soon');
  assert.equal(time.relativeEventTime(start,at('19:59:59'),'utc'),'Starts in 1 min');
  assert.equal(time.eventScheduleBadge(start,end,at('20:00:00')),'Live Now');
  assert.equal(time.relativeEventTime(start,at('20:00:00'),'utc'),'Started');
  assert.equal(time.eventScheduleBadge(start,end,at('20:59:59')),'Live Now');
  assert.equal(time.eventScheduleBadge(start,end,at('21:00:00')),'Ended');
  assert.equal(time.eventScheduleBadge(start,end,at('22:00:00')),'Ended');
});

test('missing/invalid ends do not fabricate a four-hour live window', () => {
  const start = parse('2026-10-16T20:00:00Z');
  assert.equal(time.eventScheduleBadge(start,null,Date.parse('2026-10-16T21:00:00Z')),null);
  for (const end of [parse('2026-10-16T19:00:00Z'),parse('2026-10-16T20:00:00Z'),parse('2026-10-16T22:00:00')]) assert.equal(time.eventScheduleBadge(start,end,Date.parse('2026-10-16T21:00:00Z')),null);
});

test('midnight and calendar-day labels use the supplied fixed offset, not the host timezone', () => {
  const start = parse('2026-10-18T00:30:00-05:00');
  assert.equal(time.relativeEventTime(start,Date.parse('2026-10-17T05:00:00Z'),'wall'),'Tomorrow');
  assert.equal(time.relativeEventTime(start,Date.parse('2026-10-18T05:29:59Z'),'wall'),'Starts in 1 min');
  assert.equal(time.relativeEventTime(start,Date.parse('2026-10-18T05:30:00Z'),'wall'),'Started');
});

test('explicit offsets distinguish DST folds and calculate elapsed time across spring transitions', () => {
  const first = parse('2026-11-01T01:30:00-05:00'), second = parse('2026-11-01T01:30:00-06:00');
  assert.equal(second.instant-first.instant,3600000);
  assert.notEqual(time.eventTimeLabel(first,'wall'),time.eventTimeLabel(second,'wall'));
  assert.equal(parse('2026-03-08T03:30:00-05:00').instant-parse('2026-03-08T01:30:00-06:00').instant,3600000);
});

test('missing, impossible, invalid and unknown-offset timestamps are handled without rollover', () => {
  for(const value of [null,'','garbage','2026-02-30T19:30:00Z','2026-13-01T00:00:00Z','2026-01-01T24:00:00Z','2026-01-01T00:60:00Z','2026-01-01T00:00:60Z','2026-01-01T00:00:00+25:00','2026-01-01T00:00:00-00:00'])assert.equal(parse(value),null,value);
  assert.ok(parse('2028-02-29T00:00:00Z'));
  const Component=load('components/ui/EventTime.tsx').default;
  assert.equal(render(React.createElement(Component,{value:null})),'—');
  assert.equal(render(React.createElement(Component,{value:'bad'})),'Time unavailable');
});

test('shared clock starts only on subscription, updates mounted components, and fully cleans up', () => {
  let phase='initial', now=Date.parse('2026-10-16T19:00:00Z'), ticks=0, interval, started=0, cleared=0;
  const env={Date:class extends Date{static now(){return now;}},setInterval(fn,delay){assert.equal(delay,1000);interval=fn;started++;return 123;},clearInterval(id){assert.equal(id,123);cleared++;}};
  const client=harness({...React,useSyncExternalStore:(_subscribe,get,getServer)=>phase==='initial'?getServer():get()},env);
  const clock=client.load('components/ui/useEventClock.ts');
  const Component=client.load('components/ui/EventTime.tsx').default;
  const Badge=client.load('components/ui/EventStatusBadge.tsx').default;
  const initial=render(React.createElement(Component,props));assert.doesNotMatch(initial,/Starts in/);assert.equal(started,0);
  const stop1=clock.subscribeEventClock(()=>ticks++),stop2=clock.subscribeEventClock(()=>ticks++);
  assert.equal(started,1);
  // Even with a running shared store, hydration must still use its null snapshot.
  assert.equal(render(React.createElement(Component,props)),initial);
  phase='mounted';assert.match(render(React.createElement(Component,props)),/Starts in 30 min/);
  assert.match(render(React.createElement(Badge,{startAt:props.value,endAt:'2026-10-16T20:00:00Z'})),/Starting Soon/);
  now=Date.parse('2026-10-16T19:30:00Z');interval();assert.equal(ticks,2);
  assert.match(render(React.createElement(Component,props)),/Started/);
  assert.match(render(React.createElement(Badge,{startAt:props.value,endAt:'2026-10-16T20:00:00Z'})),/Live Now/);
  now=Date.parse('2026-10-16T20:00:00Z');interval();assert.match(render(React.createElement(Badge,{startAt:props.value,endAt:'2026-10-16T20:00:00Z'})),/Ended/);
  stop1();assert.equal(cleared,0);stop2();assert.equal(cleared,1);
  assert.doesNotMatch(render(React.createElement(Component,props)),/Starts in|Started/);
  const stop3=clock.subscribeEventClock(()=>{});assert.equal(started,2);stop3();assert.equal(cleared,2);
});
