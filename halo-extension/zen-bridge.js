/* Optional, local-only colour strip for the Zen companion. No extra video capture. */
(() => {
  'use strict';
  const requestAttribute = 'data-halo-zen-consumer';
  const profileAttribute = 'data-halo-zen-profile';
  const count = 192, across = 128;
  function create(onChange) {
    const root = document.documentElement;
    const filtered = document.createElement('canvas');
    const context = filtered.getContext('2d',{willReadFrequently:true});
    let revision = 0, cachedRevision = -1, sequence = 0;
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
      const {canvas,projection,geometry,settings,picture,frameReady}=details;
      const consumer = request();
      if (!consumer || !settings.zenTabs || !frameReady || document.hidden || document.fullscreenElement || !geometry) {
        clear(); return;
      }
      // The page renderer already applies settings.fps. Publish that same
      // projected frame immediately so the native tabs never trail the page.
      const box = projection.getBoundingClientRect();
      if (!box.width || !box.height) { clear(); return; }
      const scale = canvas.width/box.width;
      try {
        if (cachedRevision !== revision || filtered.width !== canvas.width || filtered.height !== canvas.height) {
          // Resizing also resets the origin-clean flag after protected media.
          filtered.width = canvas.width; filtered.height = canvas.height;
          // Read the exact filtered pixels displayed on the page. Recomputing
          // blur here creates a visible colour break at Zen's sidebar edge.
          context.drawImage(canvas,0,0);
          cachedRevision = revision;
        }
        const x = consumer.edge*innerWidth + (consumer.side === 'left' ? -.5 : .5);
        const column = Math.floor((x-box.left)*scale);
        const pixels = column >= 0 && column < filtered.width ?
          context.getImageData(column,0,1,filtered.height).data : null;
        const y0 = -256, step = (innerHeight+512)/(count-1);
        const rgba = [], dim = [], opposite = [], oppositeDim = [], g = geometry, f = settings.feather/100;
        const width = g.width+g.left+g.right, height = g.height+g.top+g.bottom;
        const horizontal = mask(g.view.x+x-box.left,width,g.left,g.right,f);
        const otherX = consumer.side === 'left' ? innerWidth-.5 : .5;
        const otherColumn = Math.floor((otherX-box.left)*scale);
        const otherPixels = otherColumn >= 0 && otherColumn < filtered.width ?
          context.getImageData(otherColumn,0,1,filtered.height).data : null;
        const otherHorizontal = mask(g.view.x+otherX-box.left,width,g.left,g.right,f);
        function darknessAt(sampleX,y) {
          let darkness = settings.dim/100;
          if (settings.dimMode === 'local') {
            const extent = Math.max(160,settings.spread);
            const distance = Math.hypot((sampleX-picture.left-picture.width/2)/(picture.width/2+extent),
              (y-picture.top-picture.height/2)/(picture.height/2+extent));
            darkness *= Math.min(1,Math.max(0,(1-distance)/.7));
          }
          return Math.round(darkness*255);
        }
        for (let i=0;i<count;i++) {
          const y = y0+i*step, row = Math.floor((y-box.top)*filtered.height/box.height);
          const vertical = mask(g.view.y+y-box.top,height,g.top,g.bottom,f)*settings.intensity/100;
          const alpha = horizontal*vertical;
          const offset = row*4;
          if (pixels && row >= 0 && row < filtered.height) rgba.push(pixels[offset],pixels[offset+1],pixels[offset+2],Math.round(pixels[offset+3]*alpha));
          else rgba.push(0,0,0,0);
          if (otherPixels && row >= 0 && row < filtered.height)
            opposite.push(otherPixels[offset],otherPixels[offset+1],otherPixels[offset+2],
              Math.round(otherPixels[offset+3]*otherHorizontal*vertical));
          else opposite.push(0,0,0,0);
          dim.push(darknessAt(x,y));oppositeDim.push(darknessAt(otherX,y));
        }
        function sampleRow(y) {
          const row = Math.floor((y-box.top)*filtered.height/box.height);
          const rowPixels = row >= 0 && row < filtered.height ? context.getImageData(0,row,filtered.width,1).data : null;
          const colours = [], shade = [];
          for (let i=0;i<across;i++) {
            const sampleX = i*(innerWidth-1)/(across-1);
            const column = Math.floor((sampleX-box.left)*scale);
            const alpha = mask(g.view.x+sampleX-box.left,width,g.left,g.right,f)*
              mask(g.view.y+y-box.top,height,g.top,g.bottom,f)*settings.intensity/100;
            const offset = column*4;
            if (rowPixels && column >= 0 && column < filtered.width)
              colours.push(rowPixels[offset],rowPixels[offset+1],rowPixels[offset+2],Math.round(rowPixels[offset+3]*alpha));
            else colours.push(0,0,0,0);
            shade.push(darknessAt(sampleX,y));
          }
          return [colours,shade];
        }
        const [top,topDim] = sampleRow(0);
        const [bottom,bottomDim] = sampleRow(innerHeight-1);
        root.setAttribute(profileAttribute,JSON.stringify({v:1,seq:++sequence,side:consumer.side,
          height:innerHeight,y0,step,rgba,dim,opposite,oppositeDim,across,top,bottom,topDim,bottomDim,
          strength:settings.zenTabsIntensity,fade:settings.zenTabsFade}));
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
