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
    ['light','spread','Reach',' px',1], ['light','intensity','Intensity',' %',.1],
    ['light','blur','General blur',' px',1], ['dim','dim','Dimming',' %',.1],
    ['player','playerRadius','Player corner radius',' px',1],
    ['chat','twitchChatOpacity','Chat opacity',' %',.1],
    ['zen-tabs','zenTabsIntensity','Tab light intensity',' %',.1],
    ['zen-tabs','zenTabsFade','Fade toward outer edge',' %',.1],
    ['advanced','saturation','Saturation',' %',.1], ['advanced','brightness','Brightness',' %',.1],
    ['advanced','feather','Edge feathering',' %',.1], ['advanced','smoothing','Smoothing',' ms',1],
    ['direction','top','Top',' %',.1], ['direction','right','Right',' %',.1],
    ['direction','bottom','Bottom',' %',.1], ['direction','left','Left',' %',.1],
    ['blur-direction','blurTop','Top blur',' %',.1], ['blur-direction','blurRight','Right blur',' %',.1],
    ['blur-direction','blurBottom','Bottom blur',' %',.1], ['blur-direction','blurLeft','Left blur',' %',.1],
    ['crop','cropY','Crop top and bottom',' %',.1], ['crop','cropX','Crop left and right',' %',.1],
    ['performance','fps','Maximum frame rate',' fps',1], ['performance','resolution','Halo resolution',' px',1]
  ];
  const current = () => separate ? profiles[selectedSite] : shared;
  const currentKey = () => separate ? siteKeys[selectedSite] : 'halo';
  function withTimeout(promise, milliseconds) {
    let timer;
    return Promise.race([promise,new Promise((_,reject) => {timer=setTimeout(() => reject(new Error('Timed out')),milliseconds);})])
      .finally(() => clearTimeout(timer));
  }
  function save(payload) {
    edited = true;
    pendingWrite = { ...pendingWrite, ...payload };
    $('saved').textContent = 'Saving…';
    if (!writing) void flushWrites();
  }
  async function flushWrites() {
    writing = true;
    while (pendingWrite) {
      const payload = pendingWrite;
      pendingWrite = null;
      try {
        await api.storage.local.set(payload);
        $('saved').textContent = 'Settings saved';
      } catch {
        $('saved').textContent = 'Could not save · try again';
      }
    }
    writing = false;
    void updateStatus();
  }
  function saveProfile() { save({ [currentKey()]: normalize(current()) }); }
  function reflect() {
    const settings = current();
    for (const [,key] of controls) {
      $(key).value = settings[key];
      $(key+'-number').value = settings[key];
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
      `Editing ${selectedSite === 'youtube' ? 'YouTube' : 'Twitch'} only.` :
      'Changes apply to both sites.';
    $('reset').textContent = separate ? `Reset ${selectedSite === 'youtube' ? 'YouTube' : 'Twitch'}` : 'Reset';
    $('twitch-section').hidden = separate && selectedSite !== 'twitch';
    for (const key of ['twitchChatOpacity']) for (const suffix of ['', '-number']) $(key+suffix).disabled = !settings.twitchChatGlass;
    for (const key of ['zenTabsIntensity','zenTabsFade']) for (const suffix of ['', '-number']) $(key+suffix).disabled = !settings.zenTabs;
    $('dimMode').value = settings.dimMode;
    $('projection').value = settings.projection;
    document.body.classList.toggle('disabled',!settings.enabled);
  }
  for (const [group,key,label,unit,step] of controls) {
    const row=document.createElement('div');row.className='control';
    const head=document.createElement('div');head.className='control-head';
    const caption=document.createElement('label');caption.htmlFor=key;caption.textContent=label;
    const numberWrap=document.createElement('div');numberWrap.className='number-field';
    const number=document.createElement('input');number.id=key+'-number';number.type='number';
    number.setAttribute('aria-label',`${label} — exact value`);
    number.inputMode=step<1?'decimal':'numeric';
    const unitText=document.createElement('span');unitText.textContent=unit.trim();unitText.setAttribute('aria-hidden','true');
    const slider=document.createElement('input');slider.id=key;slider.type='range';
    for (const input of [slider,number]) {
      [input.min,input.max]=bounds[key];input.step=step;
    }
    slider.addEventListener('input',() => {
      current()[key]=Number(slider.value);
      number.value=slider.value;
      saveProfile();
    });
    number.addEventListener('change',() => {
      const raw=number.valueAsNumber;
      if (!Number.isFinite(raw)) {number.value=current()[key];return;}
      const [minimum,maximum]=bounds[key];
      const clamped=Math.min(maximum,Math.max(minimum,raw));
      const value=step<1?Math.round(clamped*10)/10:Math.round(clamped);
      current()[key]=value;number.value=value;slider.value=value;
      saveProfile();
    });
    number.addEventListener('keydown',event => {if(event.key==='Enter')number.blur();});
    numberWrap.append(number,unitText);head.append(caption,numberWrap);row.append(head,slider);$(group+'-controls').append(row);
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
    catch { $('saved').textContent='Open options from the extensions page.'; }
  });
  async function updateStatus() {
    try {
      if (tabId == null) {
        const [tab]=await withTimeout(api.tabs.query({active:true,currentWindow:true}),1200);
        tabId=tab?.id;
      }
      if (tabId == null) throw new Error('No tab');
      const state=await withTimeout(api.tabs.sendMessage(tabId,{type:'halo-status'}),1200);
      $('status').textContent=state.message;
      $('zen-tabs-status').textContent=state.zenTabsConnected ? 'Halora Tabs connected' : 'Halora Tabs not connected · load it in Sine';
      $('dot').classList.toggle('live',state.active);
      const messages=[state.warning].filter(Boolean);
      $('warning').textContent=messages.join(' ');$('warning').hidden=messages.length===0;
    } catch {
      $('zen-tabs-status').textContent='Requires Halora Tabs in Sine.';
      $('status').textContent=current().enabled ? 'Open a YouTube or Twitch video.' : 'Halora disabled';
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
    } catch { if (!edited) $('saved').textContent='Could not load settings · showing defaults'; }
  }
  void init();
})();
