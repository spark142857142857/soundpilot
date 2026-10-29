import { defaults, cleanSettings, isPlaying, chooseOwner, factorFor, tabStatus } from './engine.js';

let settings = { ...defaults }, tabs = {}, sequence = 0, owner = null;
let queue = Promise.resolve(), recoveryTimer;
const clients = new Map(), popups = new Set();
const quietTimers = new Map();
const webUrl = url => /^https?:\/\//.test(url || '');
const domain = url => { try { return new URL(url).hostname; } catch { return ''; } };
const hasHostAccess = url => {
  const parsed = new URL(url);
  return chrome.permissions.contains({ origins: [`${parsed.protocol}//${parsed.hostname}/*`] });
};

function remember(info) {
  const tab = tabs[info.id] ||= { id: info.id, created: ++sequence, order: 0, frames: {} };
  tab.title = info.title || tab.title || domain(info.url) || 'Untitled tab';
  tab.domain = domain(info.url) || tab.domain || '';
  tab.muted = info.mutedInfo?.muted ?? tab.muted ?? false;
  tab.audible = info.audible ?? tab.audible ?? false;
  return tab;
}

const ready = (async () => {
  settings = cleanSettings((await chrome.storage.local.get('settings')).settings);
  const saved = (await chrome.storage.session.get('focusState')).focusState;
  if (saved) {
    tabs = saved.tabs || {};
    sequence = saved.sequence || 0;
    owner = saved.owner ?? null;
  }
  const open = await chrome.tabs.query({});
  const ids = new Set(open.map(tab => tab.id));
  for (const id of Object.keys(tabs)) if (!ids.has(Number(id))) delete tabs[id];
  const webTabs = open.filter(info => webUrl(info.url));
  const access = await Promise.allSettled(webTabs.map(info => hasHostAccess(info.url)));
  for (const [index, info] of webTabs.entries()) {
    const tab = remember(info);
    if (access[index].status === 'fulfilled') tab.accessAllowed = access[index].value;
  }
})();

function enqueue(task) {
  const run = queue.then(() => ready).then(task);
  queue = run.catch(() => {});
  return run;
}

function snapshot() {
  const visible = Object.values(tabs).map(tab => tabStatus(tab, owner, settings))
    .filter(tab => tab.playing || !['idle', 'muted'].includes(tab.status));
  visible.sort((a, b) => Number(b.id === owner) - Number(a.id === owner) || a.id - b.id);
  return { type: 'STATE', settings, owner, tabs: visible };
}

function broadcast() {
  const state = snapshot();
  for (const port of popups) { try { port.postMessage(state); } catch { popups.delete(port); } }
}

function scheduleQuietEnd(tab) {
  clearTimeout(quietTimers.get(tab.id));
  quietTimers.delete(tab.id);
  if (tab.quietUntil > Date.now()) quietTimers.set(tab.id, setTimeout(() => enqueue(() => {
    quietTimers.delete(tab.id); broadcast();
  }), tab.quietUntil - Date.now() + 20));
}

function trackSilence(tab, wasPlaying) {
  if (isPlaying(tab)) tab.quietUntil = 0;
  else if (wasPlaying) tab.quietUntil = Date.now() + 3000;
  scheduleQuietEnd(tab);
}

async function persist() {
  await chrome.storage.session.set({ focusState: { tabs, sequence, owner } });
}

async function reconcile() {
  owner = chooseOwner(tabs, settings.enabled);
  for (const tab of Object.values(tabs)) {
    const factor = factorFor(tab, owner, settings);
    for (const [frameId, frame] of Object.entries(tab.frames)) {
      const client = clients.get(`${tab.id}:${frameId}`);
      const key = `${factor}:${settings.enabled}`;
      if (!client || client.documentId !== frame.documentId || client.applied === key) continue;
      try {
        client.port.postMessage({ type: 'CONTROL', factor, enabled: settings.enabled });
        client.applied = key;
      } catch { clients.delete(`${tab.id}:${frameId}`); }
    }
  }
  await persist();
  broadcast();
}

function recoverSoon() {
  clearTimeout(recoveryTimer);
  recoveryTimer = setTimeout(() => enqueue(reconcile), 400);
}

