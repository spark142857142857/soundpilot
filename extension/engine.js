export const defaults = Object.freeze({ enabled: true, percent: 25 });

export function cleanSettings(value = {}) {
  return {
    enabled: typeof value.enabled === 'boolean' ? value.enabled : defaults.enabled,
    percent: Number.isFinite(value.percent) ? Math.max(0, Math.min(100, Math.round(value.percent))) : defaults.percent
  };
}

export function isPlaying(tab) {
  return !tab.muted && Object.values(tab.frames).some(frame => frame.media.some(media => media.playing));
}

export function chooseOwner(tabs, enabled) {
  if (!enabled) return null;
  const candidates = Object.values(tabs).filter(isPlaying);
  candidates.sort((a, b) => b.order - a.order || a.created - b.created);
  return candidates[0]?.id ?? null;
}

export function factorFor(tab, owner, settings) {
  return settings.enabled && isPlaying(tab) && tab.id !== owner ? settings.percent / 100 : 1;
}

export function tabStatus(tab, owner, settings, now = Date.now()) {
  const media = Object.values(tab.frames).flatMap(frame => frame.media);
  const playing = isPlaying(tab);
  let status = 'idle';
  if (tab.muted) status = 'muted';
  else if (media.some(item => item.playing && item.reason === 'conflict')) status = 'conflict';
  else if (media.some(item => item.playing && item.reason === 'manual')) status = 'manual';
  else if (playing) status = !settings.enabled || tab.id === owner ? 'original' : 'lowered';
  else if (tab.audible && !(tab.quietUntil > now)) status = tab.accessAllowed === false ? 'access' :
    (Object.keys(tab.frames).length || tab.accessAllowed === true) ? 'unsupported' : 'access';
  return { id: tab.id, title: tab.title, domain: tab.domain, playing, status };
}
