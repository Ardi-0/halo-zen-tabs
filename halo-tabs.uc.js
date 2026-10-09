// ==UserScript==
// @name           Halora Tabs for Zen
// @description    Optional transparent light layer behind Zen's native tabs
// @version        0.1.15
// @include        chrome://browser/content/browser.xhtml
// ==/UserScript==
(() => {
  'use strict';
  if (!window.gBrowser) return;
  window.HaloZenTabs?.destroy();
  const messageName = 'halo-zen:profile-v1', controlName = 'halo-zen:control-v1';
  const ackName = 'halo-zen:ack-v1', scrollName = 'halo-zen:scroll-v1';
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
      border-radius:0!important;
      corner-shape:square!important;
    }
    #halo-zen-edge-top, #halo-zen-edge-bottom, #halo-zen-edge-left, #halo-zen-edge-right {
      position:fixed!important;display:block!important;pointer-events:none!important;
      z-index:2147483000!important;margin:0!important;padding:0!important;border:0!important;
      opacity:1;transition:opacity 180ms ease-out;
    }
    @media (prefers-reduced-motion:reduce) {
      #halo-zen-tabs-layer, [id^="halo-zen-edge-"] { transition:none; }
    }
  `;
  const services = typeof Services !== 'undefined' ? Services :
    ChromeUtils.importESModule('resource://gre/modules/Services.sys.mjs').Services;
  let current = null, serial = 0, lastProfile = null, layer = null, pane = null, paneMarker = null;
  let shadowTarget = null, shadowMarker = null;
  const edgeLayers = new Map(), edgeSamples = new Map();
  let redrawId = 0, fadeTimer = 0, destroyed = false, lastGeometry = '', lastError = '';
  let latestScrollY = 0, latestScrollAt = -1;
  let paintedSeq = -1, paintedGeometry = '';
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
    for (const canvas of edgeLayers.values()) canvas.remove();
    edgeLayers.clear();
    if (pane) {
      if (paneMarker === null) pane.removeAttribute('data-halo-zen-layer');
      else pane.setAttribute('data-halo-zen-layer',paneMarker);
    }
    pane = null; paneMarker = null;
    paintedSeq = -1; paintedGeometry = '';
    clearShadowTarget();
  }
  function hide(immediate=false) {
    lastProfile = null;
    clearShadowTarget();
    if (!layer) return;
    layer.style.opacity = '0';
    for (const canvas of edgeLayers.values()) canvas.style.opacity = '0';
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
  function queueDraw() { if (!redrawId) redrawId=requestAnimationFrame(()=>{
    redrawId=0;const g=geometry();refreshGeometry(false,g);paint(g);
  }); }
  const resize = new ResizeObserver(queueDraw);
  function refreshGeometry(force=false,g=geometry()) {
    if (!current || !enabled()) return;
    if (!g) { hide(); return; }
    const key = JSON.stringify([g.side,g.edge,g.box.x,g.box.y,g.box.width,g.box.height,g.page.x,g.page.y,g.page.width,g.page.height]);
    if (force || key !== lastGeometry) {
      lastGeometry = key;
      const span=[(g.box.left-g.page.left)/g.page.width,(g.box.right-g.page.left)/g.page.width];
      current.manager.sendAsyncMessage(controlName,{v:1,enabled:true,owner,id:current.id,
        side:g.side,edge:g.edge,span});
    }
  }
  function valid(data) {
    const p = data?.profile, n = p?.dim?.length;
    const grid=p?.grid;
    const validGrid=!grid || Number.isInteger(grid.columns) && grid.columns>=2 && grid.columns<=16 &&
      Number.isInteger(grid.rows) && grid.rows>=2 && grid.rows<=128 &&
      Number.isFinite(grid.width) && grid.width>=1 && grid.width<=32768 &&
      Number.isFinite(grid.height) && grid.height>=1 && grid.height<=32768 &&
      Number.isFinite(grid.x0) && grid.x0>=-65536 && grid.x0<=65536 &&
      Number.isFinite(grid.dx) && grid.dx>0 && grid.dx<=32768 &&
      Number.isFinite(grid.y0) && grid.y0>=-4096 && grid.y0<=0 &&
      Number.isFinite(grid.step) && grid.step>0 && grid.step<=32768 &&
      Array.isArray(grid.rgba) && grid.rgba.length===grid.columns*grid.rows*4 &&
      Array.isArray(grid.dim) && grid.dim.length===grid.columns*grid.rows &&
      [...grid.rgba,...grid.dim].every(v=>Number.isInteger(v)&&v>=0&&v<=255);
    const edgeKeys = ['opposite','oppositeDim','top','bottom','topDim','bottomDim'];
    const anyEdge = edgeKeys.some(key=>p?.[key] !== undefined) || p?.across !== undefined;
    const validEdges = !anyEdge || Number.isInteger(p?.across) && p.across>=2 && p.across<=256 &&
      edgeKeys.every(key=>Array.isArray(p[key]) &&
        p[key].length === (key==='opposite' ? n*4 : key==='oppositeDim' ? n :
          ['top','bottom'].includes(key) ? p.across*4 : p.across) &&
        p[key].every(v=>Number.isInteger(v)&&v>=0&&v<=255));
    return p?.v === 1 && Number.isInteger(p.seq) && p.seq >= 0 && ['left','right'].includes(p.side) &&
      (p.scrollY === undefined || Number.isFinite(p.scrollY) && p.scrollY >= 0 && p.scrollY <= 1e8) &&
      (p.at === undefined || Number.isFinite(p.at) && p.at >= 0) &&
      validEdges && validGrid &&
      Number.isInteger(n) && n >= 2 && n <= 256 && Array.isArray(p.rgba) && p.rgba.length === n*4 &&
      [...p.rgba,...p.dim].every(v=>Number.isInteger(v)&&v>=0&&v<=255) &&
      Number.isFinite(p.height) && p.height>=1 && p.height<=32768 &&
      Number.isFinite(p.y0) && p.y0>=-4096 && p.y0<=0 &&
      Number.isFinite(p.step) && p.step>0 && p.step<=32768 &&
      Number.isFinite(p.strength) && p.strength>=0 && p.strength<=100 &&
      Number.isFinite(p.fade) && p.fade>=0 && p.fade<=100;
  }
  function sampleCanvas(name,values,n,vertical,shade=false,refresh=true) {
    let canvas = edgeSamples.get(name);
    if (!canvas) {canvas=document.createElementNS(html,'canvas');edgeSamples.set(name,canvas);}
    const width=vertical?1:n,height=vertical?n:1;
    if (!refresh && canvas.width===width && canvas.height===height) return canvas;
    if(canvas.width!==width)canvas.width=width;
    if(canvas.height!==height)canvas.height=height;
    const ctx=canvas.getContext('2d'),image=ctx.createImageData(canvas.width,canvas.height);
    if (shade) for(let i=0;i<n;i++) image.data[i*4+3]=values[i];
    else image.data.set(values);
    ctx.putImageData(image,0,0);
    return canvas;
  }
  function drawSpatial(ctx,p,g,bounds,refresh) {
    const grid=p.grid;
    if (!grid) return false;
    function image(name,values,shade) {
      let source=edgeSamples.get(name);
      const created=!source;
      if (created) {source=document.createElementNS(html,'canvas');edgeSamples.set(name,source);}
      const resized=source.width!==grid.columns||source.height!==grid.rows;
      if(source.width!==grid.columns)source.width=grid.columns;
      if(source.height!==grid.rows)source.height=grid.rows;
      if(refresh||created||resized) {
        const sourceCtx=source.getContext('2d'),data=sourceCtx.createImageData(grid.columns,grid.rows);
        if(shade)for(let i=0;i<grid.columns*grid.rows;i++)data.data[i*4+3]=values[i];
        else data.data.set(values);
        sourceCtx.putImageData(data,0,0);
      }
      return source;
    }
    const sx=ctx.canvas.width/bounds.width,sy=ctx.canvas.height/bounds.height;
    const zoomX=g.page.width/grid.width,zoomY=g.page.height/grid.height;
    const shift=Number.isFinite(p.scrollY)?latestScrollY-p.scrollY:0;
    const x=(g.page.left-bounds.left+(grid.x0-grid.dx/2)*zoomX)*sx;
    const y=(g.page.top-bounds.top+(grid.y0-grid.step/2-shift)*zoomY)*sy;
    const width=grid.columns*grid.dx*zoomX*sx,height=grid.rows*grid.step*zoomY*sy;
    ctx.drawImage(image('spatial-shade',grid.dim,true),x,y,width,height);
    ctx.drawImage(image('spatial-colour',grid.rgba,false),x,y,width,height);
    return true;
  }
  function paintEdges(p,g,refresh) {
    if (!p.opposite || !p.top || !p.bottom) return;
    const app=document.getElementById('zen-appcontent-wrapper') || document.getElementById('zen-main-app-wrapper');
    if (!app) return;
    const box=app.getBoundingClientRect(),page=g.page;
    const contentLeft=g.side==='left'?Math.max(box.left,g.box.right):box.left;
    const contentRight=g.side==='right'?Math.min(box.right,g.box.left):box.right;
    const separation=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--zen-element-separation'));
    const topHeight=Math.max(0,Math.min(24,Number.isFinite(separation)?separation:0,box.height));
    const leftGap=page.left-contentLeft,rightGap=contentRight-page.right,bottomGap=box.bottom-page.bottom;
    // Zen can reserve more than 64 CSS pixels between the tabs and the web
    // view, especially with custom sidebar layouts. Fill that measured gap.
    const maxSideGap=Math.min(160,Math.max(64,innerWidth*.12));
    const leftWidth=leftGap>0&&leftGap<=maxSideGap?leftGap:0;
    const rightWidth=rightGap>0&&rightGap<=maxSideGap?rightGap:0;
    const bottomHeight=bottomGap>0&&bottomGap<=64?bottomGap:0;
    const main=p.side==='left'?{left:p.rgba,leftDim:p.dim,right:p.opposite,rightDim:p.oppositeDim}:
      {left:p.opposite,leftDim:p.oppositeDim,right:p.rgba,rightDim:p.dim};
    const bands=[
      {name:'top',x:contentLeft,y:box.top,w:contentRight-contentLeft,h:topHeight,vertical:false,rgba:p.top,dim:p.topDim,n:p.across},
      {name:'bottom',x:contentLeft,y:page.bottom,w:contentRight-contentLeft,h:bottomHeight,vertical:false,rgba:p.bottom,dim:p.bottomDim,n:p.across},
      {name:'left',x:contentLeft,y:box.top+topHeight,w:leftWidth,h:Math.max(0,page.bottom-box.top-topHeight),vertical:true,
        rgba:main.left,dim:main.leftDim,n:p.dim.length},
      {name:'right',x:page.right,y:box.top+topHeight,w:rightWidth,h:Math.max(0,page.bottom-box.top-topHeight),vertical:true,
        rgba:main.right,dim:main.rightDim,n:p.dim.length}
    ];
    for (const band of bands) {
      if (!refresh && !band.vertical) continue;
      let target=edgeLayers.get(band.name);
      if (band.w<.5 || band.h<.5) {target?.remove();edgeLayers.delete(band.name);continue;}
      if (!target) {
        target=document.createElementNS(html,'canvas');target.id=`halo-zen-edge-${band.name}`;
        target.setAttribute('aria-hidden','true');
        (document.getElementById('zen-main-app-wrapper')||document.documentElement).append(target);
        edgeLayers.set(band.name,target);
      }
      Object.assign(target.style,{left:`${band.x}px`,top:`${band.y}px`,width:`${band.w}px`,height:`${band.h}px`,opacity:'1'});
      const scale=Math.min(devicePixelRatio,2),w=Math.max(1,Math.ceil(band.w*scale)),h=Math.max(1,Math.ceil(band.h*scale));
      if(target.width!==w)target.width=w;
      if(target.height!==h)target.height=h;
      const ctx=target.getContext('2d');ctx.clearRect(0,0,w,h);
      if (!p.strength) continue;
      if (band.vertical && band.name===g.side &&
          drawSpatial(ctx,p,g,{left:band.x,top:band.y,width:band.w,height:band.h},refresh)) continue;
      const colour=sampleCanvas(`${band.name}-colour`,band.rgba,band.n,band.vertical,false,refresh);
      const shade=sampleCanvas(`${band.name}-shade`,band.dim,band.n,band.vertical,true,refresh);
      if (band.vertical) {
        const sy=h/band.h,zoom=page.height/p.height;
        const shift=Number.isFinite(p.scrollY)?latestScrollY-p.scrollY:0;
        const y=(page.top-band.y+(p.y0-p.step/2-shift)*zoom)*sy,stripHeight=band.n*p.step*zoom*sy;
        ctx.drawImage(shade,0,y,w,stripHeight);
        ctx.drawImage(colour,0,y,w,stripHeight);
      } else {
        const sx=w/band.w,x=(page.left-band.x)*sx,stripWidth=page.width*sx;
        const start=Math.max(0,x),end=Math.min(w,x+stripWidth);
        if (start>0) {ctx.drawImage(shade,0,0,1,1,0,0,start,h);
          ctx.drawImage(colour,0,0,1,1,0,0,start,h);}
        if (end>start) {ctx.drawImage(shade,x,0,stripWidth,h);
          ctx.drawImage(colour,x,0,stripWidth,h);}
        if (end<w) {ctx.drawImage(shade,band.n-1,0,1,1,end,0,w-end,h);
          ctx.drawImage(colour,band.n-1,0,1,1,end,0,w-end,h);}
      }
      ctx.globalAlpha=1;
    }
  }
  function paint(g=geometry()) {
    const packet = lastProfile;
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
    const geometryKey=JSON.stringify([g.box.x,g.box.y,g.box.width,g.box.height,
      g.page.x,g.page.y,g.page.width,g.page.height]);
    const refresh=packet.profile.seq!==paintedSeq||geometryKey!==paintedGeometry;
    if(layer.width!==w)layer.width=w;
    if(layer.height!==h)layer.height=h;
    const p=packet.profile,n=p.dim.length,ctx=layer.getContext('2d');
    ctx.clearRect(0,0,w,h);
    if (!drawSpatial(ctx,p,g,{left:g.box.left,top:g.box.top,width:g.box.width,height:g.box.height},refresh)) {
      if(lightStrip.width!==1)lightStrip.width=1;
      if(darkStrip.width!==1)darkStrip.width=1;
      if(lightStrip.height!==n)lightStrip.height=n;
      if(darkStrip.height!==n)darkStrip.height=n;
      if (refresh) {
        const lc=lightStrip.getContext('2d'),dc=darkStrip.getContext('2d');
        const light=lc.createImageData(1,n),dark=dc.createImageData(1,n);
        light.data.set(p.rgba);
        for(let i=0;i<n;i++)dark.data[i*4+3]=p.dim[i];
        lc.putImageData(light,0,0);dc.putImageData(dark,0,0);
      }
      const sy=h/g.box.height, zoom=g.page.height/p.height;
      const shift=Number.isFinite(p.scrollY)?latestScrollY-p.scrollY:0;
      const y=(g.page.top-g.box.top+(p.y0-p.step/2-shift)*zoom)*sy, height=n*p.step*zoom*sy;
      ctx.drawImage(darkStrip,0,y,w,height);ctx.drawImage(lightStrip,0,y,w,height);
    }
    ctx.globalCompositeOperation='destination-in';
    // Keep the page-side edge exact. The intensity setting still shapes most
    // of the sidebar; a smooth correction reaches full strength at the join.
    const fade=ctx.createLinearGradient(0,0,w,0),strength=p.strength/100,falloff=p.fade/100;
    for (const t of [0,.25,.5,.75,.9,1]) {
      const towardPage=g.side==='left'?t:1-t;
      const opacity=strength*(1-falloff*(1-towardPage))+
        (strength>0?1-strength:0)*towardPage**4;
      fade.addColorStop(t,`rgba(0,0,0,${opacity})`);
    }
    ctx.fillStyle=fade;ctx.fillRect(0,0,w,h);
    ctx.globalCompositeOperation='source-over';
    paintEdges(p,g,refresh);
    paintedSeq=p.seq;paintedGeometry=geometryKey;
  }
  // Original frame bridge. It reads only Halo's bounded numerical profile.
  // Page-provided strings are never executed or injected as CSS/URLs.
  function frameBridge() {
    if(content!==content.top)return;
    const control='halo-zen:control-v1',message='halo-zen:profile-v1';
    const ack='halo-zen:ack-v1',scroll='halo-zen:scroll-v1';
    const scope=globalThis;
    if(scope.__haloZenFrameV1)return;
    scope.__haloZenFrameV1=true;
    let state=null,doc=null,observer=null,previous='',hidden=false;
    let awaiting=0,pending=null,watchdog=0,scrollFrame=0,lastScrollY=-1;
    function allowed() {
      try{return content===content.top && content.location.protocol==='https:' &&
        ['www.youtube.com','www.twitch.tv'].includes(content.location.hostname);}catch{return false;}
    }
    function flush() {
      if(!state||awaiting||!pending)return;
      const next=pending;pending=null;awaiting=next.profile.seq;
      content.clearTimeout(watchdog);
      // A lost acknowledgement must not freeze the sidebar forever. While
      // playing, a newer pending frame replaces this one after the timeout.
      watchdog=content.setTimeout(()=>{watchdog=0;awaiting=0;flush();},250);
      try{sendAsyncMessage(message,next);}
      catch{content.clearTimeout(watchdog);watchdog=0;awaiting=0;pending||=next;}
    }
    function send(profile=null) {
      if(!state)return;
      if(!profile){
        pending=null;awaiting=0;content.clearTimeout(watchdog);watchdog=0;
        try{sendAsyncMessage(message,{owner:state.owner,id:state.id,uri:content.location.href,profile:null});}catch{}
        return;
      }
      // Only one profile is in flight; intermediate video frames are replaced
      // by the newest one instead of forming an ever-growing IPC queue.
      pending={owner:state.owner,id:state.id,uri:content.location.href,profile};
      flush();
    }
    function sample() {
      if(!state||!state.enabled||!doc||hidden)return;
      const value=doc.documentElement?.getAttribute('data-halo-zen-profile')||'';
      if(value===previous)return;
      previous=value;
      if(!value){send();return;}
      if(value.length>32000){send();return;}
      try{send(JSON.parse(value));}catch{send();}
    }
    function detach() {
      observer?.disconnect();observer=null;
      doc?.documentElement?.removeAttribute('data-halo-zen-consumer');
      doc=null;previous='';pending=null;awaiting=0;content.clearTimeout(watchdog);watchdog=0;
    }
    function attach() {
      if(!state?.enabled||!allowed()){detach();send();return;}
      const next=content.document;
      if(!next?.documentElement)return;
      if(doc!==next){detach();doc=next;}
      observer?.disconnect();
      observer=new content.MutationObserver(sample);
      observer.observe(doc.documentElement,{attributes:true,attributeFilter:['data-halo-zen-profile']});
      doc.documentElement.setAttribute('data-halo-zen-consumer',JSON.stringify({v:1,side:state.side,edge:state.edge,
        ...(state.span ? {span:state.span} : {})}));
      previous='';sample();
    }
    addMessageListener(control,data=>{
      const value=data.data;
      if(value?.v!==1||!Number.isInteger(value.id)||typeof value.owner!=='string'||value.owner.length!==36)return;
      if(!value.enabled){if(state?.owner!==value.owner||state?.id!==value.id)return;detach();state=null;return;}
      if(!['left','right'].includes(value.side)||!Number.isFinite(value.edge)||value.edge<0||value.edge>1)return;
      if(value.span!==undefined && (!Array.isArray(value.span)||value.span.length!==2||
          !value.span.every(n=>Number.isFinite(n)&&n>=-2&&n<=3)||value.span[0]>=value.span[1]))return;
      state=value;hidden=false;attach();
    });
    addMessageListener(ack,data=>{
      const value=data.data;
      if(!state||value?.owner!==state.owner||value.id!==state.id||value.seq!==awaiting)return;
      awaiting=0;content.clearTimeout(watchdog);watchdog=0;flush();
    });
    addEventListener('DOMContentLoaded',()=>attach(),true);
    addEventListener('pageshow',()=>{hidden=false;attach();},true);
    addEventListener('popstate',()=>attach(),true);
    addEventListener('yt-navigate-finish',()=>attach(),true);
    content.addEventListener('scroll',()=>{
      if(!state?.enabled||hidden||scrollFrame)return;
      const twitch=content.location.hostname==='www.twitch.tv';
      if(!twitch&&content.location.hostname!=='www.youtube.com')return;
      if(twitch&&!content.document.querySelector('[data-halo-zen-scroll-host]'))return;
      scrollFrame=content.requestAnimationFrame(()=>{
        scrollFrame=0;
        const y=twitch?content.document.querySelector('[data-halo-zen-scroll-host]')?.scrollTop:content.scrollY;
        if(!Number.isFinite(y))return;
        if(y===lastScrollY||!state?.enabled)return;
        lastScrollY=y;
        try{sendAsyncMessage(scroll,{owner:state.owner,id:state.id,uri:content.location.href,
          scrollY:y,at:content.performance.now()});}catch{}
      });
    },true);
    addEventListener('pagehide',()=>{hidden=true;send();detach();},true);
  }
  const frameURI='data:application/javascript;charset=utf-8,'+encodeURIComponent(`(${frameBridge.toString()})();`);
  function selectBrowser() {
    if(destroyed)return;
    if(current){try{current.manager.sendAsyncMessage(controlName,{v:1,owner,id:current.id,enabled:false});}catch{}}
    current=null;lastGeometry='';latestScrollY=0;latestScrollAt=-1;hide(!enabled());
    const browser=gBrowser.selectedBrowser;
    if(!enabled()||!eligible(browser))return;
    const manager=browser.messageManager||browser.frameLoader?.messageManager;
    if(!manager?.loadFrameScript||!manager?.addMessageListener){lastError='Content bridge unavailable in this Zen version';return;}
    const old=transports.get(browser);
    if(old&&old.manager!==manager){
      try{old.manager.removeMessageListener(messageName,old.listener);
        old.manager.removeMessageListener(scrollName,old.scrollListener);}catch{}
      transports.delete(browser);
    }
    if(!transports.has(browser)) {
      const listener={receiveMessage(data){
        const packet=data.data;
        try{
          if(!current||current.browser!==browser||packet?.owner!==owner||packet?.id!==current.id||!eligible(browser)||
            packet.uri!==browser.currentURI.spec)return;
          if(!valid(packet)){hide();return;}
          if(lastProfile && packet.profile.seq <= lastProfile.profile.seq)return;
          const profile=packet.profile;
          if(Number.isFinite(profile.scrollY)&&Number.isFinite(profile.at)&&profile.at>=latestScrollAt){
            latestScrollY=profile.scrollY;latestScrollAt=profile.at;
          }
          // Paint on receipt, then acknowledge. If chrome falls behind, the
          // content process skips queued intermediate frames.
          lastProfile=packet;
          if (!redrawId) paint();
        }catch(error){lastError=error.message;hide();}
        finally{
          if(packet?.owner===owner&&Number.isInteger(packet.profile?.seq)){
            try{manager.sendAsyncMessage(ackName,{owner:packet.owner,id:packet.id,seq:packet.profile.seq});}catch{}
          }
        }
      }};
      const scrollListener={receiveMessage(data){
        const packet=data.data;
        if(!current||current.browser!==browser||packet?.owner!==owner||packet.id!==current.id||
          packet.uri!==browser.currentURI.spec||!lastProfile?.profile||
          !Number.isFinite(lastProfile.profile.scrollY)||!Number.isFinite(packet.scrollY)||
          packet.scrollY<0||packet.scrollY>1e8||!Number.isFinite(packet.at)||packet.at<latestScrollAt)return;
        if(packet.scrollY===latestScrollY)return;
        latestScrollY=packet.scrollY;latestScrollAt=packet.at;queueDraw();
      }};
      manager.addMessageListener(messageName,listener);
      manager.addMessageListener(scrollName,scrollListener);
      transports.set(browser,{manager,listener,scrollListener});
    }
    current={browser,manager,id:++serial};
    try{manager.loadFrameScript(frameURI,false);refreshGeometry();}
    catch(error){lastError=error.message;hide(true);}
  }
  const progress={onLocationChange(browser,webProgress){if(browser===gBrowser.selectedBrowser&&webProgress?.isTopLevel!==false)selectBrowser();}};
  // A content process can miss its first control packet while a new page is
  // loading. Retry only until the first profile arrives; normal frame updates
  // remain event-driven and keep the existing acknowledgement backpressure.
  const reconnect = setInterval(()=>{if(current&&!lastProfile)refreshGeometry(true);},2000);
  function destroy() {
    if(destroyed)return;
    destroyed=true;
    if(current){try{current.manager.sendAsyncMessage(controlName,{v:1,owner,id:current.id,enabled:false});}catch{}}
    for(const {manager,listener,scrollListener} of transports.values()){
      try{manager.removeMessageListener(messageName,listener);
        manager.removeMessageListener(scrollName,scrollListener);}catch{}
    }
    transports.clear();clearInterval(reconnect);abort.abort();removeLayer();styleNode.remove();
    if(redrawId)cancelAnimationFrame(redrawId);
    gBrowser.removeTabsProgressListener?.(progress);
    services.prefs.removeObserver(enabledPref,prefsObserver);
    delete window.HaloZenTabs;
  }
  window.HaloZenTabs=Object.freeze({destroy,refresh:selectBrowser,
    status:()=>({connected:!!current,visible:!!layer&&layer.style.opacity==='1',shadowCleared:!!shadowTarget,
      edgesVisible:[...edgeLayers.values()].some(canvas=>canvas.style.opacity==='1'),
      error:lastError,version:'0.1.15'})});
  gBrowser.tabContainer.addEventListener('TabSelect',selectBrowser,{signal:abort.signal});
  gBrowser.tabContainer.addEventListener('TabClose',event=>{
    const browser=event.target.linkedBrowser,entry=transports.get(browser);
    if(current?.browser===browser){try{current.manager.sendAsyncMessage(controlName,{v:1,owner,id:current.id,enabled:false});}catch{}current=null;hide();}
    if(entry){try{entry.manager.removeMessageListener(messageName,entry.listener);
      entry.manager.removeMessageListener(scrollName,entry.scrollListener);}catch{}transports.delete(browser);}
  },{signal:abort.signal});
  gBrowser.addTabsProgressListener?.(progress);
  services.prefs.addObserver(enabledPref,prefsObserver);
  window.addEventListener('resize',queueDraw,{signal:abort.signal});
  window.addEventListener('fullscreen',queueDraw,{signal:abort.signal});
  window.addEventListener('unload',destroy,{once:true,signal:abort.signal});
  selectBrowser();
})();
