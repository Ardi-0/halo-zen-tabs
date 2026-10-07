/* Per-edge Gaussian blur on the bounded projection tile. No video readback. */
(() => {
  'use strict';
  function create() {
    const layer = document.createElement('canvas');
    const layerCtx = layer.getContext('2d');
    let cacheKey = '', masks = [];

    function prepare(width, height, geometry, radii) {
      const unique = [...new Set(radii)];
      const assignment = radii.map(radius => unique.indexOf(radius));
      const { view, left, top, width:videoWidth, height:videoHeight } = geometry;
      const blend = Math.max(24,Math.min(160,Math.max(...radii)));
      const key = JSON.stringify([width,height,view,left,top,videoWidth,videoHeight,assignment,blend]);
      if (key !== cacheKey) {
        masks = unique.map(() => {
          const canvas = document.createElement('canvas');canvas.width=width;canvas.height=height;
          const ctx=canvas.getContext('2d');return {canvas,ctx,pixels:ctx.createImageData(width,height)};
        });
        const weights = new Float64Array(unique.length);
        for (let y=0;y<height;y++) {
          const py=view.y+(y+.5)*view.height/height;
          for (let x=0;x<width;x++) {
            const px=view.x+(x+.5)*view.width/width;
            const distances=[top-py,px-left-videoWidth,py-top-videoHeight,left-px];
            const nearest=Math.max(...distances);
            weights.fill(0);
            let sum=0;
            for (let side=0;side<4;side++) {
              const weight=Math.max(0,distances[side]-nearest+blend)**2;
              weights[assignment[side]]+=weight;sum+=weight;
            }
            // Quantise cumulative weights so their alpha sum is exactly 255.
            // Additive premultiplied composition avoids dark seams at corners.
            let cumulative=0,previous=0;
            const offset=(y*width+x)*4;
            for (let group=0;group<masks.length;group++) {
              cumulative+=weights[group];
              const next=group===masks.length-1?255:Math.round(cumulative/sum*255);
              const data=masks[group].pixels.data;
              data[offset]=data[offset+1]=data[offset+2]=255;
              data[offset+3]=next-previous;previous=next;
            }
          }
        }
        for (const mask of masks) {mask.ctx.putImageData(mask.pixels,0,0);delete mask.pixels;}
        cacheKey=key;
      }
      return unique;
    }

    function render(source, output, geometry, radii) {
      const {width,height}=source;
      const unique=prepare(width,height,geometry,radii);
      if(layer.width!==width||layer.height!==height){layer.width=width;layer.height=height;}
      output.save();
      output.setTransform(1,0,0,1,0,0);output.filter='none';output.globalAlpha=1;
      output.clearRect(0,0,width,height);output.globalCompositeOperation='lighter';
      for (let i=0;i<unique.length;i++) {
        layerCtx.globalCompositeOperation='source-over';layerCtx.filter='none';
        layerCtx.clearRect(0,0,width,height);
        layerCtx.filter=`blur(${unique[i]*geometry.scale}px)`;
        layerCtx.drawImage(source,0,0);
        layerCtx.filter='none';layerCtx.globalCompositeOperation='destination-in';
        layerCtx.drawImage(masks[i].canvas,0,0);
        output.drawImage(layer,0,0);
      }
      output.restore();
    }
    function reset() {
      // Clear origin taint when switching away from a restricted video.
      layer.width=layer.width;cacheKey='';masks=[];
    }
    return {render,reset};
  }
  globalThis.HaloBlur=Object.freeze({create});
})();
