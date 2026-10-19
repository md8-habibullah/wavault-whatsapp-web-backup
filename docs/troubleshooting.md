# Troubleshooting

| What you see | What to do |
|---|---|
| No **WAVault** tab on WhatsApp Web | Reload the WhatsApp tab (the extension only attaches to pages opened after it was installed). Check that WAVault is enabled on the extensions page. If you hid the tab in **Settings**, use the toolbar icon |
| "Log in to WhatsApp Web first" | Scan the QR code with your phone (WhatsApp → Linked devices → Link a device) and wait until chats appear |
| "WhatsApp is still loading" or "Connecting to WhatsApp Web" stays for a long time | WhatsApp is still syncing after login. Wait for the chat list to appear. If it does not change, reload the WhatsApp tab |
| "Could not read WhatsApp data" | Click **Try again**. If it keeps failing, update WAVault and report it (see below) |
| A notice above the table says part of the data could not be read | WhatsApp changed its internals. Update WAVault to the latest release. If the latest release has the problem too, [open a bug report](https://github.com/md8-habibullah/wavault-whatsapp-web-backup/issues/new?template=bug_report.yml) with the WhatsApp version shown at the bottom of the WAVault rail |
| Fewer contacts than expected | Click **Refresh data** after WhatsApp finishes syncing. Load group member lists in **Groups** to include group members |
| Group members show "Hidden number" | WhatsApp hides numbers in communities and some groups. This is expected; see [Groups](groups.md#hidden-numbers) |
| Chat backup says "partial history" | WhatsApp Web has no older messages for that chat. Keep your phone online, open the chat on the phone, then try again |
| Some media "not saved" | The file expired on WhatsApp's servers. Only a phone that still has it can recover it |
| The browser asks where to save each file, or blocks multiple downloads | Allow downloads for `web.whatsapp.com` in your browser's site settings, or turn off "Ask where to save each file" |
| PDF export opens a page but no print dialog | Allow pop-ups for `web.whatsapp.com`, or press Ctrl+P (Cmd+P on Mac) on the opened page and choose **Save as PDF** |
| Excel shows strange characters | Use the Excel (.xlsx) format, or see the [FAQ](faq.md#why-are-some-names-in-bangla-arabic-or-with-emoji-shown-as-strange-characters-in-excel) |
| Firefox: WAVault is gone after a restart | Temporary add-ons are removed when Firefox closes. See the [permanent install](install.md#firefox) |
| Backup of a huge chat is slow | WhatsApp sends history in pages. Limit the period or untick videos, or back up big chats on their own |

## Reporting a problem

[Open a bug report](https://github.com/md8-habibullah/wavault-whatsapp-web-backup/issues/new?template=bug_report.yml) with:

- your browser and its version,
- the WhatsApp Web version (bottom of the WAVault rail),
- what you did, what you expected, and what happened,
- any red errors from the browser console (F12 → Console) that mention WAVault.

Please never post phone numbers, names or chat content in an issue.
