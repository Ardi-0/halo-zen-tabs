// ==UserScript==
// @name           Halo Tabs pour Zen
// @description    Optional transparent light layer behind Zen's native tabs
// @version        0.1.2
// @include        chrome://browser/content/browser.xhtml
// ==/UserScript==
(() => {
  'use strict';
  if (!window.gBrowser) return;
  window.HaloZenTabs?.destroy();
  const messageName = 'halo-zen:profile-v1', controlName = 'halo-zen:control-v1';
  const owner = window.crypto.randomUUID();
  const enabledPref = 'uc.halo-zen-tabs.enabled';
  const html = 'http://www.w3.org/1999/xhtml';
  const styles = `
    [data-halo-zen-layer] { isolation:isolate!important; }
    #halo-zen-tabs-layer { position:absolute!important;pointer-events:none!important;z-index:-1!important;
      display:block!important;margin:0!important;padding:0!important;border:0!important;
      opacity:0;transition:opacity 180ms ease-out; }
    #tabbrowser-tabpanels .browserSidebarContainer[data-halo-zen-clear-shadow] {
      box-shadow:none!important;
    }
    @media (prefers-reduced-motion:reduce) { #halo-zen-tabs-layer { transition:none; } }
  `;
  const services = typeof Services !== 'undefined' ? Services :
    ChromeUtils.importESModule('resource://gre/modules/Services.sys.mjs').Services;
  let current = null, serial = 0, lastProfile = null, layer = null, pane = null, paneMarker = null;
  let shadowTarget = null, shadowMarker = null;
  let redrawId = 0, fadeTimer = 0, destroyed = false, lastGeometry = '', lastError = '';
  const transports = new Map(), abort = new AbortController();
  const styleNode = document.createElementNS(html,'style');
  styleNode.id = 'halo-zen-tabs-style'; styleNode.textContent = styles;
  document.documentElement.append(styleNode);
  const lightStrip = document.createElementNS(html,'canvas');
  const darkStrip = document.createElementNS(html,'canvas');
  const prefsObserver = {observe:()=>selectBrowser()};
  function eligible(browser) {
    try {
      const uri = new URL(browser.currentURI.spec);
      return uri.protocol === 'https:' && (uri.hostname === 'www.youtube.com' && uri.pathname === '/watch' || uri.hostname === 'www.twitch.tv');
    } catch { return false; }
  }
  function enabled() { return services.prefs.getBoolPref(enabledPref,true); }
  function sidebar() {
    let target = null;
    for (let node=document.getElementById('tabbrowser-tabs');node && node !== document.documentElement;node=node.parentElement) {
      const box = node.getBoundingClientRect(), s = getComputedStyle(node);
      if (box.width >= 20 && box.width < innerWidth*.45 && box.height > innerHeight*.5 &&
          s.visibility !== 'hidden' && s.display !== 'none') target = node;
    }
    return target;
  }
  function clearShadowTarget() {
    if (!shadowTarget) return;
    if (shadowMarker === null) shadowTarget.removeAttribute('data-halo-zen-clear-shadow');
    else shadowTarget.setAttribute('data-halo-zen-clear-shadow',shadowMarker);
    shadowTarget = null; shadowMarker = null;
  }
  function syncShadowTarget() {
    const browser = current?.browser;
    const target = browser?.closest?.('.browserSidebarContainer') ||
      [...document.querySelectorAll('#tabbrowser-tabpanels .browserSidebarContainer')]
        .find(container=>container.contains(browser));
    if (target === shadowTarget) return;
    clearShadowTarget();
    if (!target) return;
    shadowTarget = target;
    shadowMarker = target.getAttribute('data-halo-zen-clear-shadow');
    target.setAttribute('data-halo-zen-clear-shadow','');
  }
  function removeLayer() {
    if (fadeTimer) clearTimeout(fadeTimer);
    fadeTimer = 0;
    resize.disconnect();
    layer?.remove(); layer = null;
    if (pane) {
      if (paneMarker === null) pane.removeAttribute('data-halo-zen-layer');
      else pane.setAttribute('data-halo-zen-layer',paneMarker);
    }
    pane = null; paneMarker = null;
    clearShadowTarget();
  }
  function hide(immediate=false) {
    lastProfile = null;
    clearShadowTarget();
    if (!layer) return;
    layer.style.opacity = '0';
    if (fadeTimer) clearTimeout(fadeTimer);
    if (immediate) removeLayer();
    else fadeTimer = setTimeout(removeLayer,190);
  }
  function geometry() {
    const target = sidebar(), browser = current?.browser;
    if (!target || !browser?.isConnected || window.fullScreen || document.fullscreenElement) return null;
    const box = target.getBoundingClientRect(), page = browser.getBoundingClientRect();
    if (!page.width || !page.height) return null;
    const side = box.left+box.width/2 < page.left+page.width/2 ? 'left' : 'right';
    const edge = Math.max(0,Math.min(1,((side === 'left' ? box.right : box.left)-page.left)/page.width));
    return {target,box,page,side,edge};
  }
  function queueDraw() { if (!redrawId) redrawId=requestAnimationFrame(()=>{redrawId=0;refreshGeometry();paint();}); }
  const resize = new ResizeObserver(queueDraw);
  function refreshGeometry() {
    if (!current || !enabled()) return;
    const g = geometry();
    if (!g) { hide(); return; }
    const key = JSON.stringify([g.side,g.edge,g.box.x,g.box.y,g.box.width,g.box.height,g.page.x,g.page.y,g.page.width,g.page.height]);
    if (key !== lastGeometry) {
      lastGeometry = key;
      current.manager.sendAsyncMessage(controlName,{v:1,enabled:true,owner,id:current.id,side:g.side,edge:g.edge});
    }
  }
  function valid(data) {
    const p = data?.profile, n = p?.dim?.length;
    return p?.v === 1 && Number.isInteger(p.seq) && p.seq >= 0 && ['left','right'].includes(p.side) &&
      Number.isInteger(n) && n >= 2 && n <= 256 && Array.isArray(p.rgba) && p.rgba.length === n*4 &&
      [...p.rgba,...p.dim].every(v=>Number.isInteger(v)&&v>=0&&v<=255) &&
      Number.isFinite(p.height) && p.height>=1 && p.height<=32768 &&
      Number.isFinite(p.y0) && p.y0>=-4096 && p.y0<=0 &&
      Number.isFinite(p.step) && p.step>0 && p.step<=32768 &&
      Number.isFinite(p.strength) && p.strength>=0 && p.strength<=100 &&
      Number.isFinite(p.fade) && p.fade>=0 && p.fade<=100;
  }
  function paint() {
    const packet = lastProfile, g = geometry();
    if (!packet || !g || packet.profile.side !== g.side) return;
    if (fadeTimer) {clearTimeout(fadeTimer);fadeTimer=0;}
    if (pane !== g.target || !layer) {
      removeLayer(); pane = g.target; paneMarker=pane.getAttribute('data-halo-zen-layer');
      pane.setAttribute('data-halo-zen-layer','');
      layer=document.createElementNS(html,'canvas');layer.id='halo-zen-tabs-layer';
      layer.setAttribute('aria-hidden','true');pane.prepend(layer);
      resize.observe(pane);resize.observe(current.browser);
    }
    syncShadowTarget();
    const parent = layer.offsetParent?.getBoundingClientRect() || {left:0,top:0};
    Object.assign(layer.style,{left:`${g.box.left-parent.left}px`,top:`${g.box.top-parent.top}px`,
      width:`${g.box.width}px`,height:`${g.box.height}px`,opacity:'1'});
    const w=Math.max(1,Math.min(512,Math.round(g.box.width*devicePixelRatio)));
    const h=Math.max(1,Math.min(2048,Math.round(g.box.height*devicePixelRatio)));
    layer.width=w;layer.height=h;
    const p=packet.profile,n=p.dim.length,ctx=layer.getContext('2d');
    lightStrip.width=darkStrip.width=1;lightStrip.height=darkStrip.height=n;
    const lc=lightStrip.getContext('2d'),dc=darkStrip.getContext('2d');
    const light=lc.createImageData(1,n),dark=dc.createImageData(1,n);
    light.data.set(p.rgba);
    for(let i=0;i<n;i++)dark.data[i*4+3]=p.dim[i];
    lc.putImageData(light,0,0);dc.putImageData(dark,0,0);
    const sy=h/g.box.height, zoom=g.page.height/p.height;
    const y=(g.page.top-g.box.top+(p.y0-p.step/2)*zoom)*sy, height=n*p.step*zoom*sy;
    ctx.drawImage(darkStrip,0,y,w,height);ctx.drawImage(lightStrip,0,y,w,height);
    ctx.globalCompositeOperation='destination-in';
    const fade=ctx.createLinearGradient(0,0,w,0),near=p.strength/100,far=near*(1-p.fade/100);
    fade.addColorStop(0,`rgba(0,0,0,${g.side==='left'?far:near})`);
    fade.addColorStop(1,`rgba(0,0,0,${g.side==='left'?near:far})`);
    ctx.fillStyle=fade;ctx.fillRect(0,0,w,h);
    ctx.globalCompositeOperation='source-over';
  }
  // Original frame bridge. It reads only Halo's bounded numerical profile.
  // Page-provided strings are never executed or injected as CSS/URLs.
  function frameBridge() {
    if(content!==content.top)return;
    const control='halo-zen:control-v1',message='halo-zen:profile-v1';
    const scope=globalThis;
    if(scope.__haloZenFrameV1)return;
    scope.__haloZenFrameV1=true;
    let state=null,doc=null,observer=null,previous='',hidden=false;
    function allowed() {
      try{return content===content.top && content.location.protocol==='https:' &&
        ['www.youtube.com','www.twitch.tv'].includes(content.location.hostname);}catch{return false;}
    }
    function send(profile=null) {
      if(!state)return;
      sendAsyncMessage(message,{owner:state.owner,id:state.id,uri:content.location.href,profile});
    }
    function sample() {
      if(!state||!state.enabled||!doc||hidden)return;
      const value=doc.documentElement?.getAttribute('data-halo-zen-profile')||'';
      if(value===previous)return;
      previous=value;
      if(!value){send();return;}
      if(value.length>20000){send();return;}
      try{send(JSON.parse(value));}catch{send();}
    }
    function detach() {
      observer?.disconnect();observer=null;
      doc?.documentElement?.removeAttribute('data-halo-zen-consumer');
      doc=null;previous='';
    }
    function attach() {
      if(!state?.enabled||!allowed()){detach();send();return;}
      const next=content.document;
      if(!next?.documentElement)return;
      if(doc!==next){detach();doc=next;}
      observer?.disconnect();
      observer=new content.MutationObserver(sample);
      observer.observe(doc.documentElement,{attributes:true,attributeFilter:['data-halo-zen-profile']});
      doc.documentElement.setAttribute('data-halo-zen-consumer',JSON.stringify({v:1,side:state.side,edge:state.edge}));
      previous='';sample();
    }
    addMessageListener(control,data=>{
      const value=data.data;
      if(value?.v!==1||!Number.isInteger(value.id)||typeof value.owner!=='string'||value.owner.length!==36)return;
      if(!value.enabled){if(state?.owner!==value.owner||state?.id!==value.id)return;detach();state=null;return;}
      if(!['left','right'].includes(value.side)||!Number.isFinite(value.edge)||value.edge<0||value.edge>1)return;
      state=value;hidden=false;attach();
    });
    addEventListener('DOMContentLoaded',()=>attach(),true);
    addEventListener('pageshow',()=>{hidden=false;attach();},true);
    addEventListener('pagehide',()=>{hidden=true;send();detach();},true);
  }
  const frameURI='data:application/javascript;charset=utf-8,'+encodeURIComponent(`(${frameBridge.toString()})();`);
  function selectBrowser() {
    if(destroyed)return;
    if(current){try{current.manager.sendAsyncMessage(controlName,{v:1,owner,id:current.id,enabled:false});}catch{}}
    current=null;lastGeometry='';hide(!enabled());
    const browser=gBrowser.selectedBrowser;
    if(!enabled()||!eligible(browser))return;
    const manager=browser.messageManager||browser.frameLoader?.messageManager;
    if(!manager?.loadFrameScript||!manager?.addMessageListener){lastError='Pont de contenu indisponible dans cette version de Zen';return;}
    const old=transports.get(browser);
    if(old&&old.manager!==manager){try{old.manager.removeMessageListener(messageName,old.listener);}catch{}transports.delete(browser);}
    if(!transports.has(browser)) {
      const listener={receiveMessage(data){
        if(!current||current.browser!==browser||data.data?.owner!==owner||data.data?.id!==current.id||!eligible(browser)||
          data.data.uri!==browser.currentURI.spec)return;
        if(!valid(data.data)){hide();return;}
        if(lastProfile && data.data.profile.seq < lastProfile.profile.seq)return;
        lastProfile=data.data;queueDraw();
      }};
      manager.addMessageListener(messageName,listener);transports.set(browser,{manager,listener});
    }
    current={browser,manager,id:++serial};
    try{manager.loadFrameScript(frameURI,false);refreshGeometry();}
    catch(error){lastError=error.message;hide(true);}
  }
  const progress={onLocationChange(browser,webProgress){if(browser===gBrowser.selectedBrowser&&webProgress?.isTopLevel!==false)selectBrowser();}};
  function destroy() {
    if(destroyed)return;
    destroyed=true;
    if(current){try{current.manager.sendAsyncMessage(controlName,{v:1,owner,id:current.id,enabled:false});}catch{}}
    for(const {manager,listener} of transports.values()){try{manager.removeMessageListener(messageName,listener);}catch{}}
    transports.clear();abort.abort();removeLayer();styleNode.remove();
    if(redrawId)cancelAnimationFrame(redrawId);
    gBrowser.removeTabsProgressListener?.(progress);
    services.prefs.removeObserver(enabledPref,prefsObserver);
    delete window.HaloZenTabs;
  }
  window.HaloZenTabs=Object.freeze({destroy,refresh:selectBrowser,
    status:()=>({connected:!!current,visible:!!layer&&layer.style.opacity==='1',shadowCleared:!!shadowTarget,
      error:lastError,version:'0.1.2'})});
  gBrowser.tabContainer.addEventListener('TabSelect',selectBrowser,{signal:abort.signal});
  gBrowser.tabContainer.addEventListener('TabClose',event=>{
    const browser=event.target.linkedBrowser,entry=transports.get(browser);
    if(current?.browser===browser){try{current.manager.sendAsyncMessage(controlName,{v:1,owner,id:current.id,enabled:false});}catch{}current=null;hide();}
    if(entry){try{entry.manager.removeMessageListener(messageName,entry.listener);}catch{}transports.delete(browser);}
  },{signal:abort.signal});
  gBrowser.addTabsProgressListener?.(progress);
  services.prefs.addObserver(enabledPref,prefsObserver);
  window.addEventListener('resize',queueDraw,{signal:abort.signal});
  window.addEventListener('fullscreen',queueDraw,{signal:abort.signal});
  window.addEventListener('unload',destroy,{once:true,signal:abort.signal});
  selectBrowser();
})();
