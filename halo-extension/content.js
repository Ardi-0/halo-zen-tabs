(() => {
  'use strict';
  const api = globalThis.browser;
  if (!api || globalThis.__haloInstalled) return;
  globalThis.__haloInstalled = true;
  const { normalize, resolveStorage } = globalThis.HaloSettings;
  const renderer = globalThis.HaloProjection;
  const site = globalThis.HaloSite;
  const twitchSurfaces = site.id === 'twitch' ? globalThis.HaloTwitchSurfaces.create(queueLayout) : null;
  const zenBridge = globalThis.HaloZenBridge.create(queueLayout);
  const fullCrop = Object.freeze({ x: 0, y: 0, width: 1, height: 1 });
  let settings = normalize();
  let storedSettings = {};
  let video = null, active = false, frameId = null, frameKind = '', lastDraw = 0;
  let previous = null, readable = true, rendered = 0, warning = '', layoutId = 0;
  let currentSource = '', ready = false, sourceKey = location.pathname + location.search;
  let rawPrevious = null, detectedCrop = fullCrop, cropCandidate = '', cropCount = 0;
  let geometry = null, mapping = null, frameReady = false, sceneCutCount = 0;
  let lightPicture = null;
  let blurRadii = [], directionalBlur = false;
  let roundedPlayer = null, roundedVideo = null, roundedSlot = null;
  let theaterGeometry = '', theaterResizeId = 0, theaterSpacer = null;
  const abort = new AbortController();
  const signal = abort.signal;
  const host = document.createElement('div');
  host.id = 'halo-zen-surface';
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = 'all:initial!important;position:absolute!important;inset:0!important;width:100%!important;height:100%!important;pointer-events:none!important;z-index:0!important;overflow:clip!important;display:none!important;isolation:isolate!important;';
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = `
    :host { color-scheme:normal; }
    * { box-sizing:border-box; pointer-events:none!important; }
    #dim { position:fixed; inset:0; }
    #projection { position:absolute; overflow:hidden; mask-composite:intersect; }
    canvas { position:absolute; inset:0; width:100%; height:100%; }
  `;
  const dim = document.createElement('div'); dim.id = 'dim';
  const projection = document.createElement('div'); projection.id = 'projection';
  const canvas = document.createElement('canvas');
  const sample = document.createElement('canvas');
  const frame = document.createElement('canvas');
  const projected = document.createElement('canvas');
  const projectedCtx = projected.getContext('2d');
  const edgeBlur = globalThis.HaloBlur.create();
  const sampleCtx = sample.getContext('2d', { willReadFrequently: true });
  const frameCtx = frame.getContext('2d');
  const ctx = canvas.getContext('2d');
  projection.append(canvas); shadow.append(style, dim, projection);
  // The Twitch player scrolls inside a clipped app column. This complementary
  // surface shares the same projection, only outside that column. Inside it,
  // the native scrolling surface also lights the transparent chat on the right.
  let backdrop = null, backdropProjection = null, backdropCanvas = null, backdropDim = null;
  function syncTwitchBackdrop(parent, hostBox, picture) {
    if (site.id !== 'twitch') return;
    if (document.fullscreenElement) {
      host.style.removeProperty('clip-path');
      if (backdrop) backdrop.style.setProperty('display', 'none', 'important');
      return;
    }
    const scroller = parent.closest('[data-a-target="root-scroller"], .root-scrollable, .channel-root__scroll-area--theatre-mode');
    const viewport = scroller?.getBoundingClientRect();
    host.style.setProperty('clip-path', 'inset(0)', 'important');
    if (!viewport) {
      if (backdrop) backdrop.style.setProperty('display', 'none', 'important');
      return;
    }
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'halo-zen-twitch-backdrop';
      backdrop.setAttribute('aria-hidden', 'true');
      backdrop.style.cssText = 'all:initial!important;position:fixed!important;inset:0!important;pointer-events:none!important;z-index:0!important;overflow:clip!important;isolation:isolate!important;';
      const root = backdrop.attachShadow({ mode:'open' });
      backdropDim = document.createElement('div'); backdropDim.id = 'dim';
      backdropProjection = document.createElement('div'); backdropProjection.id = 'projection';
      backdropCanvas = document.createElement('canvas');
      backdropProjection.append(backdropCanvas); root.append(style.cloneNode(true), backdropDim, backdropProjection);
      document.body.prepend(backdrop);
      copyTwitchFrame();
    }
    // Use the content viewport, excluding borders and scrollbars. The outer
    // copy then covers all remaining bands without doubling light at the seam.
    const left = viewport.left + scroller.clientLeft;
    const top = viewport.top + scroller.clientTop;
    backdrop.style.setProperty('display', 'block', 'important');
    backdrop.style.setProperty('clip-path', pictureCutout(left,top,scroller.clientWidth,scroller.clientHeight), 'important');
    backdropProjection.style.cssText = projection.style.cssText;
    backdropProjection.style.left = `${hostBox.left+parseFloat(projection.style.left)}px`;
    backdropProjection.style.top = `${hostBox.top+parseFloat(projection.style.top)}px`;
    backdropCanvas.style.cssText = canvas.style.cssText;
    backdropDim.style.background = dimBackground(picture, 0, 0);
    const dimBox = backdropDim.getBoundingClientRect();
    backdropDim.style.clipPath = pictureCutout(mapping.rect.left-dimBox.left, mapping.rect.top-dimBox.top,
      mapping.rect.width, mapping.rect.height);
  }
  function copyTwitchFrame() {
    if (!backdropCanvas) return;
    if (backdropCanvas.width !== canvas.width || backdropCanvas.height !== canvas.height) {
      backdropCanvas.width = canvas.width; backdropCanvas.height = canvas.height;
    }
    const context = backdropCanvas.getContext('2d');
    context.clearRect(0, 0, backdropCanvas.width, backdropCanvas.height);
    context.drawImage(canvas, 0, 0);
  }
  function dimBackground(picture, x, y) {
    const alpha = settings.dim / 100;
    return settings.dimMode === 'uniform' ? `rgba(0,0,0,${alpha})` :
      `radial-gradient(ellipse ${picture.width/2 + Math.max(160,settings.spread)}px ${picture.height/2 + Math.max(160,settings.spread)}px at ${picture.left-x+picture.width/2}px ${picture.top-y+picture.height/2}px, rgba(0,0,0,${alpha}) 30%, transparent 100%)`;
  }
  function pictureCutout(x, y, width, height, radius = 0) {
    const r = Math.max(0,Math.min(radius,width/2,height/2));
    let points;
    if (!r) points = [[x,y],[x+width,y],[x+width,y+height],[x,y+height]];
    else {
      points = [];
      // Follow the same rounded picture as the real video. A rectangular hole
      // leaves a square patch of unlit desktop behind each rounded corner.
      // Twelve segments per quarter stay within 0.14 px at the maximum radius.
      const centers = [[x+width-r,y+r],[x+width-r,y+height-r],[x+r,y+height-r],[x+r,y+r]];
      centers.forEach(([cx,cy],corner) => {
        for (let step=0;step<=12;step++) {
          const angle = (corner-1+step/12)*Math.PI/2;
          points.push([cx+r*Math.cos(angle),cy+r*Math.sin(angle)]);
        }
      });
    }
    const hole = [...points,points[0]].map(([px,py])=>`${px}px ${py}px`).join(', ');
    return `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${hole})`;
  }

  function mode() {
    return site.mode();
  }
  function clearTwitchChat() {
    document.documentElement.removeAttribute('data-halo-twitch-chat');
    document.documentElement.style.removeProperty('--halo-chat-opacity');
  }
  function syncTwitchSurfaces() {
    twitchSurfaces?.sync({video,radius:settings.playerRadius,light:active && !document.fullscreenElement,
      chat:document.documentElement.hasAttribute('data-halo-twitch-chat')});
  }
  function updateTwitchChat() {
    if (site.id !== 'twitch') return;
    const enabled = ready && settings.enabled && settings.twitchChatGlass && site.isWatchPage() &&
      video?.isConnected && !site.isMiniPlayer(video) && !document.fullscreenElement;
    if (!enabled) clearTwitchChat();
    else {
      document.documentElement.setAttribute('data-halo-twitch-chat', '');
      document.documentElement.style.setProperty('--halo-chat-opacity', `${settings.twitchChatOpacity}%`);
    }
    syncTwitchSurfaces();
  }
  function stopFrames() {
    if (frameId !== null) {
      if (frameKind === 'video') video?.cancelVideoFrameCallback?.(frameId);
      else cancelAnimationFrame(frameId);
    }
    frameId = null;
  }
  function resetFrame() {
    zenBridge.changed(); zenBridge.clear();
    previous = null; readable = true; warning = ''; lastDraw = 0;
    rawPrevious = null; detectedCrop = fullCrop; cropCandidate = ''; cropCount = 0; frameReady = false;
    // Assigning width also clears a canvas's origin-clean flag after a tainted source.
    sample.width = sample.width; canvas.width = canvas.width; frame.width = frame.width;
    projected.width = projected.width; edgeBlur.reset();
    if (backdropCanvas) backdropCanvas.width = backdropCanvas.width;
  }
  function deactivate() {
    zenBridge.clear();
    active = false; stopFrames();
    host.style.setProperty('display', 'none', 'important');
    if (backdrop) backdrop.style.setProperty('display', 'none', 'important');
    document.documentElement.removeAttribute('data-halo-active');
    document.documentElement.removeAttribute('data-halo-site');
    syncTwitchSurfaces();
  }
  function applyAppearance() {
    blurRadii = globalThis.HaloSettings.blurRadii(settings);
    directionalBlur = !blurRadii.every(radius => radius === blurRadii[0]);
    canvas.style.filter = `blur(${directionalBlur ? 0 : blurRadii[0]}px) saturate(${settings.saturation}%) brightness(${settings.brightness}%)`;
    projection.style.opacity = String(settings.intensity / 100);
  }
  function clearPlayerCorners() {
    playerLayoutObserver.disconnect();
    if (roundedSlot) resize.unobserve(roundedSlot);
    if (roundedPlayer) {
      resize.unobserve(roundedPlayer);
      clearTheaterControls(roundedPlayer);
      roundedPlayer.removeAttribute('data-halo-rounded');
      roundedPlayer.style.removeProperty('--halo-player-radius');
    }
    if (roundedVideo) {
      roundedVideo.removeAttribute('data-halo-video-rounded');
      roundedVideo.style.removeProperty('--halo-video-clip');
    }
    roundedPlayer = null;
    roundedVideo = null;
    roundedSlot = null;
  }
  function notifyPlayerResize() {
    if (theaterResizeId) return;
    // Let YouTube refresh its own coordinate cache, chapter widths, hover
    // preview and responsive buttons after the player's real bounds change.
    theaterResizeId = requestAnimationFrame(() => {
      theaterResizeId = 0;
      window.dispatchEvent(new Event('resize'));
    });
  }
  function clearTheaterControls(player) {
    const fitted = player.hasAttribute('data-halo-theater-player');
    player.removeAttribute('data-halo-theater-player');
    for (const name of ['left','top','width','height']) {
      player.style.removeProperty(`--halo-fit-${name}`);
    }
    theaterSpacer?.remove(); theaterSpacer = null;
    theaterGeometry = '';
    if (fitted) notifyPlayerResize();
  }
  function updateTheaterControls(player) {
    playerLayoutObserver.disconnect();
    if (site.id !== 'youtube' || mode() !== 'theater' || !video.videoWidth || !video.videoHeight) {
      clearTheaterControls(player); return;
    }
    // Measure the native slot without our override. Restore the fitted bounds
    // synchronously before painting: never derive them from the previous fit,
    // or the player could shrink repeatedly on subsequent resize callbacks.
    player.removeAttribute('data-halo-theater-player');
    const box = player.getBoundingClientRect();
    if (!box.width || !box.height) { clearTheaterControls(player); return; }
    const nativeStyle = getComputedStyle(player), videoStyle = getComputedStyle(video);
    const sx = player.offsetWidth / box.width, sy = player.offsetHeight / box.height;
    // YouTube uses object-fit:cover on an already aspect-sized <video>. Applying
    // that value to the wider player slot would incorrectly stretch the fit.
    const picture = renderer.videoMapping(box, video.videoWidth, video.videoHeight,
      'contain', videoStyle.objectPosition).rect;
    const values = {
      left:(parseFloat(nativeStyle.left)||0)+(picture.left-box.left)*sx,
      top:(parseFloat(nativeStyle.top)||0)+(picture.top-box.top)*sy,
      width:picture.width*sx, height:picture.height*sy
    };
    // A spacer preserves the slot's flow height. Extra margin alone would
    // collapse against the title's margin and shift everything below the video.
    const space = Math.max(0, (box.height-picture.height)*sy);
    const margin = nativeStyle.marginBottom;
    if (!theaterSpacer) {
      theaterSpacer = document.createElement('div');
      theaterSpacer.id = 'halo-zen-player-spacer';
      theaterSpacer.setAttribute('aria-hidden', 'true');
      theaterSpacer.style.cssText = 'all:initial!important;display:block!important;width:0!important;pointer-events:none!important;';
    }
    if (player.nextSibling !== theaterSpacer) player.after(theaterSpacer);
    theaterSpacer.style.setProperty('height', `${space}px`, 'important');
    theaterSpacer.style.setProperty('margin-bottom', margin, 'important');
    const key = JSON.stringify(values);
    for (const [name,value] of Object.entries(values)) player.style.setProperty(`--halo-fit-${name}`, `${value}px`);
    player.setAttribute('data-halo-theater-player', '');
    playerLayoutObserver.observe(player, {attributes:true,attributeFilter:['style']});
    if (key !== theaterGeometry) { theaterGeometry = key; notifyPlayerResize(); }
  }
  function updatePlayerCorners() {
    const next = ready && settings.enabled && video?.isConnected && site.isWatchPage() &&
      !document.fullscreenElement && settings[mode()] && !site.isMiniPlayer(video) ? site.player(video) : null;
    if (next !== roundedPlayer || (next && video !== roundedVideo)) {
      clearPlayerCorners(); roundedPlayer = next; roundedVideo = next ? video : null;
      if (roundedPlayer) {
        resize.observe(roundedPlayer);
        roundedSlot = roundedPlayer.parentElement;
        if (roundedSlot) resize.observe(roundedSlot);
      }
    }
    if (roundedPlayer) {
      roundedPlayer.setAttribute('data-halo-rounded', '');
      roundedPlayer.style.setProperty('--halo-player-radius', `${settings.playerRadius}px`);
      updateTheaterControls(roundedPlayer);
      // object-fit can place a narrow or wide picture inside a larger <video>.
      // Clip that picture without changing the video element's size or position.
      // Halo-only crops and detected black bars must not trim the video itself.
      const box = roundedVideo.getBoundingClientRect();
      if (box.width > 0 && box.height > 0 && roundedVideo.videoWidth && roundedVideo.videoHeight) {
        const style = getComputedStyle(roundedVideo);
        const r = renderer.videoMapping(box, roundedVideo.videoWidth, roundedVideo.videoHeight,
          style.objectFit, style.objectPosition).rect;
        const percent = (distance, size) => Math.max(0, Math.min(100, distance / size * 100));
        const top = percent(r.top - box.top, box.height);
        const right = percent(box.right - r.left - r.width, box.width);
        const bottom = percent(box.bottom - r.top - r.height, box.height);
        const left = percent(r.left - box.left, box.width);
        roundedVideo.style.setProperty('--halo-video-clip',
          `inset(${top}% ${right}% ${bottom}% ${left}% round ${settings.playerRadius}px)`);
        roundedVideo.setAttribute('data-halo-video-rounded', '');
      } else {
        clearTheaterControls(roundedPlayer);
        roundedVideo.removeAttribute('data-halo-video-rounded');
        roundedVideo.style.removeProperty('--halo-video-clip');
      }
    }
  }
  function layout() {
    layoutId = 0;
    updatePlayerCorners();
    updateTwitchChat();
    if (!ready || !settings.enabled || !video?.isConnected || !site.isWatchPage() ||
        document.hidden || !settings[mode()] || site.isMiniPlayer(video)) return deactivate();
    const box = video.getBoundingClientRect();
    if (box.width < 40 || box.height < 30 || video.closest('[hidden]') ||
        getComputedStyle(video).visibility === 'hidden') return deactivate();
    const videoStyle = getComputedStyle(video);
    mapping = renderer.videoMapping(box, video.videoWidth, video.videoHeight, videoStyle.objectFit, videoStyle.objectPosition);
    const manual = { x: settings.cropX/100, y: settings.cropY/100,
      width: 1-settings.cropX/50, height: 1-settings.cropY/50 };
    const picture = renderer.insetRect(mapping.rect, manual);
    const r = renderer.insetRect(picture, settings.autoBars ? detectedCrop : fullCrop);
    lightPicture = r;
    const l = settings.spread * settings.left / 100;
    const t = settings.spread * settings.top / 100;
    const rr = settings.spread * settings.right / 100;
    const b = settings.spread * settings.bottom / 100;
    // Keep the projection anchored to the video in the page. Its clipped,
    // feathered edges can remain visible after the video leaves the viewport.
    if (r.left + r.width + rr <= 0 || r.left - l >= innerWidth ||
        r.top + r.height + b <= 0 || r.top - t >= innerHeight) return deactivate();
    const parent = site.surfaceParent(video);
    // A fullscreen <video> cannot display child overlays.
    if (parent === video) return deactivate();
    if (host.parentNode !== parent) parent.prepend(host);
    host.style.setProperty('position', site.fixedSurface(video) ? 'fixed' : 'absolute', 'important');
    const wasActive = active;
    active = true;
    document.documentElement.setAttribute('data-halo-active', '');
    document.documentElement.setAttribute('data-halo-site', site.id);
    host.style.setProperty('display', 'block', 'important');
    syncTwitchSurfaces();
    site.sizeSurface(host, parent, video);
    const w = r.width + l + rr, h = r.height + t + b, f = settings.feather / 100;
    const hostBox = host.getBoundingClientRect();
    const originX = r.left-l-hostBox.left, originY = r.top-t-hostBox.top;
    // The page, including its compositor scrolling, moves this layer. Scroll
    // never rescales the light. Keep a buffered tile on a stable sample grid;
    // refresh it only when the viewport reaches the tile's safe inner boundary.
    const padding = Math.ceil(Math.max(...blurRadii)*3);
    const extraX = innerWidth/2, extraY = innerHeight/2;
    const scale = Math.min(1,settings.resolution/r.width,
      1020/(innerWidth+2*(padding+extraX)),1020/(innerHeight+2*(padding+extraY)));
    const visibleX = -hostBox.left-originX, visibleY = -hostBox.top-originY;
    const needed = { left:Math.max(0,visibleX-padding), top:Math.max(0,visibleY-padding),
      right:Math.min(w,visibleX+innerWidth+padding), bottom:Math.min(h,visibleY+innerHeight+padding) };
    const changedShape = !geometry || geometry.width !== r.width || geometry.height !== r.height ||
      geometry.left !== l || geometry.top !== t || geometry.right !== rr || geometry.bottom !== b || geometry.scale !== scale;
    let view = geometry?.view;
    if (changedShape || needed.left < view.x || needed.top < view.y ||
        needed.right > view.x+view.width || needed.bottom > view.y+view.height) {
      const x = Math.floor(Math.max(0,needed.left-extraX)*scale)/scale;
      const y = Math.floor(Math.max(0,needed.top-extraY)*scale)/scale;
      view = { x,y,
        width:Math.ceil((Math.min(w,needed.right+extraX)-x)*scale)/scale,
        height:Math.ceil((Math.min(h,needed.bottom+extraY)-y)*scale)/scale };
    }
    const changedGeometry = changedShape || view !== geometry?.view;
    geometry = { width:r.width, height:r.height, left:l, top:t, right:rr, bottom:b, view, scale };
    Object.assign(projection.style, { left: `${originX+view.x}px`, top: `${originY+view.y}px`, width: `${view.width}px`, height: `${view.height}px` });
    projection.style.maskImage = `linear-gradient(to right, transparent ${-view.x}px, black ${l*f-view.x}px, black ${w-rr*f-view.x}px, transparent ${w-view.x}px),linear-gradient(to bottom, transparent ${-view.y}px, black ${t*f-view.y}px, black ${h-b*f-view.y}px, transparent ${h-view.y}px)`;
    if (site.id === 'twitch' && !document.fullscreenElement) {
      // Keep the halo behind the rounded cutouts, while excluding the actual
      // picture itself. The dim layer still leaves the whole rectangle clear.
      const x = mapping.rect.left-hostBox.left-originX-view.x;
      const y = mapping.rect.top-hostBox.top-originY-view.y;
      projection.style.clipPath = pictureCutout(x,y,mapping.rect.width,mapping.rect.height,settings.playerRadius);
    } else projection.style.removeProperty('clip-path');
    // A fixed dim child can escape the native scroller and overlap the navbar
    // copy. A uniform fill of Twitch's full content is equivalent, and scrolls
    // inside the same clipped column as the original light surface.
    dim.style.position = site.id === 'twitch' && !document.fullscreenElement ? 'absolute' :
      settings.dimMode === 'uniform' ? 'fixed' : 'absolute';
    dim.style.background = dimBackground(r, hostBox.left, hostBox.top);
    if (site.id === 'twitch' && !document.fullscreenElement) {
      const dimBox = dim.getBoundingClientRect();
      dim.style.clipPath = pictureCutout(mapping.rect.left-dimBox.left, mapping.rect.top-dimBox.top,
        mapping.rect.width, mapping.rect.height);
    } else dim.style.removeProperty('clip-path');
    syncTwitchBackdrop(parent, hostBox, r);
    if (!wasActive) { draw(performance.now(), true); scheduleFrame(); }
    else if (changedGeometry && frameReady) projectFrame();
    publishZen(true);
  }
  function publishZen(force=false) {
    if (!active) return zenBridge.clear();
    zenBridge.publish({canvas,projection,geometry,settings,blurRadii,directionalBlur,
      picture:lightPicture,frameReady:frameReady && readable},force);
  }
  function queueLayout() {
    if (!layoutId) layoutId = requestAnimationFrame(layout);
  }
  function projectFrame(forceBridge=false) {
    if (!geometry || !frameReady) return;
    const w = geometry.view.width, h = geometry.view.height;
    // Keep the video's sampling density stable as spread changes, with a hard
    // texture cap for extreme spreads and portrait video.
    const scale = geometry.scale;
    const width = Math.max(1,Math.round(w*scale)), height = Math.max(1,Math.round(h*scale));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    if (directionalBlur) {
      if(projected.width!==width||projected.height!==height){projected.width=width;projected.height=height;}
      renderer.paint(projectedCtx,frame,settings.autoBars ? detectedCrop : fullCrop,geometry,settings.projection);
      edgeBlur.render(projected,ctx,geometry,blurRadii);
    } else {
      renderer.paint(ctx,frame,settings.autoBars ? detectedCrop : fullCrop,geometry,settings.projection);
    }
    copyTwitchFrame();
    zenBridge.changed(); publishZen(forceBridge);
  }
  function inspectBars(pixels, force) {
    if (!settings.autoBars) return;
    const next = renderer.detectBars(pixels);
    if (!next) return;
    const key = JSON.stringify(next);
    cropCount = key === cropCandidate ? cropCount+1 : 1;
    cropCandidate = key;
    // Confirm moving images across three frames; paused/seeking still frames
    // are already stable, so the halo can update immediately.
    if ((cropCount >= 3 || (force && video.paused)) && key !== JSON.stringify(detectedCrop)) {
      detectedCrop = next; layout();
    }
  }
  function draw(now, force = false) {
    if (!active || !video || video.readyState < 2 || !video.videoWidth || settings.intensity === 0) return;
    if (!force && now - lastDraw < 1000 / settings.fps - 1) return;
    if (currentSource !== video.currentSrc) { resetFrame(); currentSource = video.currentSrc; layout(); }
    const width = Math.round(settings.resolution);
    const source = mapping?.source || { x:0,y:0,width:video.videoWidth,height:video.videoHeight };
    const cropW = source.width * (1 - settings.cropX / 50);
    const cropH = source.height * (1 - settings.cropY / 50);
    if (cropW <= 0 || cropH <= 0) return;
    const height = Math.max(32, Math.min(512, Math.round(width * cropH / cropW)));
    if (sample.width !== width || sample.height !== height) {
      sample.width = frame.width = width;
      sample.height = frame.height = height;
      previous = null; rawPrevious = null; readable = true;
    }
    const elapsed = lastDraw ? Math.max(1, now - lastDraw) : 1000;
    let immediateBridge=force;
    lastDraw = now;
    try {
      sampleCtx.drawImage(video, source.x + source.width * settings.cropX / 100,
        source.y + source.height * settings.cropY / 100, cropW, cropH, 0, 0, width, height);
      if (readable) {
        let pixels;
        try { pixels = sampleCtx.getImageData(0, 0, width, height); }
        catch (error) {
          if (error.name !== 'SecurityError') throw error;
          readable = false;
          warning = 'La vidéo limite la lecture des pixels : halo direct, sans lissage ni noirs transparents.';
          detectedCrop = fullCrop; layout();
        }
        if (pixels) {
          const p = pixels.data;
          inspectBars(pixels, force);
          const sceneCut = settings.sceneCuts && renderer.sceneDifference(p, rawPrevious) > 48;
          if (sceneCut) sceneCutCount++;
          immediateBridge ||= sceneCut;
          rawPrevious = p.slice();
          const blend = force || sceneCut || !previous || !settings.smoothing ? 1 : 1 - Math.exp(-elapsed / settings.smoothing);
          if (!previous || previous.length !== p.length) previous = new Float32Array(p.length);
          for (let i = 0; i < p.length; i += 4) {
            // Smooth actual video pixels, then derive alpha: black never becomes an opaque backdrop.
            for (let c = 0; c < 3; c++) {
              previous[i+c] += (p[i+c] - previous[i+c]) * blend;
              p[i+c] = previous[i+c];
            }
            p[i+3] = settings.transparentBlacks ? Math.max(p[i], p[i+1], p[i+2]) : 255;
          }
          frameCtx.putImageData(pixels, 0, 0);
        }
      }
      if (!readable) { frameCtx.clearRect(0, 0, width, height); frameCtx.drawImage(sample, 0, 0); }
      frameReady = true; projectFrame(immediateBridge);
      rendered++;
    } catch (error) {
      warning = 'Images indisponibles pour cette vidéo (chargement ou contenu protégé).';
      ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0, 0, canvas.width, canvas.height); frameReady = false;
      copyTwitchFrame();
      zenBridge.clear();
    }
  }
  function scheduleFrame() {
    if (frameId !== null || !active || !video || video.paused || video.ended || settings.intensity === 0) return;
    const callback = (now) => {
      frameId = null;
      draw(now);
      scheduleFrame();
    };
    if (video.requestVideoFrameCallback) {
      frameKind = 'video'; frameId = video.requestVideoFrameCallback(callback);
    } else {
      frameKind = 'animation'; frameId = requestAnimationFrame(callback);
    }
  }
  const resize = new ResizeObserver(queueLayout);
  const modeObserver = new MutationObserver(queueLayout);
  const playerLayoutObserver = new MutationObserver(queueLayout);
  let watchedLayout = [];
  const videoEvents = ['play','pause','seeked','loadeddata','loadedmetadata','emptied','ended','resize'];
  function onVideoEvent(event) {
    if (event.type === 'emptied') { resetFrame(); stopFrames(); return; }
    if (event.type === 'loadedmetadata' || event.type === 'seeked') resetFrame();
    layout();
    if (video.paused || video.ended) stopFrames();
    draw(performance.now(), true); scheduleFrame();
  }
  function findVideo() {
    const next = site.isWatchPage() ? site.findVideo() : null;
    const watches = site.layoutNodes(next);
    if (watches.length !== watchedLayout.length || watches.some((node,index)=>node!==watchedLayout[index])) {
      modeObserver.disconnect();
      watchedLayout = watches;
      for (const watch of watches) modeObserver.observe(watch, { attributes:true, attributeFilter:site.layoutAttributes });
    }
    if (next !== video) {
      stopFrames();
      if (video) { videoEvents.forEach(e => video.removeEventListener(e, onVideoEvent)); resize.unobserve(video); }
      video = next; resetFrame();
      if (video) { videoEvents.forEach(e => video.addEventListener(e, onVideoEvent)); resize.observe(video); }
    }
    const key = location.pathname + location.search;
    if (sourceKey !== key) { sourceKey = key; resetFrame(); }
    layout(); scheduleFrame();
  }
  function status() {
    return { active, warning, enabled: settings.enabled, rendered, mode: mode(), site:site.id,
      zenTabsConnected:!!zenBridge.request(),
      projection: settings.projection, sceneCutCount, detectedCrop,
      video: !!video, paused: video?.paused ?? true,
      message: !settings.enabled ? 'Halo désactivé' : active ? `Synchronisé avec les images de ${site.name}` :
        !site.isWatchPage() ? `Ouvre ${site.id === 'twitch' ? 'un direct ou une rediffusion Twitch' : 'une vidéo YouTube'} pour voir le halo` : 'En attente d’un lecteur visible dans un mode autorisé' };
  }
  api.runtime.onMessage.addListener(message => {
    if (message?.type === 'halo-status') return Promise.resolve(status());
  });
  api.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !['halo','haloSeparateSites','haloYoutube','haloTwitch'].some(key => changes[key])) return;
    for (const key of ['halo','haloSeparateSites','haloYoutube','haloTwitch']) {
      if (changes[key]) storedSettings[key] = changes[key].newValue;
    }
    const old = settings;
    settings = resolveStorage(storedSettings, site.id);
    if (settings.cropX !== old.cropX || settings.cropY !== old.cropY || settings.autoBars !== old.autoBars) resetFrame();
    applyAppearance(); stopFrames(); findVideo(); draw(performance.now(), true); scheduleFrame();
  });
  document.addEventListener('yt-navigate-finish', findVideo, { signal });
  document.addEventListener('yt-page-data-updated', findVideo, { signal });
  document.addEventListener('fullscreenchange', () => { findVideo(); draw(performance.now(), true); }, { signal });
  document.addEventListener('visibilitychange', findVideo, { signal });
  window.addEventListener('resize', queueLayout, { signal, passive: true });
  window.addEventListener('scroll', queueLayout, { signal, passive: true, capture: true });
  window.addEventListener('popstate', findVideo, { signal });
  // A low-frequency fallback handles either site replacing its player during SPA navigation.
  const interval = setInterval(findVideo, 1000);
  window.addEventListener('pagehide', event => {
    clearPlayerCorners();
    clearTwitchChat();
    twitchSurfaces?.clear();
    zenBridge.clear();
    if (event.persisted) { deactivate(); return; }
    clearInterval(interval); stopFrames(); resize.disconnect(); modeObserver.disconnect(); abort.abort();
    zenBridge.destroy();
    if (layoutId) cancelAnimationFrame(layoutId);
    if (theaterResizeId) cancelAnimationFrame(theaterResizeId);
    if (video) videoEvents.forEach(e => video.removeEventListener(e, onVideoEvent));
    host.remove(); backdrop?.remove(); document.documentElement.removeAttribute('data-halo-active');
    document.documentElement.removeAttribute('data-halo-site');
  }, { signal });
  window.addEventListener('pageshow', findVideo, { signal });
  api.storage.local.get(['halo','haloSeparateSites','haloYoutube','haloTwitch']).then(result => {
    storedSettings = result; settings = resolveStorage(storedSettings, site.id);
    ready = true; applyAppearance(); findVideo();
  }).catch(() => { ready = true; warning = 'Réglages non accessibles : valeurs par défaut.'; applyAppearance(); findVideo(); });
})();
