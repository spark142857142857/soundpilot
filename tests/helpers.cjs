const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), http = require('node:http');
const { chromium } = require(process.env.SOUNDPILOT_PLAYWRIGHT || 'playwright');
const root = path.resolve(__dirname, '..');
const chromeOptions = process.env.SOUNDPILOT_CHROME ? { executablePath: process.env.SOUNDPILOT_CHROME } : { channel: 'chrome' };
function wave() {
  const rate = 16000, samples = rate * 2, tone = Buffer.alloc(44 + samples * 2);
  tone.write('RIFF'); tone.writeUInt32LE(tone.length - 8, 4); tone.write('WAVEfmt ', 8); tone.writeUInt32LE(16, 16);
  tone.writeUInt16LE(1, 20); tone.writeUInt16LE(1, 22); tone.writeUInt32LE(rate, 24); tone.writeUInt32LE(rate * 2, 28);
  tone.writeUInt16LE(2, 32); tone.writeUInt16LE(16, 34); tone.write('data', 36); tone.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) tone.writeInt16LE(Math.round(3000 * Math.sin(i * 2 * Math.PI * 440 / rate)), 44 + i * 2);
  return tone;
}
async function fixtures() {
  const tone = wave();
  const servers = [0, 1].map(() => http.createServer((req, res) => {
    if (req.url === '/tone.wav') { res.writeHead(200, { 'Content-Type': 'audio/wav' }); return res.end(tone); }
    const base = req.url.includes('music') ? .4 : req.url.includes('third') ? .8 : .6;
    const kind = req.url.includes('music') ? 'audio' : 'video';
    res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' });
    res.end(`<!doctype html><html lang="en"><title>${req.url.includes('music') ? 'Evening playlist' : req.url.includes('third') ? 'A third tab' : 'Weekend video'}</title><body style="font:16px system-ui;padding:32px"><h1>${kind} fixture</h1><button id="play">Play</button><button id="pause">Pause</button><button id="mute">Mute</button><input id="volume" aria-label="Volume" type="range" min="0" max="100" value="${base * 100}"><${kind} id="media" src="/tone.wav" loop></${kind}><script>const m=document.getElementById('media');m.volume=${base};document.getElementById('play').onclick=()=>m.play();document.getElementById('pause').onclick=()=>m.pause();document.getElementById('mute').onclick=()=>m.muted=!m.muted;document.getElementById('volume').oninput=e=>m.volume=Number(e.target.value)/100;</script></body></html>`);
  }));
  const origins = [];
  for (const server of servers) { await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); origins.push(`http://127.0.0.1:${server.address().port}`); }
  return { origins, close: () => Promise.all(servers.map(server => new Promise(resolve => server.close(resolve)))) };
}
async function launch() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'soundpilot-mvp-'));
  const context = await chromium.launchPersistentContext(path.join(temp, 'profile'), {
    ...chromeOptions, headless: true, ignoreDefaultArgs: ['--disable-extensions'],
    args: ['--enable-unsafe-extension-debugging'],
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36'
  });
  const cdp = await context.browser().newBrowserCDPSession();
  return {
    context, cdp, temp,
    install: async () => {
      await cdp.send('Extensions.loadUnpacked', { path: path.join(root, 'extension') });
      return context.serviceWorkers()[0] || context.waitForEvent('serviceworker');
    },
    close: async () => {
      await context.close();
      const resolved = path.resolve(temp);
      if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('soundpilot-mvp-')) throw Error('Unexpected cleanup target');
      fs.rmSync(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    }
  };
}
async function volume(page, expected, selector = '#media') {
  await page.waitForFunction(({ expected, selector }) => Math.abs(document.querySelector(selector).volume - expected) < 1e-7, { expected, selector }, { timeout: 10000 });
  return page.locator(selector).evaluate(e => ({ volume: e.volume, paused: e.paused, muted: e.muted, time: e.currentTime }));
}
const play = page => page.locator('#play').click();
const pause = page => page.locator('#pause').click();
async function popup(context, worker) {
  const active = context.pages().find(page => /^https?:/.test(page.url())) || context.pages()[0];
  if (active) await active.bringToFront();
  await worker.evaluate(() => chrome.action.openPopup());
  const browserSession = await context.browser().newBrowserCDPSession();
  let target;
  for (let i = 0; i < 30; i++) {
    target = (await browserSession.send('Target.getTargets')).targetInfos.find(t => t.url.endsWith('/popup.html'));
    if (target) break;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  if (!target) throw Error('Chrome action popup did not open');
  // Chrome's action popup is a real page target, excluded from Playwright's normal tab list.
  const { sessionId } = await browserSession.send('Target.attachToTarget', { targetId: target.targetId, flatten: false });
  let sequence = 0;
  const pending = new Map();
  browserSession.on('Target.receivedMessageFromTarget', event => {
    if (event.sessionId !== sessionId) return;
    const message = JSON.parse(event.message), item = pending.get(message.id);
    if (!item) return;
    pending.delete(message.id);
    message.error ? item.reject(Error(message.error.message)) : item.resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence; pending.set(id, { resolve, reject });
    browserSession.send('Target.sendMessageToTarget', { sessionId, message: JSON.stringify({ id, method, params }) }).catch(reject);
  });
  async function evaluate(expression) {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw Error(response.exceptionDetails.text);
    return response.result.value;
  }
  const element = selector => `document.querySelector(${JSON.stringify(selector)})`;
  function locator(selector) {
    const expression = element(selector);
    return {
      getAttribute: name => evaluate(`${expression}.getAttribute(${JSON.stringify(name)})`),
      innerText: () => evaluate(`${expression}.innerText`),
      inputValue: () => evaluate(`${expression}.value`),
      boundingBox: () => evaluate(`(()=>{const r=${expression}.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}})()`),
      fill: value => evaluate(`(()=>{const e=${expression};e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))})()`),
      click: async () => {
        const r = await locator(selector).boundingBox(), x = r.x + r.width / 2, y = r.y + r.height / 2;
        await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
        await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
      }
    };
  }
  const result = {
    locator,
    getByRole: (role, options) => locator(role === 'switch' ? 'label.toggle' : '#reset'),
    waitForFunction: async (fn, arg) => {
      for (let i = 0; i < 100; i++) {
        if (await evaluate(`(${fn.toString()})(${JSON.stringify(arg)})`)) return;
        await new Promise(resolve => setTimeout(resolve, 30));
      }
      throw Error('Popup condition timed out');
    },
    screenshot: async options => {
      await new Promise(resolve => setTimeout(resolve, 200));
      const size = await locator('body').boundingBox();
      const shot = await send('Page.captureScreenshot', { format: 'png', clip: { ...size, scale: 1 } });
      fs.mkdirSync(path.dirname(options.path), { recursive: true }); fs.writeFileSync(options.path, Buffer.from(shot.data, 'base64'));
    },
    close: async () => {
      // Closing the window lets Chrome dispose its action bubble as well as the target.
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }).catch(() => {});
      await evaluate('window.close()').catch(() => {});
      await new Promise(resolve => setTimeout(resolve, 500));
      await browserSession.detach();
    }
  };
  await result.waitForFunction(() => document.querySelector('#focus-title').textContent !== 'Connecting…');
  return result;
}
function writeResult(name, browserVersion, observations, extra = {}) {
  fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
  fs.writeFileSync(path.join(root, 'artifacts', name), JSON.stringify({ checkedAt: new Date().toISOString(), browserVersion, observations, ...extra }, null, 2) + '\n');
}
module.exports = { fs, path, root, fixtures, launch, volume, play, pause, popup, writeResult };
