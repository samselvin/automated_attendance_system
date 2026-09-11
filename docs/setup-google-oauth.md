# Google OAuth setup

Google Sign-In is one of the app's two login methods (the other is college
email + password — see `README.md`'s Security notes). This is optional to
set up for local development but required before real staff/students can
use "Sign in with Google" in production.

1. **Create a Google Cloud project** (or reuse one) at
   https://console.cloud.google.com.
2. **Configure the OAuth consent screen** (APIs & Services → OAuth consent
   screen):
   - User type: **Internal** if the college has a Google Workspace domain
     and every user is on it; otherwise **External**.
   - App name: "College Attendance" (or the college's own name).
   - Scopes: the defaults (`email`, `profile`, `openid`) are all this app
     requests — nothing else is needed.
   - If External, add the college's domain(s) under "Authorized domains".
3. **Create an OAuth Client ID** (APIs & Services → Credentials → Create
   Credentials → OAuth client ID):
   - Application type: **Web application**.
   - Authorized redirect URIs — add one per environment:
     - `http://localhost:3000/api/auth/callback/google` (local dev)
     - `https://<your-production-domain>/api/auth/callback/google`
4. **Copy the Client ID and Client Secret** into `.env` (local) and into
   the production environment (see `docs/deployment.md`):
   ```
   GOOGLE_CLIENT_ID="xxxxxxxxxx.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="xxxxxxxxxx"
   ```
5. **Set `ALLOWED_EMAIL_DOMAINS`** in `.env` to the college's real email
   domain(s), comma-separated (e.g. `psncet.ac.in`). Google sign-in is
   rejected for any address outside this list unless it's the one
   `INITIAL_ADMIN_EMAILS` bootstrap exception (see the Security notes in
   `README.md`).

## How the app verifies a Google sign-in

This is already built (`src/lib/auth.ts`) — nothing further to configure,
but it's worth knowing what's checked on every Google sign-in:

- The email must be verified (`email_verified` claim from Google).
- The email's domain must be in `ALLOWED_EMAIL_DOMAINS`, or the exact
  address must be the personal-email bootstrap exception.
- If Google supplies an `hd` (hosted domain) claim for a genuine Workspace
  account, it's cross-checked against the email's own domain.
- The user must already exist in the database (created by Admin or CSV
  import) and be `ACTIVE` — there is no self-registration.

## Known gap

No real Google OAuth Client ID/Secret has been provided to this project
yet, so the Google sign-in path has only been verified by code review, not
by an actual live sign-in — see `docs/pending-credentials.md`.
