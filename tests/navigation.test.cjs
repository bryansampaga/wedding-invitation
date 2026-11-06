const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const script=fs.readFileSync('assets/js/script.js','utf8');
const navigation=script.slice(
  script.indexOf('// Keep wheel, trackpad and touch scrolling fully native.'),
  script.lastIndexOf('loadGuest();')
);

function setup(){
  const listeners={};
  const historyUpdates=[];
  const jumps=[];
  class Element{
    closest(){return null;}
  }
  class Link extends Element{
    constructor(hash){super();this.attributes={href:hash}}
    getAttribute(name){return this.attributes[name]}
    setAttribute(name,value){this.attributes[name]=value}
    removeAttribute(name){delete this.attributes[name]}
    closest(){return this}
  }
  const links=[new Link('#home'),new Link('#theme')];
  const positions={home:{top:0,bottom:800},theme:{top:800,bottom:1600}};
  const sections={
    '#home':{id:'home',getBoundingClientRect:()=>positions.home,scrollIntoView:options=>jumps.push(['home',options])},
    '#theme':{id:'theme',getBoundingClientRect:()=>positions.theme,scrollIntoView:options=>jumps.push(['theme',options])}
  };
  const nav={
    addEventListener:(name,handler)=>listeners[name]=handler,
    getBoundingClientRect:()=>({bottom:48})
  };
  const main={addEventListener:(name,handler)=>listeners['main-'+name]=handler};
  const context=vm.createContext({
    document:{
      querySelector:selector=>selector==='.nav'?nav:selector==='main'?main:sections[selector]||null,
      querySelectorAll:selector=>selector==='.nav a[href^="#"]'?links:[]
    },
    window:{
      addEventListener:(name,handler)=>listeners[name]=handler,
      innerHeight:800,
      visualViewport:{offsetTop:0,height:800,addEventListener:(name,handler)=>listeners['viewport-'+name]=handler}
    },
    history:{replaceState:(state,title,url)=>historyUpdates.push(url)},
    Element,
    requestAnimationFrame:callback=>{callback();return 1},
    cancelAnimationFrame:()=>{}
  });
  vm.runInContext(navigation,context);
  return {listeners,links,jumps,historyUpdates,positions};
}

test('top navigation aligns the selected tab without scroll animation',()=>{
  const {listeners,links,jumps,historyUpdates}=setup();
  let prevented=false;
  listeners.click({target:links[1],preventDefault(){prevented=true}});
  assert.equal(prevented,true);
  assert.equal(jumps.length,1);
  assert.equal(jumps[0][0],'theme');
  assert.equal(jumps[0][1].behavior,'auto');
  assert.equal(jumps[0][1].block,'start');
  assert.deepEqual(historyUpdates,['#theme']);
  assert.equal(links[1].attributes['aria-current'],'page');
});

test('wheel and touch input are never intercepted',()=>{
  const {listeners}=setup();
  assert.equal(listeners.wheel,undefined);
  assert.equal(listeners.touchstart,undefined);
  assert.equal(listeners.touchmove,undefined);
  assert.equal(listeners.touchend,undefined);
});

test('active tab follows the section at the center of the invitation scroller',()=>{
  const {listeners,links,positions}=setup();
  positions.home={top:-800,bottom:0};
  positions.theme={top:0,bottom:800};
  listeners['main-scroll']();
  assert.equal(links[0].attributes['aria-current'],undefined);
  assert.equal(links[1].attributes['aria-current'],'page');
});
