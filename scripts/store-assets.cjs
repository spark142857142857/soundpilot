// Capture the installed extension in an isolated profile, then lay out store artwork.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.SOUNDPILOT_PLAYWRIGHT || 'playwright');
const { fs, path, root, fixtures, launch, play, pause, volume, popup } = require('../tests/helpers.cjs');
const out = path.join(root, 'store');
const captures = path.join(root, 'artifacts', 'store-captures');
const uri = (file, type = 'image/png') => `data:${type};base64,${fs.readFileSync(file).toString('base64')}`;
let fixture, browser, renderer;
const evidence = [];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function capture(worker, name) {
  const ui = await popup(browser.context, worker);
  await ui.screenshot({ path: path.join(captures, `${name}.png`) });
  await ui.close();
}
function wave(color, height, count = 25) {
  return `<svg viewBox="0 0 420 160" fill="none" xmlns="http://www.w3.org/2000/svg">${Array.from({ length: count }, (_, i) => {
    const size = height * (.25 + .75 * Math.sin((i / (count - 1)) * Math.PI) ** 2);
    return `<path d="M${12 + i * 16} ${80 - size / 2}v${size}" stroke="${color}" stroke-width="7" stroke-linecap="round"/>`;
  }).join('')}</svg>`;
}
function documentHtml(body, style = '') {
  return `<!doctype html><html lang="en"><meta charset="UTF-8"><style>
  *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden}body{font-family:"Segoe UI",Arial,sans-serif;color:#193e2d;background:#f3f5ed;-webkit-font-smoothing:antialiased}img{display:block} ${style}</style>${body}</html>`;
}
async function render(name, width, height, html, transparent = false) {
  const page = await renderer.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.setContent(html);
  await page.evaluate(() => Promise.all([...document.images].map(img => img.decode())));
  await page.screenshot({ path: path.join(out, name), omitBackground: transparent });
  await page.close();
  const bytes = fs.readFileSync(path.join(out, name));
  assert.equal(bytes.readUInt32BE(16), width);
  assert.equal(bytes.readUInt32BE(20), height);
  if (!transparent) assert.equal(bytes[25], 2, `${name} must be an opaque RGB PNG`);
  console.log(`${name}: ${width}×${height}`);
}
(async () => {
  fs.mkdirSync(captures, { recursive: true });
  fs.mkdirSync(path.join(out, 'screenshots'), { recursive: true });
  fixture = await fixtures(); browser = await launch();
  const worker = await browser.install();
  const music = await browser.context.newPage(), video = await browser.context.newPage();
  await music.goto(fixture.origins[0] + '/music'); await video.goto(fixture.origins[1] + '/video');
  await play(music); await play(video);
  evidence.push({ scene: 'automatic-priority', music: await volume(music, .1), video: await volume(video, .6) });
  await capture(worker, '01-priority');
  const adjust = await popup(browser.context, worker);
  await adjust.locator('#percent').fill('50'); await volume(music, .2);
  await adjust.screenshot({ path: path.join(captures, '02-volume.png') }); await adjust.close();
  evidence.push({ scene: 'adjustable-ratio', music: await volume(music, .2), video: await volume(video, .6) });
  const reset = await popup(browser.context, worker);
  await reset.getByRole('button', { name: 'Reset to 25%' }).click(); await reset.close();
  await pause(video); await volume(music, .4); await delay(500);
  evidence.push({ scene: 'recovery', music: await volume(music, .4), video: await volume(video, .6) });
  await capture(worker, '03-recovery');
  await browser.close(); browser = null; await fixture.close(); fixture = null;
  renderer = await chromium.launch({ ...(process.env.SOUNDPILOT_CHROME ? { executablePath: process.env.SOUNDPILOT_CHROME } : { channel: 'chrome' }), headless: true });
  const icon = uri(path.join(root, 'extension/icons/source.svg'), 'image/svg+xml');
  const scenes = [
    { file: '01-priority', number: '01', eyebrow: 'AUTOMATIC PRIORITY', title: 'Play something new.<br>Keep the rest quieter.', copy: 'Your newest play takes focus.<br>Other tabs keep playing at a lower volume.', value: '25<span>%</span>', detail: 'of the original volume, by default', footer: 'Music → video. Video → music. Same rules.' },
    { file: '02-volume', number: '02', eyebrow: 'MAKE IT YOURS', title: 'Your background.<br>Your volume.', copy: 'Choose any level from 0 to 100%.<br>Adjust it live from the extension popup.', value: '50<span>%</span>', detail: 'shown here · choose the level that suits you', footer: 'One slider. Saved locally. No account needed.' },
    { file: '03-recovery', number: '03', eyebrow: 'AUTOMATIC RECOVERY', title: 'Pause the video.<br>Bring the music back.', copy: 'The previous source returns to its original volume.<br>Paused media stays paused.', value: '↗', detail: 'back to the original volume', footer: 'Keeps working when the popup is closed.' }
  ];
  for (const scene of scenes) {
    const html = documentHtml(`<header><div class="brand"><img src="${icon}">SoundPilot</div><span>CHROME EXTENSION</span></header>
    <main><div class="eyebrow">${scene.eyebrow}</div><h1>${scene.title}</h1><p>${scene.copy}</p><div class="metric">${scene.value}</div><div class="detail">${scene.detail}</div><div class="footer">${scene.footer}</div></main>
    <div class="stage"><div class="wave">${wave('#c3d9b3', 110)}</div></div><img class="popup" src="${uri(path.join(captures, `${scene.file}.png`))}" alt="Actual SoundPilot popup">
    <div class="capture-note">Actual extension popup · Local demo tabs</div><div class="page-number">${scene.number} / 03</div>`, `
    header{position:absolute;left:64px;right:64px;top:42px;display:flex;align-items:center;justify-content:space-between}header>span{font-size:13px;letter-spacing:2px;color:#667665}.brand{display:flex;align-items:center;gap:12px;font-size:25px;font-weight:650;letter-spacing:-.8px}.brand img{width:38px;height:38px}
    main{position:absolute;left:64px;top:162px;z-index:2}.eyebrow{font-size:13px;letter-spacing:2px;color:#527454;font-weight:650}h1{font-size:47px;line-height:1.17;letter-spacing:-2px;font-weight:600;margin:20px 0 22px}main p{font-size:18px;color:#526657;line-height:1.65;margin:0}.metric{font-size:92px;font-weight:500;letter-spacing:-5px;line-height:1.1;margin-top:30px}.metric span{font-size:47px;margin-left:5px}.detail{font-size:15px;color:#526657;margin-top:9px}.footer{margin-top:48px;font-size:17px;color:#31593d}
    .stage{position:absolute;left:726px;top:136px;width:490px;height:586px;background:#dfe8d4;border-radius:26px;overflow:hidden}.wave{position:absolute;width:400px;bottom:14px;left:45px;opacity:.8}.popup{position:absolute;left:752px;top:166px;width:438px;border-radius:10px;box-shadow:0 20px 45px #24432e20;border:1px solid #d5ddcf}.capture-note{position:absolute;left:752px;top:742px;font-size:12px;color:#697a65}.page-number{position:absolute;left:64px;top:744px;font-size:12px;letter-spacing:2px;color:#697a65}
    `);
    await render(`screenshots/${scene.file}-1280x800.png`, 1280, 800, html);
  }
  await render('icon-128.png', 128, 128, documentHtml(`<img style="position:absolute;left:16px;top:16px;width:96px;height:96px" src="${icon}">`, 'html,body{background:transparent}'), true);
  await render('promo-small-440x280.png', 440, 280, documentHtml(`<div class="brand"><img src="${icon}"><span>SoundPilot</span></div><div class="quiet">${wave('#7eaa83', 32)}</div><div class="focus">${wave('#e6f2cc', 116)}</div>`, `body{background:#1c563e;color:#f0f6e9}.brand{position:absolute;top:32px;left:30px;display:flex;gap:14px;align-items:center;font-size:32px;font-weight:600;letter-spacing:-1px}.brand img{width:50px;height:50px}.quiet{position:absolute;left:22px;top:93px;width:184px}.focus{position:absolute;left:218px;top:94px;width:205px}`));
  await render('promo-marquee-1400x560.png', 1400, 560, documentHtml(`<div class="brand"><img src="${icon}">SoundPilot</div><h1>Your newest play<br>in focus.</h1><div class="quiet">${wave('#739e78', 26)}</div><div class="focus">${wave('#e6f2cc', 125)}</div>`, `body{background:#1c563e;color:#eff6e6}.brand{position:absolute;left:82px;top:66px;display:flex;align-items:center;gap:15px;font-size:30px;font-weight:600;letter-spacing:-1px}.brand img{width:48px;height:48px}h1{position:absolute;left:82px;top:157px;margin:0;font-size:66px;line-height:1.15;letter-spacing:-2px;font-weight:500}.quiet{position:absolute;left:688px;top:265px;width:220px}.focus{position:absolute;left:919px;top:114px;width:410px}`));
  fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
  fs.writeFileSync(path.join(root, 'artifacts/store-assets-evidence.json'), JSON.stringify({ capturedAt: new Date().toISOString(), version: JSON.parse(fs.readFileSync(path.join(root, 'extension/manifest.json'))).version, evidence }, null, 2) + '\n');
})().catch(error => { console.error(error); process.exitCode = 1; })
  .finally(async () => { if (browser) await browser.close(); if (fixture) await fixture.close(); if (renderer) await renderer.close(); });
