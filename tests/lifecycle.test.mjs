import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { tabStatus } from '../extension/engine.js';

test('invalidated extension releases volume and removes every media callback', () => {
  class Element extends EventTarget {
    querySelectorAll() { return []; }
    getAttribute() { return null; }
  }
  class Media extends Element {
    volume = .4; paused = false; ended = false; muted = false; isConnected = true; currentSrc = 'test.wav';
  }
  const media = new Media(), document = new Element(), window = new EventTarget();
  document.querySelectorAll = () => [media];
  let control, disconnect;
  const port = { postMessage() {}, disconnect() {}, onMessage: { addListener(fn) { control = fn; } }, onDisconnect: { addListener(fn) { disconnect = fn; } } };
  const chrome = { runtime: { id: 'test', connect: () => port }, dom: { openOrClosedShadowRoot: () => null } };
  const context = { document, window, chrome, HTMLElement: Element, HTMLMediaElement: Media, HTMLInputElement: class extends Element {},
    MutationObserver: class { observe() {} disconnect() {} }, Node: { ELEMENT_NODE: 1 }, performance,
    setTimeout: () => 1, clearTimeout() {} };
  vm.runInNewContext(fs.readFileSync(new URL('../extension/content.js', import.meta.url), 'utf8'), context);
  control({ type: 'CONTROL', factor: .25, enabled: true });
  assert.equal(media.volume, .1);
  chrome.runtime.id = undefined; disconnect();
  assert.equal(media.volume, .4, 'Original volume is restored on invalidation');
  media.dispatchEvent(new Event('play'));
  assert.equal(media.volume, .4, 'An old play listener must never lower audio again');
  media.muted = true; media.dispatchEvent(new Event('volumechange'));
  media.muted = false; media.dispatchEvent(new Event('volumechange'));
  assert.equal(media.volume, .4);
});

test('recently paused media is not labelled unsupported while Chrome audible catches up', () => {
  const tab = { id: 1, frames: { 0: { media: [{ playing: false }] } }, muted: false, audible: true, accessAllowed: true, quietUntil: 4000 };
  assert.equal(tabStatus(tab, null, { enabled: true }, 1500).status, 'idle');
  assert.equal(tabStatus(tab, null, { enabled: true }, 5000).status, 'unsupported', 'Persistent untracked audio must still be reported');
});
