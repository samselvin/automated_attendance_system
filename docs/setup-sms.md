# SMS provider and DLT template setup

First-hour absence SMS (Section 33) is fully built end to end behind an
interface (`src/lib/sms/provider.ts`) but ships with `SMS_PROVIDER=dev` by
default, which only **logs** each message instead of sending it — this is
the documented exception in the master prompt's build plan (Section 54):
the SMS gateway itself needs a real, paid, DLT-registered credential this
project was never given.

## Why DLT registration (India-specific)

Indian telecom regulation (TRAI's Distributed Ledger Technology framework)
requires every transactional/promotional SMS sender to pre-register their
sender ID and exact message templates before any provider will deliver
them. You cannot skip this by picking a different provider — every
DLT-registered gateway enforces the same rule. Budget lead time for this;
approval is not instant.

## Steps

1. **Register as a Principal Entity** on the DLT platform for your telecom
   circle (each of the major Indian telcos participates in a shared DLT
   ecosystem — most SMS providers below can walk you through their
   specific onboarding).
2. **Register a Sender ID** (a 6-character alphanumeric header, e.g.
   `PSNCET`) under that entity.
3. **Register the exact message template** used by this app. The seeded
   default lives in `SystemSetting` under the key
   `SMS_TEMPLATE_FIRST_HOUR_ABSENCE` (seeded in `prisma/seed.ts` from
   `DEFAULT_FIRST_HOUR_ABSENCE_TEMPLATE`) — register that literal text
   (with its `{{variable}}` placeholders) as your DLT template, note the
   **DLT Template ID** Approval gives you, and put it in
   `SMS_TEMPLATE_ID_FIRST_HOUR_ABSENCE`. If your college needs different
   wording, register your own text on DLT first, then update the
   `SystemSetting` row to match exactly — a mismatch between the DLT
   template and what the app actually sends is the #1 reason real
   messages get silently rejected by the gateway.
4. **Pick an SMS gateway** that accepts DLT-registered sends over a plain
   HTTP API — MSG91 is what `HttpSmsProvider` in
   `src/lib/sms/provider.ts` is shaped for by default (a POST with
   `sender`, `template_id`, and a recipients array), but any similar
   gateway (Kaleyra, Gupshup, Textlocal, etc.) works if you adapt that one
   file — nothing else in the app talks to the gateway directly, it only
   uses the `SmsProvider` interface.
5. **Set the environment variables**:
   ```
   SMS_PROVIDER="msg91"              # anything other than "dev" selects HttpSmsProvider
   SMS_API_KEY="..."
   SMS_SENDER_ID="PSNCET"
   SMS_DLT_ENTITY_ID="..."
   SMS_TEMPLATE_ID_FIRST_HOUR_ABSENCE="..."
   SMS_HTTP_ENDPOINT="https://api.msg91.com/api/v5/flow/"   # or your gateway's endpoint
   ```
6. **Test with a real number** in a staging environment before relying on
   it — send one attendance submission for a student whose first period
   you mark ABSENT and whose parent contact is your own test phone number,
   and confirm the SMS actually arrives with the right text.

## What's already handled for you

- One SMS per student per day, enforced by `SmsMessage.dedupeKey`'s unique
  constraint — a correction after the first SMS never sends a second one
  (Section 16).
- A missing parent contact is recorded as its own case, not silently
  dropped or crashed on.
- Provider failure doesn't fail the attendance submission — SMS sending
  happens in `after()` (`src/lib/jobs/after.ts`), fully decoupled from the
  request/response cycle.

## Known gap

No real `SMS_API_KEY` / DLT entity / template ID has been provided.
`SMS_PROVIDER=dev` is what's configured today — see
`docs/pending-credentials.md`.
