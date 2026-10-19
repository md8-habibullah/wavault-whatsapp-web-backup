# Download WhatsApp statuses

How to save WhatsApp status photos, videos and text updates to your computer.

![Status updates grouped by contact, five selected](images/status.png)

1. Open **Status** in WAVault. It loads every status update currently available to you, grouped by contact. Click **Reload statuses** to check for new ones.
2. **Save one:** click **Save** under it. Photos and videos are saved in their original quality.
3. **Save several:** click the updates you want (they get an amber border), then **Save N updates as ZIP**.
   With nothing selected, the button saves all of them.

The ZIP contains:

- one folder per contact with the photos and videos, named by date and time,
- `index.html`, a gallery page that shows every saved update with its caption and time,
- `manifest.json`, the details of every update (contact, time, type, caption, file name) for developers.

Text statuses are kept in the gallery page and the manifest.

Notes:

- Statuses last 24 hours on WhatsApp. WAVault can only save the ones that are still available.
- Only statuses from people who share them with you appear, the same as in WhatsApp.
- Please respect the people who posted them: ask before sharing someone else's status.
