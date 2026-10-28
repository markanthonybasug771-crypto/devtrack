# Devotional reminder emails

`sendMissedDevotionReminders` runs every day at 8:00 PM in `Asia/Manila`. It queues one reminder when a member has missed exactly one or two consecutive devotional days. Members can opt out in Profile.

## One-time Firebase setup

1. Upgrade the Firebase project to the Blaze plan. Cloud Scheduler-backed functions require billing.
2. Install and configure Firebase's Trigger Email extension with an SMTP provider (such as SendGrid, Mailgun, or Gmail SMTP). Configure its mail collection as `mail`.
3. In this folder, run `npm install`.
4. Deploy with `npx -y firebase-tools@latest deploy --only functions`.

The extension sends the documents created in the `mail` collection. Do not allow browser clients to write to that collection; only this Cloud Function should create email jobs.
