/* Site-specific DOM integration; image capture and projection stay shared. */
(() => {
  'use strict';
  const twitch = location.hostname === 'www.twitch.tv';
  const reserved = new Set(['directory','search','settings','subscriptions','downloads','inventory','wallet',
    'drops','payments','turbo','prime','login','signup','activate','jobs','store','privacy','moderator','following']);
  function isWatchPage() {
    if (!twitch) return location.pathname === '/watch';
    if (/^\/videos\/\d+\/?$/.test(location.pathname)) return true;
    const match = /^\/([a-z\d_]+)\/?$/i.exec(location.pathname);
    return !!match && !reserved.has(match[1].toLowerCase()) && !!document.querySelector('.channel-root--watch');
  }
  function isMiniPlayer(video) {
    if (!twitch) return !!(video?.closest('ytd-miniplayer') || document.querySelector('ytd-watch-flexy[miniplayer]'));
    const container = video?.closest('.persistent-player');
    return !!container && /mini|floating|picture-in-picture/i.test(
      `${container.getAttribute('data-a-player-state') || ''} ${container.className}`);
  }
  function findVideo() {
    if (!twitch) return document.querySelector('ytd-watch-flexy:not([hidden]) #movie_player video.html5-main-video') ||
      document.querySelector('ytd-watch-flexy:not([hidden]) video.html5-main-video');
    if (!isWatchPage()) return null;
    // Never select background carousels, preview cards or an invisible ad player.
    return Array.from(document.querySelectorAll('.persistent-player [data-a-target="video-player"] video, .channel-page__video-player video'))
      .filter(video => {
        const box = video.getBoundingClientRect(), style = getComputedStyle(video);
        return box.width >= 40 && box.height >= 30 && style.visibility !== 'hidden' && style.display !== 'none' &&
          !video.closest('[hidden]') && !isMiniPlayer(video);
      }).sort((a,b) => b.getBoundingClientRect().width*b.getBoundingClientRect().height -
        a.getBoundingClientRect().width*a.getBoundingClientRect().height)[0] || null;
  }
  function mode() {
    if (document.fullscreenElement) return 'fullscreen';
    if (!twitch) return document.querySelector('ytd-watch-flexy[theater]') ? 'theater' : 'standard';
    const player = document.querySelector('.persistent-player');
    return document.querySelector('.channel-root--theatre-mode, .channel-root--theater-mode') ||
      /theatre|theater|studio/i.test(player?.getAttribute('data-a-player-state') || '') ? 'theater' : 'standard';
  }
  function player(video) {
    return twitch ? video?.closest('[data-a-target="video-player"], .video-player') : video?.closest('#movie_player');
  }
  function layoutNodes(video) {
    return twitch ? [document.querySelector('.channel-root'), video?.closest('.persistent-player'),
      video?.closest('.root-scrollable__wrapper')?.parentElement].filter(Boolean) :
      [video?.closest('ytd-watch-flexy')].filter(Boolean);
  }
  function fixedSurface(video) {
    const container = twitch && video?.closest('.persistent-player');
    return !document.fullscreenElement && !!container && getComputedStyle(container).position === 'fixed';
  }
  function surfaceParent(video) {
    return document.fullscreenElement || (fixedSurface(video) ? document.body :
      twitch ? video?.closest('.root-scrollable__wrapper') : null) || document.body;
  }
  function sizeSurface(host, parent, video) {
    if (fixedSurface(video)) {
      host.style.setProperty('top', '0px', 'important');
      host.style.setProperty('height', '100%', 'important');
      return;
    }
    if (twitch && parent !== document.body && !document.fullscreenElement) {
      // Twitch scrolls an inner wrapper, not the document. Derive the natural
      // extent from its content, excluding our own absolutely positioned layer.
      const top = parent.getBoundingClientRect().top;
      const height = Math.max(parent.clientHeight, ...Array.from(parent.children).filter(child=>child!==host)
        .map(child=>child.getBoundingClientRect().bottom-top));
      host.style.setProperty('top', '0px', 'important');
      host.style.setProperty('height', `${Math.ceil(height)}px`, 'important');
      return;
    }
    // YouTube can collapse its masthead margin through the body.
    const pageTop = parent === document.body ? Math.max(0,parent.getBoundingClientRect().top+scrollY+parent.clientTop) : 0;
    host.style.setProperty('top', `${-pageTop}px`, 'important');
    host.style.setProperty('height', `calc(100% + ${pageTop}px)`, 'important');
  }
  globalThis.HaloSite = Object.freeze({ id:twitch?'twitch':'youtube', name:twitch?'Twitch':'YouTube',
    isWatchPage,isMiniPlayer,findVideo,mode,player,layoutNodes,fixedSurface,surfaceParent,sizeSurface,
    layoutAttributes:twitch?['class','data-a-player-state','style']:['theater','miniplayer','hidden'] });
})();
