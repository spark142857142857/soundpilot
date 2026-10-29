const assert = require('node:assert/strict');
const { fixtures, launch, volume, play, pause, writeResult } = require('./helpers.cjs');
let browser, fixture, version;
const observations = [];
function record(id, evidence) { observations.push({ id, status: 'pass', evidence }); console.log(id + ': pass'); }
(async () => {
  fixture = await fixtures(); browser = await launch(); version = browser.context.browser().version();
  await browser.install();
  const a = await browser.context.newPage(), b = await browser.context.newPage();
  await a.goto(fixture.origins[0] + '/music'); await b.goto(fixture.origins[1] + '/video');
  await play(a); await play(b); await volume(a, .1);
  // Let the explicit input window expire before simulating automatic track changes.
  await a.waitForTimeout(2100);
  await a.evaluate(async () => { const m = document.querySelector('#media'); m.load(); await m.play(); });
  await volume(a, .1); await pause(b); await volume(a, .4); await play(b); await volume(a, .1);
  record('REUSED_PLAYER_TRACK_RELOAD', await volume(a, .1));
  await a.evaluate(async () => {
    const old = document.querySelector('#media'), next = document.createElement('audio');
    next.id = 'media'; next.src = old.src; next.loop = true; next.volume = old.volume;
    old.replaceWith(next); old.pause(); await next.play();
  });
  await a.waitForTimeout(200);
  const copied = await a.locator('#media').evaluate(e => e.volume);
  assert.ok(Math.abs(copied - .1) < 1e-7, `Copied player volume must not be ducked twice: got ${copied}`);
  await pause(b); await volume(a, .4); await play(b); await volume(a, .1);
  record('REPLACEMENT_COPIED_VOLUME_AND_RESTORE', await volume(a, .1));
  await a.evaluate(async () => {
    const old = document.querySelector('#media'), next = document.createElement('audio');
    next.id = 'media'; next.src = old.src; next.loop = true; next.volume = .8;
    old.replaceWith(next); old.pause(); await next.play();
  });
  await volume(a, .2); await pause(b); await volume(a, .8);
  record('REPLACEMENT_DISTINCT_VOLUME_PRESERVED', await volume(a, .8));
})().catch(error => { console.error(error); observations.push({ id: 'ERROR', status: 'fail', error: error.message }); process.exitCode = 1; })
.finally(async () => { writeResult('transition-results.json', version, observations, { scope: 'Isolated local media fixtures, not the installed user-profile extension or real Music track changes.' }); if (browser) await browser.close(); if (fixture) await fixture.close(); });
