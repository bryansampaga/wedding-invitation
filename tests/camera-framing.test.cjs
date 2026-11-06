const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const script=fs.readFileSync('assets/js/script.js','utf8');
const responsive=fs.readFileSync('assets/css/responsive.css','utf8');
const html=fs.readFileSync('index.html','utf8');

test('camera preview uses the full uncropped frame',()=>{
  assert.match(responsive,/#selfie #camera,[\s\S]*?object-fit:contain !important/);
  assert.match(responsive,/#selfie #faceFilterCanvas\{[\s\S]*?object-fit:contain !important/);
});

test('saved selfie draws the complete camera source',()=>{
  assert.match(script,/ctx\.drawImage\(video, 0, 0, sourceWidth, sourceHeight, 0, 0, w, h\)/);
  assert.doesNotMatch(script,/sourceHeight \* stageRatio|sourceWidth \/ stageRatio/);
});

test('camera starts without loading the heavy face filter engine',()=>{
  const startHandler=script.slice(
    script.indexOf('$("startBtn").addEventListener'),
    script.indexOf('document.querySelectorAll(".filter")')
  );
  assert.match(script,/let currentFaceEffect = "none"/);
  assert.doesNotMatch(startHandler,/startFaceTracking\(/);
  assert.match(script,/timestamp-lastFaceTrackingTimestamp<66/);
});

test('portrait camera is primary and controls begin hidden underneath',()=>{
  assert.match(responsive,/Portrait-first booth:[\s\S]*?aspect-ratio:3 \/ 4 !important/);
  assert.match(responsive,/#selfie \.filter-card\{[\s\S]*?grid-row:2 !important/);
  assert.match(html,/id="faceFilterCanvas"[^>]*hidden/);
  assert.match(html,/class="filter-card" hidden/);
  assert.match(html,/face-filter-none active/);
});

