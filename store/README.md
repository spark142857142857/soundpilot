# SoundPilot store submission kit

Prepared for version **0.1.2**. This folder contains listing material; the uploadable extension ZIP is generated separately. The materials are ready for dashboard entry, not submitted or approved.

## Files to use

| Dashboard destination | File |
| --- | --- |
| Package upload | `../dist/soundpilot-0.1.2.zip` — upload this ZIP only |
| Store description | [listing.en.txt](listing.en.txt) |
| Listing, purpose, permissions, and privacy fields | [dashboard-fields.en.md](dashboard-fields.en.md) |
| Test instructions | [reviewer-notes.en.txt](reviewer-notes.en.txt) |
| Store icon | [icon-128.png](icon-128.png) — 128×128, transparent PNG |
| Screenshot 1 | [Automatic priority](screenshots/01-priority-1280x800.png) — 1280×800 |
| Screenshot 2 | [Adjustable background volume](screenshots/02-volume-1280x800.png) — 1280×800 |
| Screenshot 3 | [Automatic recovery](screenshots/03-recovery-1280x800.png) — 1280×800 |
| Optional small promotional tile | [promo-small-440x280.png](promo-small-440x280.png) — 440×280 |
| Optional marquee promotional tile | [promo-marquee-1400x560.png](promo-marquee-1400x560.png) — 1400×560 |

Upload screenshots in the numbered order above. They contain real installed-extension action-popup captures with explanatory artwork. Demo titles and localhost addresses come from controlled media pages, not a personal browser profile. Popup text and state were not mocked or rewritten. Artwork generation writes intermediate popup captures to the Git-ignored `artifacts/store-captures/` directory; only the final store-size assets are kept here.

## Dashboard order

1. Add a new item and upload `soundpilot-0.1.2.zip`.
2. Fill out Store listing using the English description, icon, and screenshots. Promotional tiles are optional but provided.
3. Fill out Privacy practices using the single purpose, permission explanations, remote-code answer, local-data disclosures, and public privacy-policy URL in the field guide.
4. Fill out test instructions with the reviewer notes.
5. Set distribution and verify publisher/account fields using your real account details.
6. Check the dashboard's validation results and inspect the uploaded version before requesting review. If you want control over launch timing, disable automatic publishing after approval where the dashboard offers it.

Store material does not guarantee approval. The current build deliberately requests general HTTP/HTTPS access to manage background tabs; its justification must remain consistent with the product's behavior. Existing extension error records can refer to an older build. After installing/reloading this version, refresh media pages, clear old records in Chrome if desired, then check whether new errors appear.

## Rebuild

Use Node.js 22+ and `npm ci`. An installed Google Chrome is required for browser checks and artwork generation. The ZIP packager currently requires Windows PowerShell.

```sh
npm run check
npm test
npm run test:browser
npm run test:transitions
npm run test:reload
npm run test:youtube
npm run store:assets
npm run package
```

Artwork generation captures current popup states and verifies PNG dimensions and opaque RGB output for screenshots and promo tiles. Packaging includes only extension files plus the MIT license, verifies root-level manifest/license entries, and writes a SHA-256 companion file. Research material, profiles, artifacts, and store artwork are not inside the extension ZIP.

## Official references

Requirements were checked on October 29, 2026:

- [Publishing an extension](https://developer.chrome.com/docs/webstore/publish)
- [Listing fields and graphic assets](https://developer.chrome.com/docs/webstore/cws-dashboard-listing)
- [Image requirements](https://developer.chrome.com/docs/webstore/images)
- [Privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [User Data FAQ, including local processing](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [Category guidance](https://developer.chrome.com/docs/webstore/best-practices#choose-your-extensions-category-well)
