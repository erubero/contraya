# send-date-reminders — deploy + schedule

Server-side reminder delivery for contract dates. Runs daily; local
notifications on-device are the first line, this cron is the second (push
reaches users who reinstalled or switched devices, and covers recurring
occurrences past the on-device 60-notification cap).

## 1. Secrets

- `CRON_SECRET` — long random string; only the owner holds it. The function
  compares it timing-safe. Rotating it = set the new value + redeploy + update
  the cron job's Authorization header.
- `APNS_TEAM_ID` + `APNS_KEY_ID` + `APNS_P8_BASE64` — the push channel
  (DIRECT APNs; no Expo or any push service in the chain). All three unset =
  push soft-skips. Team id is `DYR4YB9FVL`; key id is the 10-character id of
  an Apple Developer key with the APNs capability; the p8 secret is
  `base64 -i AuthKey_<KEYID>.p8` (raw PEM pasted in also works). One APNs
  auth key serves every app on the team. Debug builds register SANDBOX
  device tokens; the sender retries the sandbox host on BadDeviceToken, so
  dev-phone testing works with no extra config.
- `RESEND_API_KEY` — OPTIONAL. Unset = email channel soft-skips (the function
  still returns ok). Requires usecontraya.com verified in Resend before setting.

```sh
supabase secrets set CRON_SECRET=... --project-ref <ref>
```

## 2. Deploy

Deployed WITHOUT JWT verification (the cron calls it with the secret, not a
user token; the function rejects anything without the secret):

```sh
supabase functions deploy send-date-reminders --no-verify-jwt --project-ref <ref>
```

## 3. Schedule (Supabase dashboard, pg_cron)

Lessons from Warraya's setup — the same traps apply:

- The Cron UI needs TWO extensions and only offers to install one. The
  in-dialog button installs `pg_net` (HTTP calls), but `pg_cron` (the
  scheduler itself) must be enabled separately in Database → Extensions, or
  job creation fails with `42P01 relation "cron.job" does not exist`.
- The dashboard caps the timeout field at 5000 ms — that only caps how long
  the cron WAITS; the function still finishes.
- The job name cannot be renamed later.

Job: `send-date-reminders-daily`, schedule `0 13 * * *` (13:00 GMT = 9:00 AM
Puerto Rico), type Supabase Edge Function → POST `send-date-reminders`,
Authorization header = `Bearer <CRON_SECRET>`.

## 4. Verify

```sh
curl -s -X POST 'https://<ref>.supabase.co/functions/v1/send-date-reminders' \
  -H 'Authorization: Bearer <CRON_SECRET>'
# → {"ok":true,"considered":N,"pushSent":N,"emailSent":0}
```

- Wrong/absent secret must bounce 401.
- `considered: 0` on an empty table is success.
- End-to-end: add a real contract with a date ~2 weeks out on a phone with
  notifications allowed, re-run the curl, expect considered/pushSent >= 1 and
  the push within seconds. A manual send consumes that (date, occurrence,
  window, channel) ledger slot, so the next scheduled run correctly will not
  repeat it.
