# Secret Rotation Policy

This document outlines the steps for rotating critical secrets in EuroGrant AI.

## JWT Secret Key (`JWT_SECRET`)
**Frequency:** Every 90 days, or immediately if compromised.
**Procedure:**
1. Generate a new secret: `openssl rand -hex 32`
2. Update `.env` file or environment variables in staging/production.
3. Restart backend service.
**Impact:** All active sessions will be invalidated. Users will need to log in again.

## Database Password (`POSTGRES_PASSWORD`)
**Frequency:** Every 180 days.
**Procedure:**
1. Connect to Postgres as superuser.
2. `ALTER USER eurogrant WITH PASSWORD 'new_secure_password';`
3. Update `.env` with the new password.
4. Restart backend and worker containers.

## Redis Password (`REDIS_PASSWORD`)
**Frequency:** Every 180 days.
**Procedure:**
1. Update `.env` with the new password.
2. Restart Redis container and all dependent services (backend, worker, beat).

## Stripe Secret Key (`STRIPE_SECRET_KEY`)
**Frequency:** Only if compromised.
**Procedure:**
1. Roll the key in the Stripe Dashboard.
2. Update the `.env` value.
3. Restart the backend service.

## OpenAI API Key (`OPENAI_API_KEY`)
**Frequency:** Every 90 days.
**Procedure:**
1. Create a new key in the OpenAI (or NVIDIA NIM proxy) dashboard.
2. Update the `.env` value.
3. Restart the backend **and** worker services (both call the LLM/embeddings).
4. Delete the old key from the provider.

## Stripe Webhook Secret (`STRIPE_WEBHOOK_SECRET`)
**Frequency:** Only if compromised, or when the webhook endpoint changes.
**Procedure:**
1. Roll the signing secret in the Stripe Dashboard (Developers → Webhooks).
2. Update the `.env` value and restart the backend.
**Impact:** Until updated, all incoming webhooks fail signature verification (400)
and subscription state stops syncing. Rotate during a low-traffic window and confirm
with a Stripe CLI `stripe trigger invoice.paid` afterwards.

## Pinecone API Key (`PINECONE_API_KEY`)
**Frequency:** Every 180 days, or immediately if compromised.
**Procedure:**
1. Create a new key in the Pinecone console; delete the old one after cutover.
2. Update `.env` and restart backend + worker.
**Impact:** In staging/production a missing/invalid key blocks boot (fail-fast); in
dev, matching degrades honestly rather than fabricating scores.

## AWS Credentials (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`)
**Frequency:** Every 90 days.
**Procedure:**
1. Create a new IAM access key alongside the old one (keys can coexist).
2. Update `.env`, restart backend + worker (S3 storage and SES email).
3. Verify an upload and an email send, then deactivate and delete the old key.

## Sentry DSN (`SENTRY_DSN` / frontend DSN)
**Frequency:** Only if compromised (a DSN is low-sensitivity but still not public).
**Procedure:**
1. Rotate the DSN / project key in Sentry.
2. Update backend `.env` and the frontend build env, redeploy both.

---

## Rotation Tracking

Record each rotation so the next due date is unambiguous. Keep in a secure ops log,
not in the repo.

| Secret | Cadence | Last rotated | Next due | Owner |
|--------|---------|--------------|----------|-------|
| `JWT_SECRET` | 90d | | | |
| `POSTGRES_PASSWORD` | 180d | | | |
| `REDIS_PASSWORD` | 180d | | | |
| `STRIPE_SECRET_KEY` | on compromise | | | |
| `STRIPE_WEBHOOK_SECRET` | on compromise | | | |
| `OPENAI_API_KEY` | 90d | | | |
| `PINECONE_API_KEY` | 180d | | | |
| `AWS_ACCESS_KEY_ID` / secret | 90d | | | |
| `SENTRY_DSN` | on compromise | | | |

After any suspected exposure, rotate immediately regardless of cadence, then audit
access logs for use of the old secret before its rotation timestamp.
