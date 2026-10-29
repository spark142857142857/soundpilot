# Product scope

## Problem

People keep music or video playing in one tab while starting media in another. They have to find the earlier player, lower it, and restore it afterwards. SoundPilot automates that sequence inside Chrome.

## MVP behavior

- The latest directly started source takes priority, regardless of content type.
- Other playing sources use their original volume multiplied by a global factor: 25% by default, adjustable from 0–100% in 1% steps.
- Pausing, ending, or closing the focused source restores the most recent source still playing. Paused media stays paused.
- Three or more sources follow the same order without repeated multiplication.
- A tab switch or popup interaction alone does not claim priority.
- Recognized manual volume changes take precedence for the current overlap. A later overlap can use the new value as its baseline.
- Turning automatic control off restores the volumes it changed.
- Existing tabs, new pages, frames, and multiple windows participate where permissions and media access allow.

## Interface and architecture

The toolbar action opens an English popup with Auto volume, Listening to, Background volume, Reset to 25%, and Other tabs. Content titles retain their original language. Page overlays and diagnostic dumps are not product UI.

Manifest V3 provides a service worker, per-frame content scripts, and local/session storage. There is no backend or paid API. Playback intent is inferred from recent trusted page input; the media event's isTrusted flag alone is insufficient.

Support is based on accessible HTML media rather than a site allowlist. DOM-detached audio, independent Web Audio output, restricted pages, and some embedded players are outside the current common control path. Detected failures must not be presented as success.

SoundPilot never resumes paused media. A 400ms recovery delay reduces switching during short playback interruptions. Buffering and quiet audio do not themselves release priority.

## Version 0.1.1 fixes

- Preserve the original baseline for detected one-for-one player replacement that copies the lowered volume.
- Remove media callbacks and stop control after extension-context invalidation.
- Allow Chrome's recent-audio indicator to settle after known playback stops before displaying an unsupported-audio state.

## Next work

1. Broaden real-site coverage: automatic next tracks, ads, native controls, and complex player replacement.
2. Validate the new recovery guidance on more real permission and volume-conflict cases.
3. Evaluate short fades with background throttling and manual-volume interactions.

Out of scope: system-wide audio, microphones, recording, equalizers, amplification, accounts, cloud sync, and AI content analysis.

## Version 0.1.2 submission preparation

- Handle Chrome API invalidation during DOM/Shadow DOM discovery even if the port disconnect callback has not arrived. Stop stale observers/listeners and restore controlled volume.
- Add a deterministic regression for that race and an isolated Chrome self-reload/reinstall check with concurrent Shadow DOM mutations.
- Improve popup secondary-text contrast and give recovery guidance for access, unsupported-player, and volume-conflict states.
- Add a public homepage URL, complete the privacy policy, prepare an English store listing and real-popup screenshots, and include the MIT license in verified upload ZIPs.
