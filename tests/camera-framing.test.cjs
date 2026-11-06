const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const script=fs.readFileSync('assets/js/script.js','utf8');
const responsive=fs.readFileSync('assets/css/responsive.css','utf8');

test('camera preview uses the full uncropped frame',()=>{
  assert.match(responsive,/#selfie #camera,[\s\S]*?object-fit:contain !important/);
  assert.match(responsive,/#selfie #faceFilterCanvas\{[\s\S]*?object-fit:contain !important/);
});

test('saved selfie draws the complete camera source',()=>{
  assert.match(script,/ctx\.drawImage\(video, 0, 0, sourceWidth, sourceHeight, 0, 0, w, h\)/);
  assert.doesNotMatch(script,/sourceHeight \* stageRatio|sourceWidth \/ stageRatio/);
});

