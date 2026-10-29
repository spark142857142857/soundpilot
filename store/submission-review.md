# Pre-submission review — 0.1.2

Reviewed on October 29, 2026. This is an implementation/package check, not a Chrome Web Store approval decision.

## Fixes included

- **Stale extension context:** a page can keep delivering DOM work after extension reload, before its port disconnect callback runs. The old discovery path called `chrome.dom.openOrClosedShadowRoot` without guarding that race. The new path handles invalidation, restores volumes, and stops stale observers/listeners. A deterministic regression failed before the change and passes afterwards; an actual isolated Chrome reload/reinstall scenario also passes.
- **Exception recovery:** popup rows now explain how to handle missing site access, incompatible audio, and a player that keeps resetting volume.
- **Readability:** secondary popup text has stronger contrast.
- **Distribution:** the upload ZIP includes the MIT license, a root-level manifest, and a SHA-256 companion. A public homepage and a complete local-data privacy policy are provided.

## Verification

| Check | Result |
| --- | --- |
| Manifest, JavaScript syntax, and icon checks | Pass |
| Policy/lifecycle | 7 passed |
| Local Chrome integration | 21 passed |
| Player transitions | 3 passed |
| Actual context reload and fresh-context recovery | 2 passed |
| Public YouTube | 4 passed |
| Store image generation | 3 real-popup scenes; exact PNG dimensions and RGB/alpha format checked |
| Extension source scan | No remote execution, network client, analytics, recording, or external runtime dependency found |

Browser checks used Chrome 156 on Windows with separate temporary profiles. Tests measure numeric player volume and playback continuity; audio output is muted in the test browser. Source coverage and remaining gaps are recorded in [docs/TESTING.md](../docs/TESTING.md).

## Scope to describe accurately

- Broad HTTP/HTTPS host access, `tabs`, `scripting`, and `storage` support the automatic cross-tab feature. The field guide includes a justification for each; `activeTab` alone cannot cover unattended background players.
- The product handles current tab/site/content information and recent playback-related interactions locally. Local handling is disclosed even though no information is transmitted to a backend.
- Accessible HTML media is the compatibility boundary. Do not advertise universal compatibility, full CHZZK/community-player validation, or full current-version signed-in YouTube Music coverage.
- Use Auto volume OFF before reloading/removing. Existing media pages should be refreshed after an update. Abrupt process termination still limits restoration guarantees.

## Account/dashboard work still required

Upload the prepared ZIP and graphic assets, copy the prepared English fields, verify real publisher/contact/distribution details, and resolve any dashboard validation messages before requesting review. Existing historical errors in Chrome are not automatically deleted by a code update. There is no need for a developer-dashboard screenshot unless its fields or warnings differ from the supplied guide.
