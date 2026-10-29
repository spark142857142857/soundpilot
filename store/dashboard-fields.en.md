# Chrome Web Store fields

Reference fields for SoundPilot 0.1.2, submitted for Chrome Web Store review on October 29, 2026. Approval is pending. For future submissions, copy only the relevant field value, not this document's headings, and update the values to match the build.

## Store listing

| Field | Value |
| --- | --- |
| Name | SoundPilot (from the manifest) |
| Summary | Keep your newest play in focus. Automatically lower other tabs and restore their volume when you're done. (from the manifest) |
| Detailed description | Paste the full contents of [listing.en.txt](listing.en.txt) |
| Language | English |
| Category | Functionality & UI |
| Homepage | https://github.com/spark142857142857/soundpilot |
| Support URL | https://github.com/spark142857142857/soundpilot/issues |
| Privacy policy URL | https://github.com/spark142857142857/soundpilot/blob/main/docs/PRIVACY.md |
| Mature content | No |
| Promotional video | Leave empty; none is required for this package |

## Single purpose

Automatically manage overlapping audio in Chrome: the media a user most recently starts takes priority, other playing sources use a user-selected percentage of their original volume, and the previous still-playing source recovers its original volume when priority ends.

## Permission justifications

### Host access: http://*/* and https://*/*

SoundPilot automatically finds accessible HTML audio/video on ordinary websites and permitted frames, detects playback and volume changes, and adjusts media volume. Broad host access is needed because the user can play media on any site, including embedded players on different origins; the extension is not restricted to a site allowlist. Access limited to the current active tab would not allow simultaneous automatic control of background tabs. Page access is used for this media feature, not for advertising or remote collection.

### tabs

Read current tab titles and site URLs/hostnames to identify playback sources in the popup, inspect tab sound/mute state, and handle tab updates and closure so volume priority and recovery stay correct. The extension uses current tab state locally; it does not build a persistent browsing history or transmit tab information.

### scripting

Connect the bundled media controller to eligible tabs and frames already open when SoundPilot is installed, starts, or automatic control is enabled. Static content scripts cover new documents, while scripting lets existing media pages participate without requiring every tab to be reopened. No remote scripts are injected.

### storage

Save Auto volume and the background-volume percentage in local extension storage. Keep temporary current tab/frame state and playback priority in session storage so the Manifest V3 service worker can recover after restarting. No cloud sync or external database is used.

## Remote code

Select **No, I am not using remote code**.

All extension JavaScript and UI assets are included in the uploaded ZIP. There are no external scripts, executable downloads, eval-based code loading, or remote services. Media loaded by websites is not extension code.

## Data usage disclosure

Local-only processing still needs disclosure. Based on the current code, select these categories to disclose data handled for the feature:

| Category | Local handling |
| --- | --- |
| Web history | Current tab URLs/hostnames and tab lifecycle identify media sources. There is no persistent navigation history. |
| Website content | Current tab titles, media playback/mute/volume state, and transient control labels identify and control players. Media audio/video is not recorded or uploaded. |
| User activity | Recent page-input timing and checks for volume-related keys/controls distinguish direct playback and manual volume changes. Typed text, form values, and a keystroke/click history are not recorded. |

The mapping above describes the implementation, including local access; it is not an assertion of Google approval. If the dashboard uses different labels or explanatory wording, compare those definitions with this table before submitting. Do not choose “no data handled” solely because the extension has no server.

Other categories are not intentionally collected by this build. Certify the three limited-use statements: no data sale or transfer beyond permitted uses, no use unrelated to the single purpose, and no use for creditworthiness or lending. The [privacy policy](../docs/PRIVACY.md) explains local processing, retention, deletion, and contact details.

## Distribution and account fields

Suggested listing visibility: Public. Suggested price: Free. The extension has no payment or subscription functionality. Select the countries/regions you intend to serve.

Developer contact email, account verification, and any publisher/trader declarations must use the account owner's actual details in the dashboard. They are not embedded in these public files. Do not claim a verified official domain unless it is already verified in your publisher account.

## Review instructions

Paste [reviewer-notes.en.txt](reviewer-notes.en.txt) into test instructions. No extension login or test credentials are needed. The public YouTube URL there is a convenient reproducible example, not a requirement to use SoundPilot.
