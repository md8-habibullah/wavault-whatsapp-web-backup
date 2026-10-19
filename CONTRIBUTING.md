# Contributing to WAVault

Thanks for helping. Bug reports, fixes for new WhatsApp versions, translations, docs and new export formats are all
welcome.

## Ground rules

- **Read-only stays read-only.** WAVault never sends messages, changes chats or groups, or automates anything on
  WhatsApp. Pull requests that add bulk messaging, auto-replies, contact scraping from groups you are not in, or any
  network request to a third-party server will not be merged.
- **No real personal data** in issues, pull requests, tests or screenshots. Use the fictional fixtures in `tests/`
  and the demo preview (`npm run preview`), whose phone numbers come from ranges reserved for fiction.
- Be kind. See the [Code of Conduct](CODE_OF_CONDUCT.md).

## Set up

```bash
git clone https://github.com/md8-habibullah/wavault-whatsapp-web-backup.git
cd wavault-whatsapp-web-backup
npm ci
npm test
npm run dev            # opens Chrome with the extension and live reload
```

`npm run preview` shows the dashboard with demo data at http://127.0.0.1:4789 without logging in to WhatsApp,
which is the fastest way to work on the UI.

## Where things are

See [docs/architecture.md](docs/architecture.md). In short: WhatsApp access lives in `src/bridge/`,
pure logic and exporters in `src/lib/` (unit-tested), and the dashboard in `src/ui/`.

## Fixing a break after a WhatsApp update

Follow [When WhatsApp updates](docs/architecture.md#7-when-whatsapp-updates-and-something-breaks). Keep the old
module names or call forms working too, since users update WhatsApp Web at different times.
Mention the WhatsApp Web version you tested in the pull request.

## Pull requests

1. Create a branch from `main`.
2. Keep the change focused, and match the style of the code around it (plain JavaScript, ES modules, React function
   components).
3. Add or update tests for anything in `src/lib/`.
4. Run `npm test` and `npm run build:all`; for Firefox-related changes also `npm run lint:firefox`.
5. If the UI changed, run `npm run screenshots` and include the updated images.
6. Describe what changed and how you tested it.

## Adding an export format

Add a writer in `src/lib/export/`, register it in `FORMATS` in `src/lib/export/index.js`, add tests in
`tests/export.test.js`, and document it in [docs/formats.md](docs/formats.md).

## Translations

The interface is in English for now. If you want to translate it (Bangla, Hindi, Arabic, Spanish, Portuguese,
Indonesian, …), open an issue first so we can set up the message files together.
