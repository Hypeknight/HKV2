const fs=require('node:fs');
const ts=require('typescript');
const React=require('react');
function load(file,mocks={}) {
 const out={};
 const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 new Function('exports','require',js)(out,name=>{
  if(Object.hasOwn(mocks,name))return mocks[name];
  if(name.endsWith('.css')||name==='server-only')return {};
  if(name.startsWith('@/')){const base=name.slice(2);const path=[base+'.ts',base+'.tsx',base+'/index.ts'].find(fs.existsSync);if(!path)throw Error('Missing fixture module '+name);return load(path,mocks);}
  return require(name);
 });return out;
}
const Link=({href,children,className})=>React.createElement('a',{href,className},children);
function loadUi(overrides={}) {return load('components/preview/SimplyComplexHome.tsx',{
 'next/link':{default:Link},
 '@/components/analytics/SignalLink':{default:({signal,...props})=>React.createElement('a',{href:props.href,className:props.className,'data-signal':signal.signalType,'data-source':signal.source},props.children)},
 '@/components/analytics/DiscoveryImpression':{default:props=>React.createElement('span',{'data-impression':props.placement,'data-inventory':props.inventorySource,'data-subject':props.subjectId})},
 '@/components/ui/EventTime':{default:({value})=>React.createElement('time',{dateTime:value},value)},
 '@/components/discovery/DiscoverySearchForm':{default:({children,className,surface})=>React.createElement('form',{action:'/events',method:'get',className,'data-search-surface':surface},children)},...overrides
 });}
module.exports={load,loadUi,ui:loadUi(),data:load('lib/discovery/preview-home.ts')};
