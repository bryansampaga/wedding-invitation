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
  const sections={
    '#home':{id:'home',getBoundingClientRect:()=>({top:0}),scrollIntoView:options=>jumps.push(['home',options])},
    '#theme':{id:'theme',getBoundingClientRect:()=>({top:800}),scrollIntoView:options=>jumps.push(['theme',options])}
  };
  const nav={addEventListener:(name,handler)=>listeners[name]=handler};
  const context=vm.createContext({
    document:{
      querySelector:selector=>selector==='.nav'?nav:sections[selector]||null,
      querySelectorAll:selector=>selector==='.nav a[href^="#"]'?links:[]
    },
    window:{
      addEventListener:(name,handler)=>listeners[name]=handler,
      visualViewport:{offsetTop:0,addEventListener:(name,handler)=>listeners['viewport-'+name]=handler}
    },
    history:{replaceState:(state,title,url)=>historyUpdates.push(url)},
    Element,
    requestAnimationFrame:callback=>{callback();return 1},
    cancelAnimationFrame:()=>{}
  });
  vm.runInContext(navigation,context);
  return {listeners,links,jumps,historyUpdates};
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
