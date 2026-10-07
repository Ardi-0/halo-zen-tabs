/* Optional, local-only colour strip for the Zen companion. No extra video capture. */
(() => {
  'use strict';
  const requestAttribute = 'data-halo-zen-consumer';
  const profileAttribute = 'data-halo-zen-profile';
  const count = 192;
  function create(onChange) {
    const root = document.documentElement;
    const filtered = document.createElement('canvas');
    const context = filtered.getContext('2d',{willReadFrequently:true});
    let revision = 0, cachedRevision = -1, cachedFilter = '', sequence = 0;
    const observer = new MutationObserver(onChange);
    observer.observe(root,{attributes:true,attributeFilter:[requestAttribute]});
    function request() {
      try {
        const text = root.getAttribute(requestAttribute);
        if (!text || text.length > 256) return null;
        const value = JSON.parse(text);
        return value.v === 1 && ['left','right'].includes(value.side) &&
          Number.isFinite(value.edge) && value.edge >= 0 && value.edge <= 1 ? value : null;
      } catch { return null; }
    }
    function clear() {
      root.removeAttribute(profileAttribute);
    }
    function mask(position,size,start,end,f) {
      if (position < 0 || position > size) return 0;
      return Math.min(1,start*f ? position/(start*f) : 1,end*f ? (size-position)/(end*f) : 1);
    }
    function publish(details) {
      const {canvas,projection,geometry,settings,blurRadii,directionalBlur,picture,frameReady}=details;
      const consumer = request();
      if (!consumer || !settings.zenTabs || !frameReady || document.hidden || document.fullscreenElement || !geometry) {
        clear(); return;
      }
      // The page renderer already applies settings.fps. Publish that same
      // projected frame immediately so the native tabs never trail the page.
      const box = projection.getBoundingClientRect();
      if (!box.width || !box.height) { clear(); return; }
      const scale = canvas.width/box.width;
      const filter = `blur(${directionalBlur ? 0 : blurRadii[0]*scale}px) saturate(${settings.saturation}%) brightness(${settings.brightness}%)`;
      try {
        if (cachedRevision !== revision || cachedFilter !== filter || filtered.width !== canvas.width || filtered.height !== canvas.height) {
          // Resizing also resets the origin-clean flag after protected media.
          filtered.width = canvas.width; filtered.height = canvas.height;
          context.filter = filter; context.drawImage(canvas,0,0);
          cachedRevision = revision; cachedFilter = filter;
        }
        const x = consumer.edge*innerWidth + (consumer.side === 'left' ? -.5 : .5);
        const column = Math.floor((x-box.left)*scale);
        const pixels = column >= 0 && column < filtered.width ?
          context.getImageData(column,0,1,filtered.height).data : null;
        const y0 = -256, step = (innerHeight+512)/(count-1);
        const rgba = [], dim = [], g = geometry, f = settings.feather/100;
        const width = g.width+g.left+g.right, height = g.height+g.top+g.bottom;
        const horizontal = mask(g.view.x+x-box.left,width,g.left,g.right,f);
        for (let i=0;i<count;i++) {
          const y = y0+i*step, row = Math.floor((y-box.top)*filtered.height/box.height);
          const alpha = horizontal*mask(g.view.y+y-box.top,height,g.top,g.bottom,f)*settings.intensity/100;
          const offset = row*4;
          if (pixels && row >= 0 && row < filtered.height) rgba.push(pixels[offset],pixels[offset+1],pixels[offset+2],Math.round(pixels[offset+3]*alpha));
          else rgba.push(0,0,0,0);
          let darkness = settings.dim/100;
          if (settings.dimMode === 'local') {
            const extent = Math.max(160,settings.spread);
            const distance = Math.hypot((x-picture.left-picture.width/2)/(picture.width/2+extent),
              (y-picture.top-picture.height/2)/(picture.height/2+extent));
            darkness *= Math.min(1,Math.max(0,(1-distance)/.7));
          }
          dim.push(Math.round(darkness*255));
        }
        root.setAttribute(profileAttribute,JSON.stringify({v:1,seq:++sequence,side:consumer.side,
          height:innerHeight,y0,step,rgba,dim,strength:settings.zenTabsIntensity,fade:settings.zenTabsFade}));
      } catch {
        // A tainted canvas must never turn into a new screenshot/capture path.
        clear();
      }
    }
    return Object.freeze({publish,clear,request,changed:()=>revision++,
      destroy:()=>{observer.disconnect();clear();}});
  }
  globalThis.HaloZenBridge = Object.freeze({create});
})();
