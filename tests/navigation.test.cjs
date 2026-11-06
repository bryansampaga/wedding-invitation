const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const script=fs.readFileSync('assets/js/script.js','utf8');
const navigation=script.slice(script.indexOf('// Move exactly one main invitation tab'),script.lastIndexOf('loadGuest();'));

function setup(rects,{coarsePointer=false}={}){
  const events={};
  const jumps=[];
  class Element{}
  const sections=rects.map((rect,i)=>({getBoundingClientRect:()=>rect,scrollIntoView:()=>jumps.push(i)}));
  const context=vm.createContext({
    document:{querySelectorAll:()=>sections,documentElement:{classList:{contains:()=>false}},body:{}},
    window:{addEventListener:(name,handler)=>events[name]=handler,setTimeout:()=>1},
    innerHeight:800,Element,setTimeout:()=>1,clearTimeout:()=>{},
    matchMedia:query=>({matches:query.includes('pointer: coarse')?coarsePointer:true}),
    getComputedStyle:()=>({overflowY:'visible'})
  });
  vm.runInContext(navigation,context);
  const run=code=>vm.runInContext(code,context);
  const wheel=(deltaY)=>events.wheel({deltaY,deltaX:0,deltaMode:0,ctrlKey:false,target:new Element(),preventDefault(){}});
  return {events,jumps,run,wheel,Element};
}

test('a tall page stays active until its top has passed; content remains readable',()=>{
  const {run}=setup([{top:-200,bottom:1000},{top:1000,bottom:1800}]);
  assert.equal(run('activeInvitationSectionIndex()'),0);
  assert.equal(run('canScrollPageContent(1)'),true);
  assert.equal(run('canScrollPageContent(-1)'),true);
});

test('the private gallery becomes active within the containing selfie section',()=>{
  const {run}=setup([{top:-1000,bottom:800},{top:0,bottom:800}]);
  assert.equal(run('activeInvitationSectionIndex()'),1);
  assert.equal(run('canScrollPageContent(1)'),false);
});

test('small wheel deltas accumulate but momentum cannot trigger a second jump',()=>{
  const {run,wheel,jumps}=setup([{top:0,bottom:800},{top:800,bottom:1600},{top:1600,bottom:2400}]);
  wheel(10);wheel(10);wheel(10);
  assert.equal(jumps.length,0);
  wheel(10);
  assert.deepEqual(jumps,[1]);
  run('sectionScrollLocked=false');
  wheel(100);
  assert.deepEqual(jumps,[1]);
});

test('wheel input on a tall page does not skip its remaining content',()=>{
  const {wheel,jumps}=setup([{top:0,bottom:1200},{top:1200,bottom:2000}]);
  wheel(120);
  assert.deepEqual(jumps,[]);
});

test('a swipe reading a tall page does not become a tab jump mid-gesture',()=>{
  const rect={top:0,bottom:1200};
  const {events,jumps,Element}=setup([rect,{top:1200,bottom:2000}]);
  events.touchstart({touches:[{clientX:50,clientY:500}],target:new Element()});
  events.touchmove({touches:[{clientX:50,clientY:400}],preventDefault(){}});
  rect.top=-400;rect.bottom=800;
  events.touchmove({touches:[{clientX:50,clientY:300}],preventDefault(){}});
  events.touchend();
  assert.deepEqual(jumps,[]);
});

test('a cancelled swipe cannot navigate on a later touchend',()=>{
  const {events,jumps,Element}=setup([{top:0,bottom:800},{top:800,bottom:1600}]);
  events.touchstart({touches:[{clientX:50,clientY:500}],target:new Element()});
  events.touchmove({touches:[{clientX:50,clientY:400}],preventDefault(){}});
  events.touchcancel();events.touchend();
  assert.deepEqual(jumps,[]);
});

test('phone swipes stay native when browser chrome changes the viewport',()=>{
  const {events,jumps,Element}=setup([{top:0,bottom:800},{top:800,bottom:1600}],{coarsePointer:true});
  let prevented=false;
  events.touchstart({touches:[{clientX:50,clientY:500}],target:new Element()});
  events.touchmove({touches:[{clientX:50,clientY:350}],preventDefault(){prevented=true}});
  events.touchend();
  assert.equal(prevented,false);
  assert.deepEqual(jumps,[]);
});

test('visible browser height determines when the page has been fully read',()=>{
  const {run}=setup([{top:0,bottom:800},{top:800,bottom:1600}]);
  run('window.visualViewport={height:700,offsetTop:0,scale:1}');
  assert.equal(run('canScrollPageContent(1)'),true);
  run('window.visualViewport.height=800');
  assert.equal(run('canScrollPageContent(1)'),false);
});

test('pinch-zoom leaves wheel navigation to the browser',()=>{
  const {run,wheel,jumps}=setup([{top:0,bottom:800},{top:800,bottom:1600}]);
  run('window.visualViewport={height:400,offsetTop:0,scale:2}');
  wheel(120);
  assert.deepEqual(jumps,[]);
});
