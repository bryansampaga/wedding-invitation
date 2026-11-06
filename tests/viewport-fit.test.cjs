const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const script=fs.readFileSync('assets/js/script.js','utf8');
const fitScaleSource=script.slice(
  script.indexOf('function calculatePhoneFitScale'),
  script.indexOf('function phoneFitSpan')
);
const context=vm.createContext({});
vm.runInContext(fitScaleSource,context);

test('phone tab scale follows the visible browser height',()=>{
  assert.equal(context.calculatePhoneFitScale(640,800,390),.8);
  assert.equal(context.calculatePhoneFitScale(560,800,390),.7);
});

test('phone tab scale also protects narrow screens',()=>{
  assert.equal(context.calculatePhoneFitScale(800,800,312),.8);
});

test('extremely short screens keep a usable minimum scale',()=>{
  assert.equal(context.calculatePhoneFitScale(300,900,390),.52);
});