async function receiveMedia(message, sender, client) {
  if (clients.get(`${sender.tab.id}:${sender.frameId || 0}`) !== client) return;
  if (message.type !== 'MEDIA' || !Array.isArray(message.media)) return;
  const tab = tabs[sender.tab.id] || remember(sender.tab), frameId = sender.frameId || 0;
  const wasPlaying = isPlaying(tab);
  tab.accessAllowed = true;
  tab.frames[frameId] = { documentId: sender.documentId, media: message.media.slice(0, 100).map(item => ({
    playing: !!item.playing, controlled: !!item.controlled,
    reason: ['manual', 'conflict'].includes(item.reason) ? item.reason : ''
  })) };
  trackSilence(tab, wasPlaying);
  if (message.claim && isPlaying(tab)) tab.order = ++sequence;
  if (owner !== null && tabs[owner] && !isPlaying(tabs[owner]) && !message.claim) {
    recoverSoon(); await persist(); broadcast();
  } else { clearTimeout(recoveryTimer); await reconcile(); }
}

chrome.runtime.onConnect.addListener(port => {
  if (port.name === 'soundpilot-media' && port.sender?.tab) {
    const sender = port.sender, key = `${sender.tab.id}:${sender.frameId || 0}`;
    const client = { port, documentId: sender.documentId, applied: null };
    clients.set(key, client);
    port.onMessage.addListener(message => enqueue(() => receiveMedia(message, sender, client)));
    port.onDisconnect.addListener(() => enqueue(async () => {
      if (clients.get(key) !== client) return;
      clients.delete(key);
      const tab = tabs[sender.tab.id];
      const wasPlaying = tab && isPlaying(tab);
      if (tab?.frames[sender.frameId || 0]?.documentId === sender.documentId) delete tab.frames[sender.frameId || 0];
      if (tab) trackSilence(tab, wasPlaying);
      recoverSoon(); await persist(); broadcast();
    }));
  } else if (port.name === 'soundpilot-popup' && !port.sender?.tab) {
    popups.add(port);
    enqueue(() => { try { port.postMessage(snapshot()); } catch {} });
    port.onMessage.addListener(message => enqueue(async () => {
      if (message.type === 'SET_PERCENT' && Number.isFinite(message.percent)) settings.percent = cleanSettings({ percent: message.percent }).percent;
      else if (message.type === 'SET_ENABLED' && typeof message.enabled === 'boolean') settings.enabled = message.enabled;
      else return;
      clearTimeout(recoveryTimer);
      await chrome.storage.local.set({ settings });
      await reconcile();
      if (message.type === 'SET_ENABLED' && settings.enabled) await connectExisting();
    }));
    port.onDisconnect.addListener(() => popups.delete(port));
  }
});

chrome.tabs.onRemoved.addListener(id => enqueue(async () => {
  delete tabs[id];
  clearTimeout(quietTimers.get(id)); quietTimers.delete(id);
  for (const key of clients.keys()) if (key.startsWith(`${id}:`)) clients.delete(key);
  clearTimeout(recoveryTimer); await reconcile();
}));

chrome.tabs.onUpdated.addListener((id, change, info) => {
  if (!['title', 'url', 'audible', 'mutedInfo'].some(key => key in change)) return;
  enqueue(async () => {
    if (!webUrl(info.url) && !tabs[id]) return;
    const tab = remember(info);
    if (!webUrl(info.url)) { tab.frames = {}; tab.audible = false; }
    else if (change.url || (change.audible && !Object.keys(tab.frames).length)) {
      tab.accessAllowed = await hasHostAccess(info.url).catch(() => false);
    }
    await reconcile();
  });
});

async function connectExisting() {
  const open = await chrome.tabs.query({});
  await Promise.allSettled(open.filter(tab => webUrl(tab.url)).map(tab =>
    chrome.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, files: ['content.js'] })
  ));
}

chrome.runtime.onInstalled.addListener(() => enqueue(connectExisting));
chrome.runtime.onStartup.addListener(() => enqueue(connectExisting));

// Active documents reconnect after a worker restart; discard documents that no longer exist.
setTimeout(() => enqueue(async () => {
  for (const tab of Object.values(tabs)) {
    for (const frameId of Object.keys(tab.frames)) {
      if (!clients.has(`${tab.id}:${frameId}`)) delete tab.frames[frameId];
    }
    scheduleQuietEnd(tab);
  }
  await reconcile();
}), 1500);
