(() => {
  'use strict';
  const api = globalThis.browser;
  const { normalize, defaults, bounds, siteKeys } = globalThis.HaloSettings;
  const $ = id => document.getElementById(id);
  const storageKeys = ['halo','haloSeparateSites','haloYoutube','haloTwitch'];
  let shared = normalize(), profiles = { youtube:normalize(), twitch:normalize() };
  let profileStored = { youtube:false, twitch:false }, separate = false, selectedSite = 'youtube';
  let activeSite = null, tabId = null, edited = false, pendingWrite = null, writing = false;

  const controls = [
    ['light','spread','Étendue',' px',5], ['light','intensity','Intensité',' %',1],
    ['light','blur','Flou général',' px',1], ['dim','dim','Assombrissement',' %',1],
    ['player','playerRadius','Arrondi du lecteur',' px',1],
    ['chat','twitchChatOpacity','Opacité du chat',' %',1],
    ['zen-tabs','zenTabsIntensity','Intensité dans les onglets',' %',1],
    ['zen-tabs','zenTabsFade','Atténuation extérieure',' %',1],
    ['advanced','saturation','Saturation',' %',1], ['advanced','brightness','Luminosité',' %',1],
    ['advanced','feather','Fondu des bords',' %',1], ['advanced','smoothing','Lissage',' ms',10],
    ['direction','top','En haut',' %',5], ['direction','right','À droite',' %',5],
    ['direction','bottom','En bas',' %',5], ['direction','left','À gauche',' %',5],
    ['blur-direction','blurTop','Flou en haut',' %',5], ['blur-direction','blurRight','Flou à droite',' %',5],
    ['blur-direction','blurBottom','Flou en bas',' %',5], ['blur-direction','blurLeft','Flou à gauche',' %',5],
    ['crop','cropY','Retirer en haut et en bas',' %',1], ['crop','cropX','Retirer à gauche et à droite',' %',1],
    ['performance','fps','Cadence maximale',' images/s',1], ['performance','resolution','Résolution du halo',' px',32]
  ];
  const current = () => separate ? profiles[selectedSite] : shared;
  const currentKey = () => separate ? siteKeys[selectedSite] : 'halo';
  function withTimeout(promise, milliseconds) {
    let timer;
    return Promise.race([promise,new Promise((_,reject) => {timer=setTimeout(() => reject(new Error('Délai dépassé')),milliseconds);})])
      .finally(() => clearTimeout(timer));
  }
  function save(payload) {
    edited = true;
    pendingWrite = { ...pendingWrite, ...payload };
    $('saved').textContent = 'Enregistrement…';
    if (!writing) void flushWrites();
  }
  async function flushWrites() {
    writing = true;
    while (pendingWrite) {
      const payload = pendingWrite;
      pendingWrite = null;
      try {
        await api.storage.local.set(payload);
        $('saved').textContent = 'Réglages enregistrés';
      } catch {
        $('saved').textContent = 'Enregistrement impossible · réessaie';
      }
    }
    writing = false;
    void updateStatus();
  }
  function saveProfile() { save({ [currentKey()]: normalize(current()) }); }
  function reflect() {
    const settings = current();
    for (const [,key,,unit] of controls) {
      $(key).value = settings[key];
      $(key+'-value').textContent = settings[key]+unit;
    }
    for (const key of ['enabled','transparentBlacks','autoBars','sceneCuts','standard','theater','fullscreen','twitchChatGlass','zenTabs']) $(key).checked = settings[key];
    $('separateSites').checked = separate;
    $('site-tabs').hidden = !separate;
    document.querySelectorAll('[data-site]').forEach(button => {
      const active = button.dataset.site === selectedSite;
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',String(active));
    });
    $('profile-note').textContent = separate ?
      `Tu modifies uniquement ${selectedSite === 'youtube' ? 'YouTube' : 'Twitch'}.` :
      'Les modifications s’appliquent aux deux sites.';
    $('reset').textContent = separate ? `Réinitialiser ${selectedSite === 'youtube' ? 'YouTube' : 'Twitch'}` : 'Réinitialiser';
    $('twitch-section').hidden = separate && selectedSite !== 'twitch';
    $('twitchChatOpacity').disabled = !settings.twitchChatGlass;
    for (const key of ['zenTabsIntensity','zenTabsFade']) $(key).disabled = !settings.zenTabs;
    $('dimMode').value = settings.dimMode;
    $('projection').value = settings.projection;
    document.body.classList.toggle('disabled',!settings.enabled);
  }
  for (const [group,key,label,unit,step] of controls) {
    const row=document.createElement('div');row.className='control';
    const head=document.createElement('div');head.className='control-head';
    const caption=document.createElement('label');caption.htmlFor=key;caption.textContent=label;
    const output=document.createElement('output');output.id=key+'-value';output.htmlFor=key;
    const slider=document.createElement('input');slider.id=key;slider.type='range';
    [slider.min,slider.max]=bounds[key];slider.step=step;
    slider.addEventListener('input',() => {
      current()[key]=Number(slider.value);
      output.textContent=slider.value+unit;
      saveProfile();
    });
    head.append(caption,output);row.append(head,slider);$(group+'-controls').append(row);
  }
  for (const key of ['enabled','transparentBlacks','autoBars','sceneCuts','standard','theater','fullscreen','twitchChatGlass','zenTabs']) {
    $(key).addEventListener('change',() => {current()[key]=$(key).checked;reflect();saveProfile();});
  }
  for (const key of ['dimMode','projection']) $(key).addEventListener('change',() => {
    current()[key]=$(key).value;saveProfile();
  });
  $('transparent').addEventListener('click',() => {current().dim=0;reflect();saveProfile();});
  $('reset').addEventListener('click',() => {
    if (separate) profiles[selectedSite]=normalize(defaults);
    else shared=normalize(defaults);
    reflect();saveProfile();
  });
  $('reset-blur-directions').addEventListener('click',() => {
    Object.assign(current(),{blurTop:100,blurRight:100,blurBottom:100,blurLeft:100});reflect();saveProfile();
  });
  const presets = {
    soft:{spread:150,blur:80,intensity:45,saturation:105,brightness:105,feather:90,smoothing:160},
    cinema:{spread:220,blur:65,intensity:70,saturation:120,brightness:110,feather:85,smoothing:100},
    wide:{spread:380,blur:95,intensity:75,saturation:135,brightness:120,feather:95,smoothing:120}
  };
  document.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click',() => {
    Object.assign(current(),presets[button.dataset.preset]);reflect();saveProfile();
  }));
  $('separateSites').addEventListener('change',() => {
    separate=$('separateSites').checked;
    if (separate) for (const site of ['youtube','twitch']) {
      if (!profileStored[site]) profiles[site]=normalize(shared);
      profileStored[site]=true;
    }
    reflect();
    save(separate ? { haloSeparateSites:true,haloYoutube:normalize(profiles.youtube),haloTwitch:normalize(profiles.twitch) } :
      { haloSeparateSites:false });
  });
  document.querySelectorAll('[data-site]').forEach(button => button.addEventListener('click',() => {
    selectedSite=button.dataset.site;reflect();
  }));
  $('open-tab').addEventListener('click',async() => {
    try {await api.runtime.openOptionsPage();}
    catch { $('saved').textContent='Ouvre les options depuis la page des extensions.'; }
  });
  async function updateStatus() {
    try {
      if (tabId == null) {
        const [tab]=await withTimeout(api.tabs.query({active:true,currentWindow:true}),1200);
        tabId=tab?.id;
      }
      if (tabId == null) throw new Error('Aucun onglet');
      const state=await withTimeout(api.tabs.sendMessage(tabId,{type:'halo-status'}),1200);
      $('status').textContent=state.message;
      $('zen-tabs-status').textContent=state.zenTabsConnected ? 'Complément Zen connecté' : 'Complément Zen non connecté · à charger dans Sine';
      $('dot').classList.toggle('live',state.active);
      const messages=[state.warning].filter(Boolean);
      $('warning').textContent=messages.join(' ');$('warning').hidden=messages.length===0;
    } catch {
      $('zen-tabs-status').textContent='Nécessite Halo Tabs dans Sine.';
      $('status').textContent=current().enabled ? 'Ouvre une vidéo YouTube ou Twitch.' : 'Halo désactivé';
      $('dot').classList.remove('live');
    }
  }
  async function init() {
    reflect();
    void updateStatus();
    const tabPromise=withTimeout(api.tabs.query({active:true,currentWindow:true}),1200).then(([tab]) => {
      tabId=tab?.id;
      activeSite=/^https:\/\/www\.youtube\.com\//.test(tab?.url||'') ? 'youtube' :
        /^https:\/\/www\.twitch\.tv\//.test(tab?.url||'') ? 'twitch' : null;
    }).catch(() => {});
    try {
      const data=await withTimeout(api.storage.local.get(storageKeys),2000);
      if (!edited) {
        shared=normalize(data.halo);
        profileStored={youtube:!!data.haloYoutube,twitch:!!data.haloTwitch};
        profiles={youtube:normalize(data.haloYoutube||shared),twitch:normalize(data.haloTwitch||shared)};
        separate=data.haloSeparateSites===true;
        await tabPromise;
        selectedSite=activeSite||'youtube';
        reflect();
      }
    } catch { if (!edited) $('saved').textContent='Chargement impossible · réglages par défaut affichés'; }
  }
  void init();
})();
