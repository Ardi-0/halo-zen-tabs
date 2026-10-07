/* Geometry and edge extension. All source coordinates refer to the decoded frame. */
(() => {
  'use strict';
  function position(token, free) {
    if (token === 'left' || token === 'top') return 0;
    if (token === 'right' || token === 'bottom') return free;
    if (token?.endsWith('%')) return free * parseFloat(token) / 100;
    if (token?.endsWith('px')) return parseFloat(token);
    return free / 2;
  }
  function videoMapping(box, width, height, fit = 'contain', objectPosition = '50% 50%') {
    const full = { x: 0, y: 0, width, height };
    if (!width || !height || fit === 'fill') return { rect: box, source: full };
    const contain = Math.min(box.width / width, box.height / height);
    const scale = fit === 'cover' ? Math.max(box.width / width, box.height / height) :
      fit === 'none' ? 1 : fit === 'scale-down' ? Math.min(1, contain) : contain;
    const tokens = objectPosition.split(/\s+/);
    const x = position(tokens[0], box.width - width * scale);
    const y = position(tokens[1] || '50%', box.height - height * scale);
    const left = Math.max(0, x), top = Math.max(0, y);
    const w = Math.min(box.width, x + width * scale) - left;
    const h = Math.min(box.height, y + height * scale) - top;
    return {
      rect: { left: box.left + left, top: box.top + top, width: w, height: h },
      source: { x: (left - x) / scale, y: (top - y) / scale, width: w / scale, height: h / scale }
    };
  }
  function insetRect(r, crop) {
    return { left: r.left + r.width * crop.x, top: r.top + r.height * crop.y,
      width: r.width * crop.width, height: r.height * crop.height };
  }
  function detectBars(image) {
    const { data, width: w, height: h } = image;
    let bright = 0, count = 0;
    for (let i = 0; i < data.length; i += 32) { if (Math.max(data[i], data[i+1], data[i+2]) > 38) bright++; count++; }
    // An entirely dark scene gives no reliable evidence about the image boundary.
    if (bright / count < .08) return null;
    function blackLine(axis, p, from, to) {
      let dark = 0, total = 0;
      for (let q = from; q < to; q++) {
        const i = (axis === 'y' ? p * w + q : q * w + p) * 4;
        const v = Math.max(data[i], data[i+1], data[i+2]);
        if (v <= 14) dark++;
        total += v;
      }
      return dark / (to-from) >= .99 && total / (to-from) <= 10;
    }
    function pair(axis, size, from, to) {
      const limit = Math.floor(size * .2);
      let a = 0, b = 0;
      while (a < limit && blackLine(axis, a, from, to)) a++;
      while (b < limit && blackLine(axis, size-1-b, from, to)) b++;
      // Symmetric, uniformly black margins only. No unilateral "subject detection".
      if (!a || !b || a >= limit || b >= limit || Math.abs(a-b) > 2) return [0,0];
      return [a+1,b+1]; // Skip the resampling/compression transition at the boundary.
    }
    const [top,bottom] = pair('y',h,0,w);
    const [left,right] = pair('x',w,top,h-bottom);
    return { x: left/w, y: top/h, width: (w-left-right)/w, height: (h-top-bottom)/h };
  }
  function sceneDifference(data, previous) {
    if (!previous || previous.length !== data.length) return 0;
    let delta = 0, count = 0;
    for (let i = 0; i < data.length; i += 32) {
      delta += Math.abs(data[i]-previous[i]) + Math.abs(data[i+1]-previous[i+1]) + Math.abs(data[i+2]-previous[i+2]); count += 3;
    }
    return delta / count;
  }
  function paint(ctx, source, crop, geometry, type = 'edges') {
    const { width, height, left:l, top:t, right:r, bottom:b } = geometry;
    const totalW = width+l+r, totalH = height+t+b;
    const view = geometry.view || { x:0,y:0,width:totalW,height:totalH };
    const scaleX = ctx.canvas.width/view.width, scaleY = ctx.canvas.height/view.height;
    ctx.setTransform(scaleX,0,0,scaleY,-view.x*scaleX,-view.y*scaleY);
    ctx.clearRect(view.x,view.y,view.width,view.height);
    const sx = Math.round(crop.x*source.width), sy = Math.round(crop.y*source.height);
    const sw = Math.max(1, Math.min(source.width-sx,Math.round(crop.width*source.width)));
    const sh = Math.max(1, Math.min(source.height-sy,Math.round(crop.height*source.height)));
    if (type === 'scaled') { ctx.drawImage(source,sx,sy,sw,sh,0,0,totalW,totalH); return; }
    // The centre stays exactly aligned with the video. Only the four edge rows/
    // columns and four corner pixels extend outwards; spread cannot shift them.
    ctx.drawImage(source,sx,sy,sw,sh,l,t,width,height);
    if (t) ctx.drawImage(source,sx,sy,sw,1,l,0,width,t);
    if (b) ctx.drawImage(source,sx,sy+sh-1,sw,1,l,t+height,width,b);
    if (l) ctx.drawImage(source,sx,sy,1,sh,0,t,l,height);
    if (r) ctx.drawImage(source,sx+sw-1,sy,1,sh,l+width,t,r,height);
    if (l && t) ctx.drawImage(source,sx,sy,1,1,0,0,l,t);
    if (r && t) ctx.drawImage(source,sx+sw-1,sy,1,1,l+width,0,r,t);
    if (l && b) ctx.drawImage(source,sx,sy+sh-1,1,1,0,t+height,l,b);
    if (r && b) ctx.drawImage(source,sx+sw-1,sy+sh-1,1,1,l+width,t+height,r,b);
  }
  globalThis.HaloProjection = Object.freeze({ videoMapping, insetRect, detectBars, sceneDifference, paint });
})();
