/* Clear only structural paths beneath Twitch's video and translucent chat.
   Preserve each owned inline property so native themes can be restored. */
(() => {
  'use strict';
  const marker = 'data-halo-twitch-underlay';
  const overlayMarker = 'data-halo-twitch-overlay';
  const properties = { 'background-color':'transparent', 'background-image':'none', 'box-shadow':'none' };
  const overlayProperties = { 'background-color':'transparent', 'background-image':'none' };
  function create(onChange) {
    const owned = new Map();
    const overlays = new Map();
    const observer = new MutationObserver(records => {
      if (records.some(record => record.type === 'childList' ||
        Object.entries(properties).some(([key,value]) => record.target.style.getPropertyValue(key) !== value ||
          record.target.style.getPropertyPriority(key) !== 'important'))) onChange();
    });
    const overlayObserver = new MutationObserver(records => {
      if (records.some(record => record.attributeName === 'class' ||
        Object.entries(overlayProperties).some(([key,value]) => record.target.style.getPropertyValue(key) !== value ||
          record.target.style.getPropertyPriority(key) !== 'important'))) onChange();
    });
    function restore(node, previous) {
      node.removeAttribute(marker);
      for (const [key,value] of Object.entries(properties)) {
        if (node.style.getPropertyValue(key) !== value || node.style.getPropertyPriority(key) !== 'important') continue;
        const saved = previous[key];
        if (saved.value) node.style.setProperty(key, saved.value, saved.priority);
        else node.style.removeProperty(key);
      }
    }
    function restoreOverlay(node, previous) {
      node.removeAttribute(overlayMarker);
      node.style.removeProperty('--halo-overlay-background');
      node.style.removeProperty('--halo-overlay-clip');
      for (const [key,value] of Object.entries(overlayProperties)) {
        if (node.style.getPropertyValue(key) !== value || node.style.getPropertyPriority(key) !== 'important') continue;
        const saved = previous[key];
        if (saved.value) node.style.setProperty(key,saved.value,saved.priority);
        else node.style.removeProperty(key);
      }
    }
    function syncOverlays(video, light, radius) {
      overlayObserver.disconnect();
      // Measure native backgrounds with our replacement removed. This also
      // preserves newer inline priorities and class-based theme changes.
      for (const [node,previous] of overlays) restoreOverlay(node,previous);
      overlays.clear();
      if (!light || !video?.isConnected || !video.videoWidth || !video.videoHeight) return;
      const player = video.closest('[data-a-target="video-player"]');
      if (!player) return;
      const style = getComputedStyle(video);
      const picture = globalThis.HaloProjection.videoMapping(video.getBoundingClientRect(),
        video.videoWidth,video.videoHeight,style.objectFit,style.objectPosition).rect;
      for (const node of player.querySelectorAll('.top-bar, [data-a-target="player-controls"], .player-controls')) {
        const box = node.getBoundingClientRect(), native = getComputedStyle(node);
        if (!box.width || !box.height || (native.backgroundImage === 'none' && native.backgroundColor === 'rgba(0, 0, 0, 0)')) continue;
        const background = native.background;
        const sx = node.offsetWidth/box.width, sy = node.offsetHeight/box.height;
        const clip = `inset(${(picture.top-box.top)*sy}px ${(box.right-picture.left-picture.width)*sx}px ${(box.bottom-picture.top-picture.height)*sy}px ${(picture.left-box.left)*sx}px round ${radius}px)`;
        const previous = {};
        for (const [key,value] of Object.entries(overlayProperties)) {
          previous[key] = {value:node.style.getPropertyValue(key),priority:node.style.getPropertyPriority(key)};
          node.style.setProperty(key,value,'important');
        }
        overlays.set(node,previous);
        node.style.setProperty('--halo-overlay-background',background);
        node.style.setProperty('--halo-overlay-clip',clip);
        node.setAttribute(overlayMarker,'');
        overlayObserver.observe(node,{attributes:true,attributeFilter:['style','class']});
      }
    }
    function sync({ video, light, chat, radius = 0 }) {
      observer.disconnect();
      const next = new Set();
      function path(start, stop) {
        for (let node=start; node && node !== stop && node !== document.body; node=node.parentElement) {
          next.add(node);
          if (node.id === 'root') break;
        }
      }
      if (light && video?.isConnected) {
        path(video);
        for (const placeholder of document.querySelectorAll('.channel-root__player-background')) path(placeholder);
      }
      if (chat) {
        for (const pane of document.querySelectorAll('.channel-root__right-column .stream-chat')) {
          path(pane.parentElement);
          // Stop before the pane itself: its opacity remains user-controlled.
          for (const node of pane.querySelectorAll('.chat-room__content, .chat-scrollable-area__message-container, [data-test-selector="chat-scrollable-area__message-container"]')) path(node,pane);
          for (const node of pane.querySelectorAll('.chat-input, .stream-chat-header')) path(node.parentElement,pane);
        }
      }
      for (const [node,previous] of owned) {
        if (!next.has(node)) { restore(node,previous); owned.delete(node); }
      }
      for (const node of next) {
        let previous = owned.get(node);
        if (!previous) { previous = {}; owned.set(node,previous); }
        for (const [key,value] of Object.entries(properties)) {
          const current = node.style.getPropertyValue(key), priority = node.style.getPropertyPriority(key);
          if (!previous[key] || current !== value || priority !== 'important') {
            // React or another page style may update a background while active.
            // Keep that latest native value, rather than restoring a stale one.
            previous[key] = { value:current, priority };
            node.style.setProperty(key,value,'important');
          }
        }
        node.setAttribute(marker,'');
        // New messages do not change the structural path. Avoid triggering a
        // layout for every chat message; watch only wrapper replacements.
        const messages = node.matches('.chat-scrollable-area__message-container, [data-test-selector="chat-scrollable-area__message-container"]');
        observer.observe(node,{attributes:true,attributeFilter:['style'],childList:!messages});
      }
      syncOverlays(video,light,radius);
    }
    function clear() {
      observer.disconnect();
      for (const [node,previous] of owned) restore(node,previous);
      owned.clear();
      overlayObserver.disconnect();
      for (const [node,previous] of overlays) restoreOverlay(node,previous);
      overlays.clear();
    }
    return Object.freeze({sync,clear});
  }
  globalThis.HaloTwitchSurfaces = Object.freeze({create});
})();
