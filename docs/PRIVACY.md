# SoundPilot Privacy Policy

Applies to version 0.1.2. Last updated: October 29, 2026.

SoundPilot manages overlapping audio within Chrome. It has no backend, analytics SDK, account system, advertising, or audio recording. It does not send tab information, preferences, or media data to an external service.

## Local processing

- Tab identifiers, titles, site hostnames, sound/mute state, and frame identifiers select the focused source and provide popup status.
- Playback, mute, and volume state are read from accessible media elements. Original volume is held in the page controller for restoration.
- Recent page-input timing, volume-related key names, and control labels help distinguish direct playback and volume changes from automatic activity. Typed text and form values are not recorded. Input timing and labels are not sent to the background worker or an external service.

## Storage

- Local extension storage holds the automatic-control setting and background-volume percentage.
- Session extension storage temporarily holds current tab/frame state and playback priority for service-worker recovery.
- Page memory holds original volume and short-lived control bookkeeping.

Preferences remain until changed or the extension is uninstalled. Current tab/session state is replaced as tabs change and removed when tabs close or the browser session ends. Page-memory state ends when its document is destroyed. SoundPilot does not build a persistent browsing or interaction history. Uninstalling removes its extension storage; normal Chrome browser behavior and website storage are separate.

SoundPilot does not request Chrome's browsing-history permission. Websites and Chrome itself may independently process their own data.

## Permissions

- HTTP/HTTPS host access: read media state and adjust audio/video volume on ordinary sites and accessible frames.
- tabs: obtain titles, lifecycle, sound, and mute state.
- scripting: connect eligible pages already open at installation or activation.
- storage: keep preferences and recovery state locally.

No microphone, camera, tab-capture, or screen-capture permissions are requested.

## User controls

Auto volume stops control and restores controlled volume. Chrome provides site-access and incognito controls. Turn automatic control off before reloading or removing the extension: restoration cannot be guaranteed if Chrome abruptly terminates a script after it changed page state.

## Limited use and sharing

SoundPilot uses locally processed data only to manage overlapping media and display current status. It does not sell or transfer that data, use it for advertising or credit decisions, or make it available for human review. Its use of information received from Chrome APIs adheres to the Chrome Web Store User Data Policy, including the Limited Use requirements.

## Contact and changes

SoundPilot is maintained by [spark142857142857](https://github.com/spark142857142857). Questions and privacy requests can be submitted through [GitHub Issues](https://github.com/spark142857142857/soundpilot/issues). GitHub independently handles information you choose to submit there. Future changes to this policy will be published on this page with an updated date.

For implementation questions, open a repository issue. Do not include private account details or credentials in public reports.
