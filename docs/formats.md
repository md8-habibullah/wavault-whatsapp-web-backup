# Export formats

Every file WAVault creates, what is inside, and which app it is for.

## Contacts and group members

| Format | File | Contents |
|---|---|---|
| CSV | `.csv` | The columns you chose. UTF-8 with byte-order mark and Windows line endings, so Excel opens non-Latin names correctly |
| Excel | `.xlsx` | The columns you chose, with a bold frozen header row and filters. Phone numbers are text (they keep `+`). Group members: one sheet per group |
| JSON | `.json` | The columns you chose plus the full merged record of each contact |
| vCard 3.0 | `.vcf` | One card per person with a phone number (see below) |
| vCard 4.0 | `.vcf` | The same, in the RFC 6350 format |
| Google Contacts | `.csv` | Google's import columns: name, mobile number, website (`wa.me` link), notes, labels |
| Outlook | `.csv` | Outlook's full import template: name, mobile phone, web page, notes, categories |
| Numbers list | `.txt` | One `+number` per line, de-duplicated |
| HTML table | `.html` | A self-contained page with the table and a filter box |
| PDF | (print) | Opens a print-ready page; choose **Save as PDF** in the print dialog. Any language prints correctly because your browser renders it |

### What goes into a vCard

| vCard field | Value |
|---|---|
| `FN`, `N` | The display name (saved name, then business name, then WhatsApp profile name) |
| `TEL` | The phone number in international format (`+447700900123`), type mobile |
| `ORG` | The business name, for business accounts |
| `NICKNAME` | The WhatsApp profile name, when it differs from the saved name |
| `CATEGORIES` | WhatsApp Business labels |
| `URL` | `https://wa.me/<number>` for people on WhatsApp |
| `NOTE` | WhatsApp name, @username, About, labels and groups |

Long lines are folded at 75 bytes without splitting a character, as the standard requires, so names in any script
import cleanly.

### Google and Outlook notes field

Both formats put the extra WhatsApp information into **Notes** so nothing is lost:
`WhatsApp name: …`, `Username: @…`, `About: …`, `WhatsApp labels: …`, `Groups: …`.
Google Contacts also gets the label **WhatsApp** (plus each WhatsApp Business label), shown as
`WhatsApp ::: Paid` in the Labels column, Google's own multi-label format.

### Contacts without a number

Members whose number WhatsApp hides ("Hidden number") cannot be written to vCard, Google, Outlook or the numbers
list, because those formats need a phone number. WAVault skips them and says how many were skipped.
CSV, Excel, JSON, HTML and PDF keep them, with their name and WhatsApp LID.

## Contact columns

Columns marked ✓ are selected by default. Change them with **Columns** in the export bar.

| Column | Meaning |
|---|---|
| Display name ✓ | Best available name: saved name, business name, WhatsApp profile name, or the number |
| Saved name ✓ | Name in your phone's address book |
| Phone ✓ | International format with `+` |
| WhatsApp profile name ✓ | The name the person set in WhatsApp |
| Business name ✓ | Verified business name |
| Username ✓ | WhatsApp @username |
| Saved ✓ | Yes/No: in your address book |
| On WhatsApp ✓ | Yes/No |
| Business account ✓ | Yes/No |
| Has chat ✓ | Yes/No: you have a one-to-one chat |
| Unread messages | Unread count of that chat |
| Last chat | Date and time of the last message |
| Labels ✓ | WhatsApp Business labels |
| Groups | Your groups they are in (after loading member lists) |
| About | Their About text |
| First name | Short name from your address book |
| Blocked | Yes/No |
| WhatsApp LID | WhatsApp's private ID for the person |
| wa.me link | `https://wa.me/<number>`, opens a chat with them |
| Found in | Address book, chats, groups |

Group member exports add **Group** and **Role** (Owner, Admin, Member) at the start.

## Group list columns

Group name ✓, Members ✓, Admins ✓, My role ✓, Created ✓, Created by ✓, Last activity ✓, Community,
Only admins can send, Description, Group ID.

## Chat backup formats

| Format | File | Contents |
|---|---|---|
| HTML viewer | `chat.html` | WhatsApp-style reader: bubbles, sender names and colours, replies, forwarded and edited marks, starred, locations, photos and video inline, links, date separators, search, dark mode. Works offline |
| Text | `chat.txt` | `19/10/2026, 14:23 - Name: message`, the same layout as WhatsApp's Android "Export chat". Media lines read `<file name> (file attached)` or `<Media omitted>` |
| JSON | `chat.json` | Chat details plus every message: ID, time, sender, type, text, quote, media details and saved file path, forwarded, starred, edited |
| CSV | `chat.csv` | One row per message: date, time, sender, sender phone, from me, type, message, media file, quoted message, forwarded, starred, edited, message ID |

Several chats or any media produce a ZIP: a folder per chat with the chosen formats and a `media/` folder, plus an
`index.html` linking every chat and listing partial histories.

## Status backup

A ZIP with one folder per contact (photos and videos in original quality), `index.html` (gallery with captions and
times) and `manifest.json`.

## Safety of exported files

- Spreadsheet formula injection is neutralised: a cell that starts with `=`, `@`, a tab or a line break, or
  with `+` or `-` when it is not a phone number, gets a leading `'` so Excel and Google Sheets treat it as text. Phone numbers such as `+447700900123` are left as they are.
- HTML files escape every name and message. The chat viewer only turns `http` and `https` addresses into links,
  and those links open with `rel="noopener noreferrer"`.
