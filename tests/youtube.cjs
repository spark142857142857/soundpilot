const assert = require('node:assert/strict');
const { path, root, launch, popup, writeResult } = require('./helpers.cjs');
let browser, version; const observations = [];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const pass = (id, evidence) => { observations.push({ id, status: 'pass', evidence }); console.log(id + ': pass'); };
async function ready(page) {
  await page.goto('https://www.youtube.com/watch?v=aqz-KE-bpKQ', { waitUntil: 'domcontentloaded' });
  await page.locator('video').first().waitFor({ timeout: 40000 });
  await page.waitForFunction(() => { const m = document.querySelector('video'); return m.readyState >= 2 && m.duration > 100; }, null, { timeout: 60000 });
  const consent = page.getByRole('button', { name: 'Reject all', exact: true });
  if (await consent.isVisible()) await consent.click();
  // Warm up each real player, then establish a paused baseline before testing order.
  await page.evaluate(async () => { const m = document.querySelector('video'); m.muted = false; await m.play(); });
  await delay(900); await page.evaluate(() => document.querySelector('video').pause());
  await delay(500);
}
async function play(page) {
  const button = page.locator('.ytp-play-button').first();
  const paused = await page.locator('video').first().evaluate(e => e.paused);
  if (paused) await button.click();
  await page.waitForFunction(() => !document.querySelector('video').paused);
}
async function pause(page) {
  if (!await page.locator('video').first().evaluate(e => e.paused)) await page.locator('.ytp-play-button').first().click();
  await page.waitForFunction(() => document.querySelector('video').paused);
}
async function snap(page) { return page.locator('video').first().evaluate(e => ({ volume: e.volume, paused: e.paused, time: e.currentTime, duration: e.duration })); }
async function expected(page, value) { await page.waitForFunction(value => Math.abs(document.querySelector('video').volume - value) < 1e-7, value, { timeout: 12000 }); return snap(page); }
(async () => {
  browser = await launch(); version = browser.context.browser().version(); const worker = await browser.install();
  const a = await browser.context.newPage(), b = await browser.context.newPage();
  await ready(a); await ready(b);
  await play(a); await delay(600); const baseA = (await snap(a)).volume;
  assert.ok(baseA > 0); await play(b); await delay(500); const baseB = (await snap(b)).volume;
  assert.ok(baseB > 0);
  pass('REAL_YOUTUBE_NEW_PLAY_AND_RECOVERY', { a: await expected(a, baseA * .25), b: await expected(b, baseB), restoredA: await (async () => { await pause(b); return expected(a, baseA); })() });
  await pause(a); await play(b); await play(a);
  pass('REAL_YOUTUBE_REVERSE_ORDER', { a: await expected(a, baseA), b: await expected(b, baseB * .25) });
  const ui = await popup(browser.context, worker);
  await ui.locator('#percent').fill('50'); await expected(b, baseB * .5);
  await ui.screenshot({ path: path.join(root, 'artifacts/popup-youtube.png') }); await ui.close();
  const initial = await snap(b); await delay(12000); const held = await expected(b, baseB * .5);
  assert.ok(held.time > initial.time + 5);
  pass('REAL_YOUTUBE_RATIO_50_HELD_WITH_POPUP_CLOSED', { initial, held });
  await a.close(); pass('REAL_YOUTUBE_CLOSE_RECOVERY', await expected(b, baseB));
  await b.close();
})().catch(error => { console.error(error); observations.push({ id: 'ERROR', status: 'fail', error: error.stack }); process.exitCode = 1; })
  .finally(async () => { writeResult('youtube-results.json', version, observations, { scope: 'Production MVP on two public YouTube tabs in an isolated signed-out profile. Prior logged-in Music prototype validation is recorded separately in research; this run does not verify final MVP in logged-in Music. Browser audio output is muted.' }); if (browser) await browser.close(); });
