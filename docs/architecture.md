# How WAVault works

For developers and contributors. For using WAVault, see the [user guide](README.md).

A cross-browser extension that backs up your own WhatsApp Web / WhatsApp Business Web data:
contacts (with rich filters), groups and members, full chat history (with media), and statuses,
in many export formats. **Read-only by design**: it never sends messages, never changes chats,
never contacts WhatsApp servers on its own beyond what WhatsApp Web itself does when you scroll
a chat or open a status.

## 1. How it gets the data (verified live on WhatsApp Web 2.3000.x, 2026-10-19)

| Source | What it gives | Used for |
|---|---|---|
| `window.require('WAWebCollections')` (page main world) | `Contact`, `Chat`, `WAWebGroupMetadataCollection`, `Msg`, `Status`, `Label`, `Blocklist`, `ProfilePicThumb` | Everything live |
| `WAWebContactGetters` / `WAWebFrontendContactGetters` | `getIsMyContact`, `getIsWAContact`, `getUsername`, `getPhoneNumber`, `getIsBusiness`, ... | Contact flags |
| `WAWebApiContact` (`getPhoneNumber`, `lidPnCache`) | LID (privacy id) to phone number mapping | Merge duplicate LID/phone records, resolve group members |
| `WAWebChatLoadMessages.loadEarlierMsgs({ chat, msgCollection })` (older builds: `loadEarlierMsgs(chat)`) + `chat.msgs.msgLoadState.noEarlierMsgs` | Full message history paging | Chat backup |
| `WAWebDownloadManager.downloadManager.downloadAndMaybeDecrypt({ directPath, mediaKey, …, downloadQpl })` | Decrypted media bytes | Media in chat backup, status downloader |
| IndexedDB `model-storage` (`contact`, `out-contact`, `verified-business-name`) | Same contacts plus **address-book contacts not on WhatsApp** | Fallback when modules move; "Invite" list |

Module names change between WhatsApp releases, so all module access goes through one resolver
(`src/bridge/modules.js`) with candidate names and graceful degradation: a missing feature is
reported in the UI as "unavailable on this WhatsApp version" instead of crashing.

## 2. Architecture

```
toolbar icon / popup ──► background ──► content script (isolated world, Shadow-DOM dashboard UI, React)
                                              │  window.postMessage RPC (structured clone, binary-safe)
                                              ▼
                                    bridge script (page main world, injected via WXT injectScript)
                                    reads WhatsApp collections / IndexedDB / media
```

