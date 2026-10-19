# Install WAVault

WAVault runs in every major desktop browser. Pick yours below.

- [Download a release](#1-download-a-release)
- [Chrome, Brave, Opera, Vivaldi, Arc](#chrome-brave-opera-vivaldi-arc)
- [Microsoft Edge](#microsoft-edge)
- [Firefox](#firefox)
- [Safari](#safari)
- [Build it yourself](#build-it-yourself)
- [Update or remove](#update-or-remove)

## 1. Download a release

Go to the [latest release](https://github.com/md8-habibullah/wavault-whatsapp-web-backup/releases/latest) and download:

| File | For |
|---|---|
| `wavault-<version>-chrome.zip` | Chrome, Brave, Opera, Vivaldi, Arc and other Chromium browsers |
| `wavault-<version>-edge.zip` | Microsoft Edge |
| `wavault-<version>-firefox.zip` | Firefox 140 or newer |

Unzip it into a folder you will keep, for example `Documents/WAVault`. The browser loads the extension from
that folder every time it starts, so do not delete it.

> Store listings (Chrome Web Store, Edge Add-ons, Firefox Add-ons) are planned. They will update automatically.

## Chrome, Brave, Opera, Vivaldi, Arc

1. Open the extensions page:
   - Chrome, Arc: `chrome://extensions`
   - Brave: `brave://extensions`
   - Opera: `opera://extensions`
   - Vivaldi: `vivaldi://extensions`
2. Turn on **Developer mode** (top right in most browsers).
3. Click **Load unpacked** and pick the unzipped `chrome` folder (the one that contains `manifest.json`).
4. Optional: click the puzzle-piece icon in the toolbar and pin **WAVault**.

Chrome may show "Disable developer mode extensions" at startup. Click **Keep** (or the ×); that notice appears for
any extension that is not from the Chrome Web Store.

## Microsoft Edge

1. Open `edge://extensions`.
2. Turn on **Developer mode** (left side).
3. Click **Load unpacked** and pick the unzipped `edge` folder.

## Firefox

Firefox 140 or newer on Windows, macOS or Linux.

**Quick try (until Firefox closes):**

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…** and pick `manifest.json` in the unzipped `firefox` folder.

Firefox removes temporary add-ons when it closes.

**Permanent install:** Firefox only installs signed add-ons permanently. Until WAVault is listed on Firefox Add-ons,
you can either:

- sign your own copy for free: create an account on [addons.mozilla.org](https://addons.mozilla.org/developers/),
  choose **Submit a New Add-on → On your own**, upload the Firefox zip, then install the signed `.xpi` you get back; or
- use **Firefox Developer Edition** or **Nightly**, set `xpinstall.signatures.required` to `false` in `about:config`,
  and install the zip from `about:addons` → gear icon → **Install Add-on From File…**.

## Safari

Safari extensions must be wrapped in a small Mac app, which needs a Mac with Xcode (free from the App Store).

```bash
npm ci
npm run build:safari
xcrun safari-web-extension-converter .output/safari-mv2 --app-name WAVault
```

1. Xcode opens the generated project. Choose **Product → Run**.
2. In Safari, open **Settings → Advanced** and turn on **Show features for web developers**
   (older Safari: **Show Develop menu**). Then **Develop → Allow Unsigned Extensions**.
3. Open **Settings → Extensions** and turn on **WAVault**. Allow it on `web.whatsapp.com`.

The same Xcode project can build an iOS/iPadOS version (WhatsApp Web in Safari needs **Request Desktop Website**).
Safari support is built but has had less testing than Chrome; please [report problems](https://github.com/md8-habibullah/wavault-whatsapp-web-backup/issues/new/choose).

## Build it yourself

You need [Node.js](https://nodejs.org) 20 or newer and Git.

```bash
git clone https://github.com/md8-habibullah/wavault-whatsapp-web-backup.git
cd wavault-whatsapp-web-backup
npm ci
npm run build:all
```

| Command | Output folder |
|---|---|
| `npm run build` | `.output/chrome-mv3` |
| `npm run build:edge` | `.output/edge-mv3` |
| `npm run build:firefox` | `.output/firefox-mv2` |
| `npm run build:safari` | `.output/safari-mv2` |
| `npm run zip:all` | store-ready zips in `.output/` |

## Update or remove

- **Update a manual install:** download the new release, replace the files in your WAVault folder, then click the
  reload icon on WAVault's card on the extensions page (Firefox temporary add-ons: **Reload**).
- **Remove:** click **Remove** on WAVault's card on the extensions page. WAVault keeps nothing else on your computer
  except the preferences it saved in the browser, which are removed with it.

## First run

Open [web.whatsapp.com](https://web.whatsapp.com) (reload the tab if it was already open), log in, and wait until
your chats appear. Click the **WAVault** tab on the right edge of the page. Next: [export your contacts](contacts.md).
