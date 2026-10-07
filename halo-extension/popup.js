(() => {
  'use strict';
  const api = globalThis.browser;
  const { normalize, defaults, bounds } = globalThis.HaloSettings;
  let settings = normalize(), writeQueue = Promise.resolve(), tabId;
  const $ = id => document.getElementById(id);
  const controls = [
    ['light','spread','Étendue', ' px',5], ['light','blur','Flou général',' px',1],
    ['light','intensity','Intensité',' %',1], ['light','saturation','Saturation',' %',1],
    ['dim','dim','Assombrissement',' %',1],
    ['player','playerRadius','Arrondi du lecteur',' px',1],
    ['chat','twitchChatOpacity','Opacité du fond du chat',' %',1],
    ['zen-tabs','zenTabsIntensity','Intensité dans les onglets',' %',1],
    ['zen-tabs','zenTabsFade','Atténuation vers le bord extérieur',' %',1],
    ['advanced','brightness','Luminosité du halo',' %',1], ['advanced','feather','Fondu des bords',' %',1],
    ['advanced','smoothing','Lissage des transitions',' ms',10],
    ['direction','top','En haut',' %',5], ['direction','right','À droite',' %',5],
    ['direction','bottom','En bas',' %',5], ['direction','left','À gauche',' %',5],
    ['blur-direction','blurTop','Flou en haut',' %',5], ['blur-direction','blurRight','Flou à droite',' %',5],
    ['blur-direction','blurBottom','Flou en bas',' %',5], ['blur-direction','blurLeft','Flou à gauche',' %',5],
    ['crop','cropY','Retirer en haut et en bas',' %',1], ['crop','cropX','Retirer à gauche et à droite',' %',1],
    ['performance','fps','Cadence maximale',' images/s',1], ['performance','resolution','Résolution du halo',' px',32]
  ];
  for (const [group,key,label,unit,step] of controls) {
    const row = document.createElement('div'); row.className = 'control';
    const head = document.createElement('div'); head.className = 'control-head';
    const caption = document.createElement('label'); caption.htmlFor = key; caption.textContent = label;
    const output = document.createElement('output'); output.id = key+'-value'; output.htmlFor = key;
    const slider = document.createElement('input'); slider.id = key; slider.type = 'range';
    [slider.min,slider.max] = bounds[key]; slider.step = step;
    slider.addEventListener('input', () => {
      settings[key] = Number(slider.value); output.textContent = slider.value + unit; save();
    });
    head.append(caption,output); row.append(head,slider); $(group+'-controls').append(row);
  }
  function reflect() {
    for (const [,key,,unit] of controls) { $(key).value = settings[key]; $(key+'-value').textContent = settings[key]+unit; }
    for (const key of ['enabled','transparentBlacks','autoBars','sceneCuts','standard','theater','fullscreen','twitchChatGlass','zenTabs']) $(key).checked = settings[key];
    for (const key of ['zenTabsIntensity','zenTabsFade']) $(key).disabled = !settings.zenTabs;
    $('twitchChatOpacity').disabled = !settings.twitchChatGlass;
    $('dimMode').value = settings.dimMode;
    $('projection').value = settings.projection;
    document.body.classList.toggle('disabled', !settings.enabled);
  }
  function save() {
    const value = normalize(settings);
    // Queue every write: closing the popup must not lose a pending debounce.
    $('saved').textContent = 'Enregistrement…';
    writeQueue = writeQueue.catch(() => {}).then(() => api.storage.local.set({ halo: value })).then(() => {
      $('saved').textContent = 'Réglages enregistrés'; updateStatus();
    }).catch(() => { $('saved').textContent = 'Échec de l’enregistrement. Rouvre le panneau et réessaie.'; });
    document.body.classList.toggle('disabled', !settings.enabled);
    $('twitchChatOpacity').disabled = !settings.twitchChatGlass;
    for (const key of ['zenTabsIntensity','zenTabsFade']) $(key).disabled = !settings.zenTabs;
  }
  for (const key of ['enabled','transparentBlacks','autoBars','sceneCuts','standard','theater','fullscreen','twitchChatGlass','zenTabs']) {
    $(key).addEventListener('change', () => { settings[key] = $(key).checked; save(); });
  }
  $('dimMode').addEventListener('change', () => { settings.dimMode = $('dimMode').value; save(); });
  $('projection').addEventListener('change', () => { settings.projection = $('projection').value; save(); });
  $('transparent').addEventListener('click', () => { settings.dim = 0; reflect(); save(); });
  $('reset').addEventListener('click', () => { settings = normalize(defaults); reflect(); save(); });
  $('reset-blur-directions').addEventListener('click', () => {
    Object.assign(settings,{blurTop:100,blurRight:100,blurBottom:100,blurLeft:100});reflect();save();
  });
  const presets = {
    soft: { spread:150, blur:80, intensity:45, saturation:105, brightness:105, feather:90, smoothing:160 },
    cinema: { spread:220, blur:65, intensity:70, saturation:120, brightness:110, feather:85, smoothing:100 },
    wide: { spread:380, blur:95, intensity:75, saturation:135, brightness:120, feather:95, smoothing:120 }
  };
  document.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => {
    // Presets deliberately preserve the user's darkness and transparency choices.
    Object.assign(settings,presets[button.dataset.preset]); reflect(); save();
  }));
  async function updateStatus() {
    try {
      if (tabId == null) {
        const [tab] = await api.tabs.query({ active:true,currentWindow:true }); tabId = tab?.id;
      }
      if (tabId == null) throw new Error('No tab');
      const state = await api.tabs.sendMessage(tabId,{ type:'halo-status' });
      $('status').textContent = state.message;
      $('zen-tabs-status').textContent = state.zenTabsConnected ? 'Complément Zen connecté' : 'Complément Zen non connecté · à charger dans Sine';
      $('dot').classList.toggle('live',state.active);
      const messages = [state.warning, state.conflict ? 'Ambient light semble aussi actif. Désactive-le pour éviter un double halo.' : ''].filter(Boolean);
      $('warning').textContent = messages.join(' '); $('warning').hidden = messages.length === 0;
    } catch {
      $('zen-tabs-status').textContent = 'Nécessite le complément Halo Tabs chargé dans Sine.';
      $('status').textContent = settings.enabled ? 'Ouvre YouTube ou Twitch, puis recharge la page si nécessaire.' : 'Halo désactivé';
      $('dot').classList.remove('live');
    }
  }
  async function init() {
    try { settings = normalize((await api.storage.local.get('halo')).halo); }
    catch { $('saved').textContent = 'Impossible de charger les réglages.'; }
    reflect(); updateStatus();
  }
  init();
})();