- **Framework**: [WXT](https://wxt.dev) (Vite-based, one codebase → Chrome, Edge, Brave, Opera, Firefox, Safari builds) + React 19, plain JavaScript (JSX).
- **UI**: full-screen dashboard overlay inside the WhatsApp Web tab (Shadow DOM so styles never clash),
  opened from the toolbar icon, the popup, or a small floating button. Data never leaves the tab.
- **Downloads**: Blob + `<a download>` in the content script (works the same in every browser, no `downloads` permission).
- **ZIP**: `fflate` (small, dependency-free). XLSX is written by our own minimal OOXML writer (no SheetJS).
- **Permissions**: only `https://web.whatsapp.com/*` host access + `storage`. No remote code, no analytics, no network calls of our own.

## 3. Features

### Contacts
Unified contact model merged from contacts, chats, groups and the address book; LID and phone duplicates are merged.
Filters (combinable) + free-text search on name / number / username / business name:
- All · Saved (address book) · Unsaved (from chats / groups only) · Invite list (in address book, not on WhatsApp)
- On WhatsApp · Chatted (has a 1:1 chat) · Unread chats · Read chats
- Has username · No username · Business · Personal · Blocked
- By group (members of selected groups) · By label (WhatsApp Business labels) · Has phone hidden (LID only)
- Column chooser, sort, select all / selected rows only.

### Groups
List all groups (name, members, admins, created, owner, description, my role). Export group list, or members of selected groups.

### Chat backup
Pick chats (filters: all / unread / read / groups / individual / archived / pinned / labels / search).
Loads full available history with progress + cancel, optional date range, optional media (images, video, audio, documents, stickers).
Formats: **HTML viewer** (WhatsApp-style bubbles, searchable, self-contained), **TXT** (same layout as WhatsApp's own "Export chat"), **JSON**, **CSV**, **ZIP** (per-chat folders + media + index.html).

### Status downloader
Lists all available statuses grouped by contact (images, videos, text), preview, download one, or all as ZIP (+ JSON manifest).

### Export formats (contacts & group members)
CSV · Excel (.xlsx) · JSON · vCard 3.0 (Android, iPhone/iCloud, most apps) · vCard 4.0 · Google Contacts CSV ·
Outlook CSV · Plain text numbers · Printable HTML / PDF (via browser "Save as PDF", full Unicode/Bangla support) · Copy to clipboard.

## 4. Cross-browser targets

| Browser | Build | Status |
|---|---|---|
| Chrome, Edge, Brave, Opera, Vivaldi | `npm run build` / `npm run zip` (MV3) | Built; bridge and exports verified on a live WhatsApp Business account in Chromium |
| Firefox | `npm run build:firefox` / `zip:firefox` (MV2) | Built; passes `web-ext lint` with 0 errors |
| Safari (macOS/iOS) | `npm run build:safari`, then `xcrun safari-web-extension-converter` on a Mac | Built; conversion needs macOS + Xcode |

## 5. Testing
1. **Unit tests (Vitest)**: phone normalisation, contact merge/filters, every exporter (CSV escaping, vCard escaping/folding, Google/Outlook column sets, XLSX zip validity, chat TXT/HTML/JSON), fixtures with Bangla/emoji names.
2. **Live bridge tests**: run the built bridge inside a logged-in WhatsApp Web tab and compare its counts with WhatsApp's own IndexedDB (`model-storage` → `contact` and `out-contact`).
3. **End-to-end (Chromium)**: `scripts/e2e-browser.mjs` launches Chromium with the unpacked extension and a persistent test profile (scan the QR once); `scripts/e2e.mjs` then drives it: opens the dashboard, runs filters and exports, and saves screenshots and files to `e2e-output/`.
4. **Demo preview**: `npm run preview` renders the real dashboard with a mock bridge and fictional data; `npm run screenshots` regenerates `docs/images` from it.
5. Firefox: `web-ext lint` on the Firefox build.

## 6. Out of scope (on purpose)
Bulk messaging, auto-replies, adding/removing group members, scraping numbers from groups you are not in. This is a personal backup tool.
Unofficial tools can break when WhatsApp updates; the resolver keeps failures contained, and the README says how to update module names.

## 7. When WhatsApp updates and something breaks

1. Note the WhatsApp Web version (bottom of the WAVault rail).
2. In a logged-in WhatsApp Web tab, open DevTools and check which module moved, for example
   `require('WAWebCollections')` or `require('WAWebChatLoadMessages')`.
3. Add the new name to `CANDIDATES` in `src/bridge/modules.js`, or adapt the call in `src/bridge/extract.js`
   (calls that changed signature are wrapped so both old and new forms work, see `loadEarlier`).
4. `npm test`, `npm run build`, reload the extension, and check the dashboard on the live account.

## 8. Source layout

```
entrypoints/
  wa-bridge.js              page-world script: reads WhatsApp's modules (read-only RPC server)
  wavault.content/          content script: Shadow-DOM dashboard (React) + styles
  background.js             opens the dashboard, hands PDF reports to the print page
  popup/, report/           toolbar popup, print-to-PDF page
src/
  bridge/                   module resolver + data extraction (contacts, chats, groups, history, status, media)
  shared/                   postMessage protocol between dashboard and bridge
  lib/                      pure logic: contact merge, filters, exporters, ZIP, backup jobs
  ui/                       dashboard views
tests/                      Vitest suites + fictional fixtures
preview/                    demo harness with a mock bridge (fictional data only)
scripts/                    e2e browser + driver, screenshot generator, site builder
site/                       landing page source (GitHub Pages)
```
