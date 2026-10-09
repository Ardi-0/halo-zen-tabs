const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const script=fs.readFileSync(path.join(__dirname,'../halo-tabs.uc.js'),'utf8');
const start=script.indexOf('  function frameBridge() {');
const end=script.indexOf('  const frameURI=',start);
assert.ok(start>=0&&end>start,'The content bridge must exist');
const source=script.slice(start,end);
const owner='11111111-2222-3333-4444-555555555555';

function fixture() {
  const attrs=new Map(),listeners=new Map(),events=new Map(),sent=[];
  let observe;
  const root={getAttribute:key=>attrs.get(key)||null,
    setAttribute:(key,value)=>attrs.set(key,value),removeAttribute:key=>attrs.delete(key)};
  const content={
    location:{protocol:'https:',hostname:'www.youtube.com',href:'https://www.youtube.com/watch?v=test'},
    document:{documentElement:root},
    MutationObserver:class{constructor(callback){observe=callback;}observe(){}disconnect(){}},
    setTimeout:()=>1,clearTimeout:()=>{},addEventListener:()=>{}
  };
  content.top=content;
  const sandbox={content,
    addMessageListener:(name,listener)=>listeners.set(name,listener),
    addEventListener:(name,listener)=>events.set(name,listener),
    sendAsyncMessage:(name,data)=>sent.push({name,data})};
  vm.runInNewContext(`(${source})();`,sandbox,{filename:'frameBridge.js'});
  return {attrs,events,sent,
    control:values=>listeners.get('halo-zen:control-v1')({data:{v:1,id:1,owner,enabled:true,side:'left',edge:0,...values}}),
    profile:value=>{attrs.set('data-halo-zen-profile',JSON.stringify(value));observe();}};
}

test('sidebar geometry reaches the extension and survives navigation',()=>{
  const f=fixture();
  f.control({span:[-.3,-.02]});
  const request=()=>JSON.parse(f.attrs.get('data-halo-zen-consumer'));
  assert.deepEqual(request(),{v:1,side:'left',edge:0,span:[-.3,-.02]},
    'Dropping span silently falls back to the old stretched edge strip');
  f.events.get('yt-navigate-finish')();
  assert.deepEqual(request().span,[-.3,-.02]);
  f.control({side:'right',edge:1,span:[1.02,1.3]});
  assert.deepEqual(request(),{v:1,side:'right',edge:1,span:[1.02,1.3]});
  const profile={v:1,seq:1,grid:{columns:6,rows:64}};
  f.profile(profile);
  const packet=f.sent.find(item=>item.data.profile?.seq===1);
  assert.equal(packet.name,'halo-zen:profile-v1');
  assert.deepEqual(JSON.parse(JSON.stringify(packet.data.profile)),profile,
    'The grid must return intact to the chrome renderer');
});

test('legacy geometry remains usable and invalid spans cannot replace a valid request',()=>{
  const f=fixture();
  f.control({});
  const original=f.attrs.get('data-halo-zen-consumer');
  assert.deepEqual(JSON.parse(original),{v:1,side:'left',edge:0});
  for(const span of [[1,0],[-3,0],[0,4],[0,'1'],[0],null]) {
    f.control({span});
    assert.equal(f.attrs.get('data-halo-zen-consumer'),original);
  }
});
