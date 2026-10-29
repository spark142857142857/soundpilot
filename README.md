# SoundPilot

**Keep your newest play in focus.**

SoundPilot is a Chrome extension that lowers audio in other tabs when you start playing something new, then restores it when you're done. Music and video follow the same rules.

<img src="docs/images/popup.png" alt="SoundPilot popup with a focused playlist and another tab lowered to 25 percent" width="392">

## How it works

1. Start music in one tab.
2. Play a video in another. Your music drops to **25% of its original volume**.
3. Pause or close the video. The music returns to its original volume while continuing to play.

Change **Background volume** from 0–100%, or use **Reset to 25%**. Settings are saved locally. Closing the popup does not stop automatic control. Switching tabs alone does not change priority.

- General HTTP/HTTPS site support without site registration.
- Connected HTML audio/video, permitted frames, and discovered Shadow DOM players.
- Restores the most recently selected source still playing; never resumes paused media.
- Respects recognized manual volume changes and stops fighting persistent player volume conflicts.
- English toolbar popup. No floating page panel, account, API key, or backend.

## Install

Current version: **0.1.1**. The Chrome Web Store listing is not published yet.

1. Clone this repository or download and extract its source ZIP.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the **extension** directory containing `manifest.json`.
4. Open SoundPilot from Chrome's extension menu, or pin it to the toolbar.

Existing web tabs are connected where Chrome allows it. If a page does not connect, check site access and refresh the page. Incognito access requires a separate choice in Chrome.

Before reloading or removing the extension, turn **Auto volume off** to restore controlled volume. After updating, reload the extension and your media pages.

## Compatibility

SoundPilot controls accessible media elements, not the operating system's audio mixer. General site support does not guarantee every player is compatible.

- Detached audio, independent Web Audio graphs, restricted Chrome pages, and inaccessible frames may not be controllable.
- Direct play is inferred from recent page input. Ads, previews, automatic tracks, and OS media keys can behave differently.
- Volume is calculated from the media element's original value; the site's displayed slider can use a different scale.
- One-for-one player replacement with a copied lowered value preserves the original baseline. Complex or delayed replacement needs more testing.
- Volume changes are immediate. Fades are not implemented yet.

See [product scope](docs/PRD.md) and [validation coverage](docs/TESTING.md).

## Privacy and permissions

No analytics, remote service, or audio recording. Media state and tab information are processed locally. Preferences use local extension storage; current tab state uses temporary session storage for worker recovery.

| Permission | Purpose |
| --- | --- |
| HTTP/HTTPS host access | Find and adjust media on web pages and permitted frames |
| `tabs` | Tab titles, sound/mute state, and lifecycle for focus and popup status |
| `scripting` | Connect web pages already open at installation or activation |
| `storage` | Save settings and recover state after worker restarts |

Read the [privacy details](docs/PRIVACY.md).

## Development

Plain JavaScript, HTML, and CSS. No runtime dependencies or build step. Use Node.js 22+.

```sh
npm ci
npm run check
npm test
```

Browser tests use Playwright and an installed Google Chrome in a separate temporary profile.

```sh
npm run test:browser
npm run test:transitions
npm run test:youtube
```

The YouTube suite requires network access. Set `SOUNDPILOT_CHROME` to override the Chrome executable or `SOUNDPILOT_PLAYWRIGHT` to use an alternate Playwright module. Browser tests have been validated on Windows with Chrome 156.

On Windows, build the upload ZIP with:

```sh
npm run package
```

The ZIP contains only `extension/` contents, with `manifest.json` at its root. Generated packages, local research, and test output are Git-ignored. The screenshot above uses controlled test fixtures.

## Project layout

```text
extension/       Installable Manifest V3 extension
tests/           Policy, lifecycle, and browser integration tests
scripts/         Validation and Windows packaging scripts
docs/            Product scope, privacy, and test coverage
```
