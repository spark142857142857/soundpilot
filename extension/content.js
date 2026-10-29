(() => {
  if (globalThis.__soundpilot) { globalThis.__soundpilot.refresh(); return; }
  const tracked = new Map(), observed = new WeakSet();
  let port, reconnectTimer, heartbeat, scanTimer, factor = 1, enabled = true, stopped = false;
  let lastInput = -Infinity, lastVolumeInput = -Infinity, inputSerial = 0, claimedInput = 0, signature = '';
  const closeEnough = (a, b) => Math.abs(a - b) < 1e-7;

  function contextReady() {
    if (stopped) return false;
    try { if (chrome.runtime?.id) return true; } catch {}
    shutdown();
    return false;
  }

  function mediaState() {
    return [...tracked].filter(([element]) => element.isConnected).map(([element, state]) => ({
      playing: !element.paused && !element.ended && !element.muted && (state.base ?? element.volume) > 0 && !!(element.currentSrc || element.src || element.srcObject),
      controlled: state.base !== null && !state.reason,
      reason: state.reason
    }));
  }

  function write(element, state, target) {
    state.expected = target;
    if (!closeEnough(element.volume, target)) element.volume = target;
  }

  function restore(element, state) {
    if (state.base !== null && state.reason !== 'manual') write(element, state, state.base);
    state.base = null; state.reason = ''; state.retries = 0;
    clearTimeout(state.retryTimer);
  }

  function apply() {
    if (!contextReady()) return;
    for (const [element, state] of tracked) {
      if (!enabled || factor === 1 || element.paused || element.ended || element.muted) restore(element, state);
      else if (!state.reason) {
        state.base ??= element.volume;
        write(element, state, state.base * factor);
      }
    }
  }

  function report(claim = false, force = false) {
    if (!contextReady()) return;
    const media = mediaState(), next = JSON.stringify(media);
    if (port && (force || claim || next !== signature)) {
      signature = next;
      try { port.postMessage({ type: 'MEDIA', media, claim }); } catch { port = null; reconnect(); }
    } else if (!port && (claim || force || next !== signature || media.some(item => item.playing || item.controlled))) connect(claim);
    clearTimeout(heartbeat);
    if (media.some(item => item.playing || item.controlled)) heartbeat = setTimeout(() => report(false, true), 20000);
  }

  function reconnect() {
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => connect(), 200);
  }

  function connect(claim = false) {
    if (port || stopped) return;
    if (!contextReady()) return;
    try {
      port = chrome.runtime.connect({ name: 'soundpilot-media' });
      port.onMessage.addListener(message => {
        if (message.type !== 'CONTROL') return;
        factor = Math.max(0, Math.min(1, message.factor)); enabled = !!message.enabled;
        apply(); report();
      });
      port.onDisconnect.addListener(() => {
        try { void chrome.runtime.lastError; } catch {}
        port = null;
        if (contextReady() && mediaState().some(item => item.playing || item.controlled)) reconnect();
      });
      report(claim, true);
    } catch { shutdown(); }
  }

  function onInput(event) {
    if (!contextReady() || !event.isTrusted) return;
    lastInput = performance.now(); inputSerial++;
    const labels = event.composedPath().filter(node => node instanceof HTMLElement).map(node =>
      [node.getAttribute('aria-label'), node.getAttribute('title'), node.id, typeof node.className === 'string' ? node.className : ''].join(' ')).join(' ');
    const nativeControl = event.composedPath().some(node => node instanceof HTMLMediaElement && node.controls);
    const rangeInput = event.target instanceof HTMLInputElement && event.target.type === 'range';
    if (nativeControl || rangeInput || /volume|볼륨|음량|음소거|mute/i.test(labels) || (event.type === 'keydown' && ['ArrowUp', 'ArrowDown', 'm', 'M', 'AudioVolumeUp', 'AudioVolumeDown', 'AudioVolumeMute'].includes(event.key))) lastVolumeInput = performance.now();
  }
  for (const name of ['pointerdown', 'click', 'keydown', 'input', 'change']) document.addEventListener(name, onInput, true);

  function attach(element) {
    if (tracked.has(element)) return;
    const state = { base: null, expected: null, reason: '', retries: 0, retryStart: 0, retryTimer: null, muted: element.muted, listeners: [] };
    tracked.set(element, state);
    function listen(name, callback) { element.addEventListener(name, callback); state.listeners.push([name, callback]); }
    listen('play', () => {
      const claim = performance.now() - lastInput < 2000 && inputSerial > claimedInput;
      if (claim) claimedInput = inputSerial;
      // Apply before reporting so a new element in a background tab never compounds a prior baseline.
      apply(); report(claim);
    });
    for (const name of ['playing', 'pause', 'ended', 'emptied', 'loadedmetadata']) listen(name, () => { apply(); report(); });
    listen('volumechange', () => {
      const now = performance.now();
      if (state.base !== null && state.expected !== null && !closeEnough(element.volume, state.expected)) {
        if (now - lastVolumeInput < 900) {
          state.base = null; state.reason = 'manual'; clearTimeout(state.retryTimer);
        } else if (!state.reason) {
          if (now - state.retryStart > 2000) { state.retryStart = now; state.retries = 0; }
          state.retries++;
          if (state.retries > 3) state.reason = 'conflict';
          else {
            clearTimeout(state.retryTimer);
            state.retryTimer = setTimeout(() => { apply(); report(); }, 50);
          }
        }
      }
      // Muting must also release priority, even if the numeric volume did not change.
      if (state.muted !== element.muted) { state.muted = element.muted; apply(); }
      report();
    });
  }

  function discover(root) {
    if (!contextReady() || !root.querySelectorAll) return;
    if (root instanceof HTMLMediaElement) attach(root);
    const elements = root instanceof HTMLElement ? [root, ...root.querySelectorAll('*')] : root.querySelectorAll('*');
    for (const element of elements) {
      if (element instanceof HTMLMediaElement) attach(element);
      if (!(element instanceof HTMLElement)) continue;
      let shadow;
      try { shadow = chrome.dom?.openOrClosedShadowRoot(element) || element.shadowRoot; }
      catch (error) {
        // Reload can invalidate Chrome APIs before the port disconnect callback arrives.
        if (/Extension context invalidated/i.test(error?.message || '') || !contextReady()) { shutdown(); return; }
        throw error;
      }
      if (shadow && !observed.has(shadow)) { observe(shadow); discover(shadow); }
    }
  }

  function prune() {
    for (const [element, state] of tracked) if (!element.isConnected) {
      restore(element, state);
      for (const [name, callback] of state.listeners) element.removeEventListener(name, callback);
      tracked.delete(element);
    }
  }

  const observer = new MutationObserver(records => {
    if (!contextReady()) return;
    // A one-for-one player replacement may copy our temporary volume. Preserve its original baseline.
    // Aggregate records per parent because remove/insert may be separate mutations in the same task.
    const replacements = new Map();
    for (const record of records) {
      const group = replacements.get(record.target) || { removed: [], added: [] };
      group.removed.push(...record.removedNodes); group.added.push(...record.addedNodes);
      replacements.set(record.target, group);
    }
    for (const { removed, added } of replacements.values()) {
      if (removed.length !== 1 || added.length !== 1) continue;
      const previous = removed[0], next = added[0], state = tracked.get(previous);
      if (!(next instanceof HTMLMediaElement) || previous.tagName !== next.tagName || previous.isConnected || !next.isConnected || tracked.has(next)) continue;
      if (state?.base == null || state.reason || state.expected == null || !closeEnough(next.volume, state.expected)) continue;
      attach(next);
      const replacement = tracked.get(next);
      replacement.base = state.base; replacement.expected = state.expected;
    }
    for (const record of records) for (const node of record.addedNodes) if (node.nodeType === Node.ELEMENT_NODE) discover(node);
    if (stopped) return;
    clearTimeout(scanTimer);
    scanTimer = setTimeout(() => { prune(); apply(); report(); }, 60);
  });
  function observe(root) { if (!observed.has(root)) { observed.add(root); observer.observe(root, { childList: true, subtree: true }); } }

  // Media events cross open shadow boundaries. A trusted click also discovers newly attached closed roots.
  const refresh = () => { if (!stopped) { discover(document); prune(); apply(); report(); } };
  document.addEventListener('pointerdown', refresh, true);
  document.addEventListener('play', refresh, true);
  window.addEventListener('pageshow', refresh);
  const onPageHide = () => {
    for (const [element, state] of tracked) restore(element, state);
    const previous = port; port = null; previous?.disconnect();
  };
  window.addEventListener('pagehide', onPageHide);
  function shutdown() {
    if (stopped) return;
    stopped = true; clearTimeout(heartbeat); clearTimeout(reconnectTimer); clearTimeout(scanTimer); observer.disconnect();
    for (const [element, state] of tracked) {
      for (const [name, callback] of state.listeners) element.removeEventListener(name, callback);
      restore(element, state);
    }
    tracked.clear();
    for (const name of ['pointerdown', 'click', 'keydown', 'input', 'change']) document.removeEventListener(name, onInput, true);
    document.removeEventListener('pointerdown', refresh, true);
    document.removeEventListener('play', refresh, true);
    window.removeEventListener('pageshow', refresh);
    window.removeEventListener('pagehide', onPageHide);
    const previous = port; port = null; previous?.disconnect();
  }
  globalThis.__soundpilot = { refresh };
  observe(document); discover(document); connect();
})();
