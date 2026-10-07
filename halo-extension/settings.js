/* Shared by the content script and the extension UI. No remote dependencies. */
(() => {
  'use strict';
  const defaults = Object.freeze({
    enabled: true, spread: 180, blur: 65, intensity: 65, saturation: 115,
    brightness: 110, feather: 85, smoothing: 60, dim: 0, dimMode: 'uniform',
    top: 100, right: 100, bottom: 100, left: 100, fps: 30, resolution: 256,
    blurTop: 100, blurRight: 100, blurBottom: 100, blurLeft: 100,
    playerRadius: 24,
    twitchChatGlass: true, twitchChatOpacity: 45,
    zenTabs: true, zenTabsIntensity: 100, zenTabsFade: 60,
    transparentBlacks: true, cropX: 0, cropY: 0,
    projection: 'edges', autoBars: true, sceneCuts: true,
    standard: true, theater: true, fullscreen: true
  });
  const bounds = Object.freeze({
    spread: [0, 6000], blur: [0, 160], intensity: [0, 100], saturation: [0, 250],
    brightness: [25, 200], feather: [10, 100], smoothing: [0, 800], dim: [0, 90],
    top: [0, 150], right: [0, 150], bottom: [0, 150], left: [0, 150],
    blurTop: [0, 200], blurRight: [0, 200], blurBottom: [0, 200], blurLeft: [0, 200],
    playerRadius: [0, 64],
    twitchChatOpacity: [0, 100],
    zenTabsIntensity: [0, 100], zenTabsFade: [0, 100],
    fps: [10, 60], resolution: [128, 512], cropX: [0, 20], cropY: [0, 20]
  });
  function normalize(value = {}) {
    const result = { ...defaults };
    if (!value || typeof value !== 'object') return result;
    for (const [key, fallback] of Object.entries(defaults)) {
      if (typeof fallback === 'boolean' && typeof value[key] === 'boolean') result[key] = value[key];
      else if (bounds[key] && typeof value[key] === 'number' && Number.isFinite(value[key])) {
        result[key] = Math.min(bounds[key][1], Math.max(bounds[key][0], value[key]));
      } else if (key === 'dimMode' && ['uniform', 'local'].includes(value[key])) result[key] = value[key];
      else if (key === 'projection' && ['edges', 'scaled'].includes(value[key])) result[key] = value[key];
    }
    return result;
  }
  function blurRadii(settings) {
    return ['blurTop','blurRight','blurBottom','blurLeft'].map(key => settings.blur*settings[key]/100);
  }
  globalThis.HaloSettings = Object.freeze({ defaults, bounds, normalize, blurRadii });
})();
