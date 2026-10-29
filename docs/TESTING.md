# Validation coverage

Version 0.1.2 was checked on October 29, 2026 with Chrome 156.0.8078.48 on Windows.

| Suite | Cases | Coverage |
| --- | ---: | --- |
| Policy and lifecycle | 7 | Recovery, mute eligibility, ratio validation, exception states, controller cleanup, recent-audio grace period, Shadow DOM invalidation before port disconnect |
| Local Chrome integration | 21 | Playback orders, actual action popup, closed-popup operation, ratios 0/25/50/100, reset, OFF/ON, three tabs, close recovery, tab switching, manual volume, conflicts, mute, frames, autoplay, navigation, Shadow DOM, multiple windows, worker restart |
| Player transitions | 3 | Reusing a player, replacement with copied lowered volume, replacement with a distinct original volume |
| Public YouTube | 4 | Playback orders, recovery, 50% held with popup closed, focused-tab closure |
| Extension reload | 2 | Concurrent DOM/closed-Shadow-DOM mutations during self-reload; fresh-context playback and recovery after reinstall/page refresh |

All 37 checks passed. Browser tests inspect playback and numeric volume with test-browser audio muted; they do not measure perceived loudness or the output waveform.

The invalidation regression first failed against 0.1.1's discovery path with the same uncaught Chrome API error reported by the user, then passed after the fix. The real-browser reload test is separate: it checks cleanup during actual context destruction while DOM work continues. Headless Chrome can leave a self-reloaded unpacked extension disabled, so its second phase explicitly uninstalls/reinstalls in the disposable profile and refreshes the media pages. It does not claim that every update automatically reconnects every existing page.

## Run

Use Node.js 22+, npm ci, and an installed Google Chrome. The default is Playwright's chrome channel; SOUNDPILOT_CHROME overrides its executable. Tests create and clean up a separate temporary profile and never load a personal profile.

```sh
npm run check
npm test
npm run test:browser
npm run test:transitions
npm run test:reload
npm run test:youtube
```

Results and captures go to the Git-ignored artifacts directory. Public-video tests require network access and may be affected by site changes, consent UI, or anti-automation behavior. CI runs static checks and unit tests.

## Limits

- Earlier prototypes were tested in signed-in YouTube Music. That is separate from automated validation of the current product in that environment.
- General host access does not prove compatibility with every site. CHZZK and arbitrary community players have not received a complete site-specific test pass.
- Ads, automatic tracks, OS media keys, complex player replacement, permission revocation, and abrupt termination need more coverage.
- Recovery after extension removal is best effort. Use Auto volume OFF first.
