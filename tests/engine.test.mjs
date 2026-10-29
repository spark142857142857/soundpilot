import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanSettings, chooseOwner, factorFor, tabStatus } from '../extension/engine.js';
const tab = (id, order, playing = true) => ({ id, created: id, order, muted: false, frames: { 0: { media: [{ playing }] } } });
test('recovery skips stopped media and keeps the latest still-playing rank', () => {
  const tabs = { 1: tab(1, 1), 2: tab(2, 2, false), 3: tab(3, 3) };
  assert.equal(chooseOwner(tabs, true), 3);
  tabs[3].frames[0].media[0].playing = false;
  assert.equal(chooseOwner(tabs, true), 1);
  assert.equal(chooseOwner(tabs, false), null);
});
test('tab mute releases priority without changing playback', () => {
  const tabs = { 1: tab(1, 1), 2: tab(2, 2) };
  tabs[2].muted = true;
  assert.equal(chooseOwner(tabs, true), 1);
  assert.equal(tabs[2].frames[0].media[0].playing, true);
  assert.equal(factorFor(tabs[2], 1, { enabled: true, percent: 25 }), 1);
});
test('ratio supports zero, full volume and validated persisted settings', () => {
  assert.deepEqual(cleanSettings(), { enabled: true, percent: 25 });
  assert.deepEqual(cleanSettings({ enabled: false, percent: 101 }), { enabled: false, percent: 100 });
  assert.equal(cleanSettings({ percent: NaN }).percent, 25);
  for (const percent of [0, 25, 50, 100]) assert.equal(factorFor(tab(1, 1), 2, { enabled: true, percent }), percent / 100);
});
test('manual, conflict, inaccessible and unsupported audio remain honest exceptions', () => {
  const t = tab(1, 1);
  t.frames[0].media[0].reason = 'manual';
  assert.equal(tabStatus(t, 2, { enabled: true }).status, 'manual');
  t.frames[0].media[0].reason = 'conflict';
  assert.equal(tabStatus(t, 2, { enabled: true }).status, 'conflict');
  t.frames[0].media = []; t.audible = true;
  assert.equal(tabStatus(t, 2, { enabled: true }).status, 'unsupported');
  t.frames = {};
  assert.equal(tabStatus(t, 2, { enabled: true }).status, 'access');
  t.accessAllowed = true;
  assert.equal(tabStatus(t, 2, { enabled: true }).status, 'unsupported');
  t.accessAllowed = false;
  assert.equal(tabStatus(t, 2, { enabled: true }).status, 'access');
});
