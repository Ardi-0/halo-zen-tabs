const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'../halo-extension/settings.js'),'utf8');
const sandbox={};
vm.runInNewContext(source,sandbox,{filename:'settings.js'});
const settings=sandbox.HaloSettings;

test('stored preferences are normalized without changing saved defaults',()=>{
  const normalized=settings.normalize({spread:9000,blur:-4,fps:Infinity,enabled:'false',
    projection:'unknown',dimMode:'local',blackOpacity:37.5});
  assert.equal(normalized.spread,6000);
  assert.equal(normalized.blur,0);
  assert.equal(normalized.fps,settings.defaults.fps);
  assert.equal(normalized.enabled,true);
  assert.equal(normalized.projection,'edges');
  assert.equal(normalized.dimMode,'local');
  assert.equal(normalized.blackOpacity,37.5);
  assert.equal(settings.defaults.spread,180);
});

test('site profiles remain separate while the shared profile stays available',()=>{
  const data={halo:{spread:210},haloSeparateSites:true,haloYoutube:{spread:320},haloTwitch:{spread:480}};
  assert.equal(settings.resolveStorage(data,'youtube').spread,320);
  assert.equal(settings.resolveStorage(data,'twitch').spread,480);
  data.haloSeparateSites=false;
  assert.equal(settings.resolveStorage(data,'youtube').spread,210);
  assert.equal(settings.resolveStorage(data,'twitch').spread,210);
  data.haloSeparateSites=true;
  assert.equal(settings.resolveStorage(data,'twitch').spread,480);
});
