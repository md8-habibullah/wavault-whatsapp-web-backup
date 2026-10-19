# Export WhatsApp group members

How to extract the member list of one or many WhatsApp groups, with each member's name, number and role.

![Groups with two groups selected for export](images/groups.png)

## 1. Load member lists

WhatsApp Web loads a group's members only when it needs them. Open **Groups** in WAVault and click
**Load member lists**. WAVault fetches the members of every group in the list (or only the groups you ticked) and
shows a progress bar. You only need to do this once per session; click **Refresh data** to update.

The table shows every group with its member count, your role (Admin, Member, or Left), whether it is a Community,
when it was created and its last activity.

## 2. Choose groups

- Tick the groups you want, or tick nothing to export all groups in the list.
- Search groups by name with the box at the top right.

## 3. Choose what to export

At the bottom, choose:

- **Members**: one row per member per group, with a **Group** and **Role** column (Owner, Admin, Member) plus all
  the [contact columns](formats.md#contact-columns). Tick **One row per person** to list someone only once even if
  they are in several of the selected groups.
- **Group list**: one row per group with name, members, admins, your role, created date, creator, last activity,
  and optionally description, community flag, "only admins can send" and group ID.

## 4. Export

Choose a format and click **Export**. In **Excel**, each group gets its own sheet (named after the group), so a
single file holds all of them. vCard, Google and Outlook formats are available for members (people), not for the
group list.

## Hidden numbers

In large groups, communities and some groups with privacy settings, WhatsApp does not share members' phone numbers
with other members. WAVault shows those people as **Hidden number** and fills in the number only when it is known
from elsewhere, for example because they are saved in your address book or you have a chat with them.
That is WhatsApp's privacy protection working as intended, and WAVault does not try to get around it.

## Use the members as a contact filter

After loading member lists, the [Contacts](contacts.md) view can filter by group: **Groups** → pick one or more
groups. Combine it with other filters, for example *members of "Customer VIP" who are not saved yet*.
