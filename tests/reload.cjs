const assert = require('node:assert/strict');
const { fixtures, launch, play, pause, volume, popup, writeResult } = require('./helpers.cjs');
let fixture, browser, version;
const errors = [], observations = [];
(async () => {
  fixture = await fixtures(); browser = await launch(); version = browser.context.browser().version();
  const a = await browser.context.newPage(), b = await browser.context.newPage();
  for (const page of [a, b]) page.on('pageerror', error => errors.push(error.message));
  await a.goto(fixture.origins[0] + '/music'); await b.goto(fixture.origins[1] + '/video');
  const worker = await browser.install();
  await play(a); await play(b); await volume(a, .1);
  // Keep DOM callbacks queued while Chrome destroys the old extension context.
  for (const page of [a, b]) await page.evaluate(() => {
    window.churn = setInterval(() => {
      const host = document.createElement('div'); host.attachShadow({ mode: 'closed' }).innerHTML = '<span>Player update</span>';
      document.body.append(host); host.remove();
    }, 10);
  });
  await worker.evaluate(() => chrome.runtime.reload()).catch(error => {
    if (!/closed|destroyed/i.test(error.message)) throw error;
  });
  await new Promise(resolve => setTimeout(resolve, 1500));
  await new Promise(resolve => setTimeout(resolve, 1200));
  for (const page of [a, b]) await page.evaluate(() => clearInterval(window.churn));
  await pause(b); await volume(a, .4);
  assert.deepEqual(errors, [], 'Reload must not produce uncaught errors in existing media pages');
  observations.push({ id: 'REAL_RELOAD_WITH_QUEUED_SHADOW_DOM', status: 'pass', errors, restored: await volume(a, .4) });
  console.log('REAL_RELOAD_WITH_QUEUED_SHADOW_DOM: pass');
  // Headless Chrome can leave a self-reloaded unpacked extension disabled. Reinstall
  // in this disposable profile so the second phase checks a fresh extension context.
  const id = new URL(worker.url()).hostname;
  await browser.cdp.send('Extensions.uninstall', { id });
  const reloaded = await browser.install();
  // Reloading existing media pages is the documented update procedure.
  await a.reload(); await b.reload(); await play(a); await play(b); await volume(a, .1);
  const ui = await popup(browser.context, reloaded);
  assert.match(await ui.locator('#tabs').innerText(), /Lowered to 25%/);
  await ui.close(); await pause(b); await volume(a, .4);
  assert.deepEqual(errors, []);
  observations.push({ id: 'PLAYBACK_AND_RECOVERY_AFTER_EXTENSION_UPDATE', status: 'pass' });
  console.log('PLAYBACK_AND_RECOVERY_AFTER_EXTENSION_UPDATE: pass');
})().catch(error => { console.error(error); observations.push({ id: 'ERROR', status: 'fail', error: error.stack }); process.exitCode = 1; })
  .finally(async () => {
    writeResult('reload-results.json', version, observations);
    if (browser) await browser.close(); if (fixture) await fixture.close();
  });
