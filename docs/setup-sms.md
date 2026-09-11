# SMS provider setup

First-hour absence SMS (Section 33) is fully built end to end behind an
interface (`src/lib/sms/provider.ts`) with three implementations: `dev`
(logs instead of sending), `textbee` (configured — see below), and a
generic DLT-gateway HTTP provider for a real bulk-SMS service later if the
college outgrows a single phone's SIM.

## Currently configured: TextBee

[TextBee](https://textbee.dev) turns an Android phone into an SMS gateway
using its own SIM — you pair a phone with the TextBee app, and the app's
API then sends texts through that phone exactly as if you'd typed them
yourself. No DLT registration, no sender-ID approval, no per-message
template review.

```
SMS_PROVIDER="textbee"
TEXTBEE_API_KEY="txb_..."       # from the TextBee dashboard
TEXTBEE_DEVICE_ID="..."         # the paired phone's device ID
```

Both are already set in this project's `.env`. To confirm the pairing is
still healthy without sending anything, check the device's status:

```bash
curl -H "x-api-key: $TEXTBEE_API_KEY" https://api.textbee.dev/api/v1/gateway/devices/$TEXTBEE_DEVICE_ID
```

### Trade-offs, honestly

- **No DLT paperwork** — the biggest reason to start here.
- **The phone must stay on, connected, and running the TextBee app.** If
  it's off or offline, sends fail (they'll retry — see below — but won't
  succeed until the phone is back).
- **It's a personal SIM, not a provisioned bulk sender.** Carriers watch
  retail SIMs for spam-like bursts of outbound texts; sending to a very
  large number of parents in a short window risks the carrier throttling
  or flagging that SIM. Fine for a single department's daily first-hour
  absences; reconsider before scaling to the whole college's every period.
- Each recipient counts against the TextBee plan's daily/monthly message
  cap (429 if exceeded — the app retries up to 3 times, then records the
  failure on the `SmsMessage` row rather than silently losing it).

## Editing the message text

Admin → **Settings** → SMS → "First-hour absence SMS text" — no code
change or redeploy needed. Fill-ins available: `{student_name}`,
`{roll_number}`, `{date}`, `{college_name}` (single braces — this is a
plain find-and-replace, not a templating language). The seeded default:

> Dear Parent, your son/daughter {student_name} ({roll_number}) was
> marked absent in the first hour today, {date}. - {college_name}

Every change is validated, saved, and audit-logged as `SETTINGS_CHANGED`
— see `docs/guide-admin.md`.

## Switching to a real bulk DLT gateway later

If the college later wants a provisioned bulk-SMS service (MSG91,
Kaleyra, Gupshup, etc.) instead of a phone's SIM — usually once sending
volume outgrows what a personal SIM can handle — that path needs India's
DLT registration first:

1. **Register as a Principal Entity** on the DLT platform for your telecom
   circle (most gateways walk you through this as part of onboarding).
2. **Register a Sender ID** (a 6-character alphanumeric header, e.g.
   `PSNCET`).
3. **Register the exact text** currently set under Admin → Settings → SMS
   as your DLT template (with its `{variable}` placeholders exactly as
   written), and put the **DLT Template ID** DLT approval gives you into
   `SMS_TEMPLATE_ID_FIRST_HOUR_ABSENCE`. A mismatch between the registered
   template and what the app actually sends is the #1 reason real
   messages get silently rejected by a DLT gateway.
4. **Set the environment variables**:
   ```
   SMS_PROVIDER="msg91"              # anything other than "dev"/"textbee" selects the generic HttpSmsProvider
   SMS_API_KEY="..."
   SMS_SENDER_ID="PSNCET"
   SMS_DLT_ENTITY_ID="..."
   SMS_TEMPLATE_ID_FIRST_HOUR_ABSENCE="..."
   SMS_HTTP_ENDPOINT="https://api.msg91.com/api/v5/flow/"   # or your gateway's endpoint
   ```
   `HttpSmsProvider` in `src/lib/sms/provider.ts` is shaped for MSG91's
   Flow API by default — adapt that one class if your gateway's
   request/response shape differs. Nothing else in the app talks to a
   gateway directly, it only ever uses the `SmsProvider` interface.

## What's already handled for you, regardless of provider

- One SMS per student per day, enforced by `SmsMessage.dedupeKey`'s unique
  constraint — a correction after the first SMS never sends a second one
  (Section 16).
- A missing parent contact is recorded as its own case, not silently
  dropped or crashed on.
- Provider failure doesn't fail the attendance submission — SMS sending
  happens in `after()` (`src/lib/jobs/after.ts`), fully decoupled from the
  request/response cycle, and retries up to 3 times before being recorded
  as failed.

## Testing

Mark a student ABSENT for their first period, with their parent contact
set to a real phone number you can check (your own, for a test), and
confirm the SMS arrives with the wording you expect. Check
`SmsMessage.providerResponse` in the database (or Prisma Studio) if it
doesn't — that's the raw response TextBee (or your gateway) sent back.
