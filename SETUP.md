# Portal & App — Setup Guide

The public site, installable app (PWA), and the admin/client portal are all live in this repo and deploy automatically to GitHub Pages. The portal is backed by a dedicated Supabase project.

- **Live site:** https://jojogarcia24.github.io/newlabvisuals/
- **Portal login:** https://jojogarcia24.github.io/newlabvisuals/portal/
- **Supabase project:** `All Things REELestate` (ref `ffczbiqcrgwrnlatykay`)

Everything below is a one-time configuration in the Supabase dashboard — the app code needs no changes.

## 1. Required — make the login code show up in emails

Login is passwordless: users enter their email and receive a **6-digit code**. Supabase's default email only contains a link, so add the code to the template:

1. Supabase Dashboard → **Authentication → Email Templates → "Magic Link"**
2. Paste this as the message body and **Save**:

```html
<h2>Your All Things REELestate login code</h2>
<p>Enter this code to sign in:</p>
<p style="font-size:30px;font-weight:700;letter-spacing:6px">{{ .Token }}</p>
<p style="color:#888">This code expires in 1 hour. If you didn't request it, ignore this email.</p>
```

That's the only step required for logins to work.

## 2. First admin login (Donnie)

The email **`info@thenl3v.com`** is pre-set as the admin (in the `admin_emails` table). To sign in as admin:

1. Go to the portal, enter `info@thenl3v.com`, get the code, verify.
2. You'll land on the **Studio Dashboard** (Portfolio / Properties / Clients).

To add more admins later: add their email to the `admin_emails` table (Supabase → Table Editor), then have them log in.

## 3. Optional — email notifications when new assets are posted

Push notifications work out of the box. To *also* send an email when you upload assets:

1. Create a [Resend](https://resend.com) account and verify a sending domain.
2. Supabase Dashboard → **Edge Functions → Secrets**, add:
   - `RESEND_API_KEY` = your Resend API key
   - `NOTIFY_FROM_EMAIL` = e.g. `All Things REELestate <hello@yourdomain.com>`

Without these, uploads still send push notifications; email is simply skipped.

## 4. Optional — higher email volume for logins

Supabase's built-in email is rate-limited (fine for testing). For real client volume, set **custom SMTP**: Dashboard → **Authentication → SMTP Settings** (Resend, Postmark, SendGrid, etc.).

## How it works

- **Admin (Donnie):** manage the homepage portfolio videos, add clients, create **property cards** (by address) for a client, and upload photos/videos or add a Matterport link to each property. Uploading fires a push (and email, if configured) to that client.
- **Clients:** log in → see their property cards → open a card → view & download every asset. An agent can have several properties; each is its own card.
- **Install the app:** on the homepage, "Install App" appears in supported browsers; on iPhone use Share → *Add to Home Screen*. Push notifications on iOS require the app to be installed to the home screen (iOS 16.4+).

## Notes

- The Supabase publishable key and VAPID public key in `assets/js/config.js` are public by design; all data access is enforced by Row-Level Security.
- Web-push VAPID keys are embedded server-side in the `notify-client` edge function.
