# SoundPilot privacy details

Applies to version 0.1.1. Last updated: October 29, 2026.

SoundPilot manages overlapping audio within Chrome. It has no backend, analytics SDK, account system, advertising, or audio recording. It does not send tab information, preferences, or media data to an external service.

## Local processing

- Tab identifiers, titles, site hostnames, sound/mute state, and frame identifiers select the focused source and provide popup status.
- Playback, mute, and volume state are read from accessible media elements. Original volume is held in the page controller for restoration.
- Recent page-input timing and control labels help distinguish direct playback and volume changes from automatic activity. They are not transmitted as an input or browsing history.

## Storage

- Local extension storage holds the automatic-control setting and background-volume percentage.
- Session extension storage temporarily holds current tab/frame state and playback priority for service-worker recovery.
- Page memory holds original volume and short-lived control bookkeeping.

SoundPilot does not request Chrome's browsing-history permission. Websites and Chrome itself may independently process their own data.

## Permissions

- HTTP/HTTPS host access: read media state and adjust audio/video volume on ordinary sites and accessible frames.
- tabs: obtain titles, lifecycle, sound, and mute state.
- scripting: connect eligible pages already open at installation or activation.
- storage: keep preferences and recovery state locally.

No microphone, camera, tab-capture, or screen-capture permissions are requested.

## User controls

Auto volume stops control and restores controlled volume. Chrome provides site-access and incognito controls. Turn automatic control off before reloading or removing the extension: restoration cannot be guaranteed if Chrome abruptly terminates a script after it changed page state.

For implementation questions, open a repository issue. Do not include private account details or credentials in public reports.
