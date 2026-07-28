# send-expiry-reminders — setup

Daily cron that reminds users 30 and 7 days before a warranty expires, via native
push (Expo) and email (Resend). Each (warranty, window, channel) is sent once.
Push activates once the push-enabled build is installed; email activates once
`RESEND_API_KEY` is set. Neither blocks the other.

## 1. Apply the schema (Terminal)
```
cd /Users/edgardorubero/Developer/Sppa/Warraya
supabase db push
```
Creates `push_tokens`, `warranty_reminders`, and the `register_push_token` RPC.
(You will need the current DB password; the one on file failed auth earlier.)

## 2. Set the secrets (Terminal)
Generate the cron secret with openssl into a shell variable, never hand paste it:
```
CRON_SECRET=$(openssl rand -hex 32)
cd /Users/edgardorubero/Developer/Sppa/Warraya
supabase secrets set CRON_SECRET="$CRON_SECRET"
echo "save this for the cron job: $CRON_SECRET"
```
When Resend is ready (see step 5), also:
```
supabase secrets set RESEND_API_KEY="re_xxxxxxxx"
```
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected by the platform.

## 3. Deploy the function (Terminal)
Must be `--no-verify-jwt` so the CRON_SECRET header is the only gate:
```
cd /Users/edgardorubero/Developer/Sppa/Warraya
supabase functions deploy send-expiry-reminders --no-verify-jwt
```

## 4. Schedule it daily
Easiest: Supabase Dashboard → Database → Cron Jobs (or Integrations → Cron) →
Create job → schedule `0 9 * * *` → type "Edge Function" → select
`send-expiry-reminders` → add header `Authorization: Bearer <the CRON_SECRET>`.

Or by SQL (Supabase SQL editor), storing the secret in Vault so it is not
written in plain text:
```sql
select vault.create_secret('PASTE_CRON_SECRET_HERE', 'warraya_cron_secret');

select cron.schedule(
  'warraya-expiry-reminders',
  '0 9 * * *',
  $$
  select net.http_post(
    url := 'https://kwcxchyhssmqqrzmlzux.supabase.co/functions/v1/send-expiry-reminders',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'warraya_cron_secret'),
      'Content-Type', 'application/json'
    )
  );
  $$
);
```
Requires the `pg_cron` and `pg_net` extensions (Database → Extensions).

## 5. Email (Resend) — one time
1. Create an account at resend.com and add the domain `warraya.com`.
2. Add the DNS records Resend gives you in Cloudflare (these are sending records;
   they coexist with the Email Routing MX records already there).
3. Create an API key, then run the `supabase secrets set RESEND_API_KEY=...` above.
The `from` address is `hello@warraya.com`; keep it consistent with the domain you
verify in Resend.

## 6. Test it (Terminal)
```
curl -i -X POST 'https://kwcxchyhssmqqrzmlzux.supabase.co/functions/v1/send-expiry-reminders' \
  -H "Authorization: Bearer $CRON_SECRET"
```
Expect `200 {"ok":true,"considered":N,...}`. A wrong or missing secret returns 401.
With no warranties expiring in the next 30 days, `considered` is 0, which is fine.
