# Frequently asked questions

- [General](#general)
- [Contacts](#contacts)
- [Groups](#groups)
- [Chats](#chats)
- [Status](#status)
- [Privacy and safety](#privacy-and-safety)

## General

### What is WAVault?

A free, open-source browser extension that adds backup and export tools to WhatsApp Web: export contacts, extract
group members, back up chats with media, and download statuses.

### Is it free?

Yes, completely, under the MIT license. No account, no subscription, no limits on the number of contacts or chats.

### Does it work with WhatsApp Business?

Yes. Business labels become filters and a column, and business names are exported.

### Which browsers does it support?

Chrome, Microsoft Edge, Brave, Opera, Vivaldi, Arc and other Chromium browsers; Firefox 140 or newer; and Safari on
macOS (with a one-time Xcode build). See the [install guide](install.md).

### Does it work on my phone?

WAVault works where WhatsApp Web works with extensions: desktop browsers. Firefox for Android and Safari on iPhone and
iPad support extensions, but WhatsApp Web there needs the "desktop site" mode, and this has had little testing.

### Do I need to keep my phone online?

Your phone needs to be linked to WhatsApp Web, as usual. For loading old chat history, having the phone online helps.

## Contacts

### How do I export all my WhatsApp contacts to Excel?

Open WAVault, stay on **All contacts**, pick **Excel** in the format menu and click **Export**.
See [Export contacts](contacts.md).

### Why is the number of contacts different from my phone?

WAVault counts people, not entries. It merges duplicates (the same person by number and by WhatsApp's private ID),
adds unsaved people from your chats and groups, and leaves out your own number. The **Saved** list is the closest to
your phone's address book, and the **Invite list** shows saved numbers that are not on WhatsApp.

### How do I export only unsaved numbers, people who messaged me but are not in my contacts?

Click the **Unsaved** list. To get only those with a chat, open **Refine** and set **Has a chat** to **Yes**.

### Can I export contacts with a specific WhatsApp Business label?

Yes: **Labels** → tick the label (for example *Paid*). Combine with any other list or filter.

### How do I import WhatsApp contacts into Google Contacts, iPhone or Outlook?

Export in **Google Contacts**, **vCard 3.0** or **Outlook** format, then follow the
[import steps](contacts.md#import-the-file-into-another-app).

### Why are some names in Bangla, Arabic or with emoji shown as strange characters in Excel?

Use the **Excel (.xlsx)** format, or open the **CSV** by double-clicking it (it has a UTF-8 byte-order mark).
If you use Excel's **Data → From Text/CSV**, choose **65001: Unicode (UTF-8)** as the file origin.

## Groups

### Can I get the phone numbers of all members in a WhatsApp group?

Yes for every group you are a member of, except where WhatsApp hides numbers for privacy (communities and some large
groups). Those members appear as **Hidden number**. See [Export group members](groups.md).

### Can I export members from a group I am not in?

No. WAVault only reads what your own account can see.

### How do I export members of several groups into one file?

Tick the groups, choose **Members**, then export. Excel gives one sheet per group; other formats add a **Group** column.
Tick **One row per person** to remove duplicates across groups.

## Chats

### How do I back up all WhatsApp chats to my computer?

Open **Chats**, keep **All chats** with nothing ticked, choose formats and media, and click **Back up**.
See [Back up chats](chat-backup.md).

### Can I read the backup without WhatsApp?

Yes. Open `index.html` from the ZIP in any browser, offline. The **Text** format can also be read by any text editor
or chat-analysis tool.

### Can I restore the backup into WhatsApp?

No. WhatsApp only restores its own backups (Google Drive or iCloud). WAVault's backup is for reading, searching,
archiving and analysis.

### Why does a chat say "partial history"?

WhatsApp Web only has the history your phone synced to it. When WhatsApp has nothing older to send, WAVault marks the
chat as partial so you know.

### Why are some photos "not saved"?

WhatsApp removes media from its servers some time after it was sent. Those files cannot be downloaded any more by
anyone except from a phone that still has them.

## Status

### Can I download WhatsApp statuses on PC?

Yes: open **Status**, click **Save** on one update, or select several and save them as a ZIP. See
[Download statuses](status.md).

## Privacy and safety

### Does WAVault upload my data anywhere?

No. It has no server and makes no network requests of its own. Files are created in your browser and saved by it.
The code is open for anyone to check. See the [privacy policy](../PRIVACY.md).

### Can my WhatsApp account be banned for using it?

WAVault only reads what your WhatsApp Web tab has already loaded and never sends messages or automates anything,
which is what WhatsApp's anti-spam systems look for. It is still an unofficial tool, so use it for your own backups,
at your own risk.

### Why does it need access to web.whatsapp.com?

That is where your data is. WAVault asks for no other site, and no access to your browsing history, tabs or downloads.

### Is it affiliated with WhatsApp or Meta?

No. It is an independent open-source project.
