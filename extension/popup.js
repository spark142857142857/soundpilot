const $ = id => document.getElementById(id);
const slider = $('percent'), toggle = $('enabled');
let port, dragging = false;

function showPercent(value) {
  slider.value = value;
  slider.style.setProperty('--fill', `${value}%`);
  $('value').replaceChildren(document.createTextNode(String(value)), Object.assign(document.createElement('span'), { textContent: '%' }));
  slider.setAttribute('aria-valuetext', `${value}% of original volume`);
  $('reset').disabled = value === 25;
}

function render(state) {
  toggle.checked = state.settings.enabled;
  document.body.classList.toggle('off', !state.settings.enabled);
  if (!dragging) showPercent(state.settings.percent);
  const focused = state.tabs.find(tab => tab.id === state.owner);
  $('focus-title').textContent = !state.settings.enabled ? 'Auto volume is off' : focused?.title || 'No audio playing';
  $('focus-title').title = focused?.title || '';
  $('focus-domain').textContent = !state.settings.enabled ? 'Your tabs keep their original volume.' : focused?.domain || 'Start playing something. We’ll take it from there.';
  const others = state.tabs.filter(tab => tab.id !== state.owner);
  $('count').textContent = others.length;
  $('tabs').replaceChildren(...others.map(tab => {
    const row = $('tab-row').content.firstElementChild.cloneNode(true);
    row.querySelector('.tab-title').textContent = tab.title;
    row.querySelector('.tab-title').title = `${tab.title} — ${tab.domain}`;
    const labels = {
      lowered: state.settings.percent === 100 ? 'At original volume' : `Lowered to ${state.settings.percent}%`,
      original: 'At original volume', manual: 'Using your volume setting',
      conflict: 'Player keeps changing volume', unsupported: "Can’t control audio", access: 'Site access needed'
    };
    row.querySelector('.tab-status').textContent = labels[tab.status] || 'At original volume';
    row.classList.toggle('exception', ['manual', 'conflict', 'unsupported', 'access'].includes(tab.status));
    return row;
  }));
  $('empty').hidden = others.length > 0;
  $('empty').textContent = !state.settings.enabled ? 'Turn on Auto volume to manage overlapping audio.' : 'Play audio in another tab to hear the difference.';
}

function send(message) {
  try { port.postMessage(message); }
  catch { $('notice').hidden = false; $('notice').textContent = 'Connection lost. Close and reopen SoundPilot.'; }
}

toggle.addEventListener('change', () => send({ type: 'SET_ENABLED', enabled: toggle.checked }));
slider.addEventListener('pointerdown', () => { dragging = true; });
slider.addEventListener('input', () => { const percent = Number(slider.value); showPercent(percent); send({ type: 'SET_PERCENT', percent }); });
slider.addEventListener('change', () => { dragging = false; });
slider.addEventListener('pointerup', () => { dragging = false; });
$('reset').addEventListener('click', () => { showPercent(25); send({ type: 'SET_PERCENT', percent: 25 }); });

try {
  port = chrome.runtime.connect({ name: 'soundpilot-popup' });
  port.onMessage.addListener(state => { if (state.type === 'STATE') render(state); });
  port.onDisconnect.addListener(() => {
    void chrome.runtime.lastError;
    $('notice').hidden = false;
    $('notice').textContent = 'Connection lost. Close and reopen SoundPilot.';
  });
} catch {
  $('focus-title').textContent = 'Open SoundPilot from Chrome';
  $('focus-domain').textContent = 'Use the extension icon in your toolbar.';
}
