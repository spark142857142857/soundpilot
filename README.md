# SoundPilot

[![Checks](https://github.com/spark142857142857/soundpilot/actions/workflows/check.yml/badge.svg)](https://github.com/spark142857142857/soundpilot/actions/workflows/check.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

English | [한국어](README.ko.md)

A Chrome extension that lowers other tabs when you start playing music or video, then restores their volume when you're done. Written in plain JavaScript, with no runtime dependencies.

<p align="center">
  <img src="docs/images/popup.png" alt="SoundPilot popup with a focused playlist and another tab lowered to 25 percent" width="392">
</p>

## Highlights

- **Automatic priority.** The media you most recently play takes focus. Music and video follow the same rules.
- **Adjustable background volume.** Keep other players at 25% of their original volume by default, or choose any value from 0–100%.
- **Automatic recovery.** Pause, finish, or close the focused source to restore the most recent source still playing. Paused media stays paused.
- **General site support.** Works with accessible HTML audio and video across HTTP/HTTPS sites, including permitted frames and discovered Shadow DOM players. See [compatibility](#compatibility).
- **One toolbar popup.** Change settings and see active tabs in an English popup. Automatic control keeps working when you close it.
- **Local operation.** No account, API key, backend, analytics, or audio recording.

## Installation

Requires **Google Chrome 120+**. The Chrome Web Store listing is not published yet; install from source for now. Node.js is only needed for development.

```sh
git clone https://github.com/spark142857142857/soundpilot.git
```

You can also [download the source ZIP](https://github.com/spark142857142857/soundpilot/archive/refs/heads/main.zip) and extract it.

1. Open `chrome://extensions` and enable **Developer mode**.
2. Click **Load unpacked** and select the repository's **extension** directory, which contains `manifest.json`.
3. Open SoundPilot from Chrome's extension menu, or pin it to the toolbar.

Existing web tabs connect where Chrome allows it. If a page does not connect, check site access and refresh it. Incognito access requires a separate choice in Chrome.

Before updating, reloading, or removing SoundPilot, turn **Auto volume** off to restore controlled volumes. After updating, reload the extension and your media pages.

## Usage

1. Start music in one tab.
2. Play a video in another. The music drops to **25% of its original volume**.
3. Pause or close the video. The music returns to its original volume while continuing to play.

The same sequence works in reverse: start music while a video is playing, and the video becomes the background source. Switching tabs alone does not change priority.

Click the extension icon to adjust **Background volume** from 0–100%, use **Reset to 25%**, or toggle **Auto volume**. Settings are saved locally. Recognized manual volume changes take precedence for the current overlap; SoundPilot also stops repeatedly overriding a player that rejects its adjustments.

## Documentation

- [Product scope](docs/PRD.md) — behavior, architecture, and planned improvements.
- [Validation coverage](docs/TESTING.md) — tested scenarios, commands, and remaining gaps.
- [Privacy and permissions](docs/PRIVACY.md) — local data handling and permission details.

## Compatibility

SoundPilot adjusts accessible media elements in web pages. It does not control system audio, and some players cannot be controlled.

- Detached audio, independent Web Audio output, restricted Chrome pages, and inaccessible frames are outside the common control path.
- Direct play is inferred from recent page input. Ads, previews, automatic tracks, and OS media keys can behave differently.
- The background ratio uses the media element's original volume. A site's visible slider may use a different scale.
- Volume changes are immediate; fades are not implemented. Complex or delayed player replacement needs more testing.

Public YouTube and local browser scenarios have been tested. Earlier prototypes were also tested with signed-in YouTube Music; this does not establish full coverage of the current version there. CHZZK and arbitrary community players have not received complete site-specific validation. See the [test report](docs/TESTING.md).

## Privacy and permissions

Media state and tab information are processed locally. Preferences use local extension storage; temporary session storage helps recover current tab state after worker restarts.

| Permission | Purpose |
| --- | --- |
| HTTP/HTTPS host access | Find and adjust media on web pages and permitted frames |
| `tabs` | Read tab titles, sound/mute state, and lifecycle for priority and popup status |
| `scripting` | Connect web pages already open at installation or activation |
| `storage` | Save settings and recover state after worker restarts |

## Development

The extension uses JavaScript, HTML, and CSS with no build step. Use **Node.js 22+** to run the checks:

```sh
cd soundpilot
npm ci
npm run check
npm test
```

Browser tests require an installed Google Chrome. Playwright runs them in a separate temporary profile:

```sh
npm run test:browser
npm run test:transitions
npm run test:reload
npm run test:youtube
```

The YouTube suite requires network access. Set `SOUNDPILOT_CHROME` to override the Chrome executable or `SOUNDPILOT_PLAYWRIGHT` to use an alternate Playwright module. Browser tests have been validated on Windows with Chrome 156. CI runs static checks and unit tests.

On **Windows**, create an upload ZIP with `npm run package`. It contains the contents of `extension/` and the MIT license, with `manifest.json` at its root. Store materials and dashboard instructions are in [store/](store/README.md). Generated packages, local research, and test output are Git-ignored. The screenshot above uses controlled test fixtures.

## Contributing

Bug reports and pull requests are welcome. For playback issues, include the site, Chrome version, playback order, and steps to reproduce. Run `npm run check` and `npm test` before submitting a code change, plus the relevant browser suite when changing playback behavior.

## License

SoundPilot is licensed under the [MIT License](LICENSE).
