# EuroGrant AI Runbook

Operational procedures for running, deploying, and recovering EuroGrant AI.
Audience: on-call engineers. Keep this current — a stale runbook is worse than none.

## Service Architecture

| Service | Tech | Role |
|---------|------|------|
| `nginx` | nginx:alpine | Reverse proxy, TLS termination, security headers |
| `frontend` | Next.js 16 (node:20) | App Router UI |
| `backend` | FastAPI (python:3.11) | REST API, auth, billing |
| `worker` | Celery | Async proposal generation, document processing, scraping |
| `beat` | Celery Beat | Scheduled jobs (daily scrape 02:00 UTC, hourly match scan) |
| `db` | PostgreSQL 15 | Transactional data |
| `redis` | Redis | Celery broker + rate-limit / lockout store |

External dependencies: Pinecone (vectors), OpenAI-compatible LLM (via NVIDIA NIM proxy),
Stripe (billing), S3-compatible storage, AWS SES (email), Sentry (errors).

## Environments

- Dev: `docker compose up` (uses `docker-compose.override.yml` automatically).
- Prod/staging: **must** pass both compose files so the dev override never leaks in:

  ```
  docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
  ```

  The prod file adds `restart: unless-stopped` to every service and healthchecks
  for `worker`/`beat`. `ENVIRONMENT=staging|production` turns on fail-fast config
  validation (`app/config.py`): the app refuses to boot if a required secret
  (`OPENAI_API_KEY`, `PINECONE_API_KEY`, `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, AWS/S3 creds) is missing.

## Routine Operations

Start: `docker compose up -d`
Logs: `docker compose logs -f [backend|frontend|worker|beat|db|redis]`
Status: `docker compose ps`

Migrations:
- Create: `docker compose exec backend alembic revision --autogenerate -m "msg"`
- Apply: `docker compose exec backend alembic upgrade head`
- Roll back one: `docker compose exec backend alembic downgrade -1`

## Deploy

CI (`.github/workflows/ci.yml`) builds and pushes images to GHCR on every push to
`main` (`ghcr.io/<owner>/<repo>/backend|frontend`, tagged with the commit SHA and
`latest`). The `deploy-staging` job then boots the backend image in
`ENVIRONMENT=staging` and imports the app to confirm production-mode config
validation passes before any external rollout.

To deploy a specific build to a host:
1. `docker pull ghcr.io/<owner>/<repo>/backend:<sha>` (and `/frontend`).
2. Update the running stack to the new tag and `docker compose ... up -d`.
3. Apply migrations: `docker compose exec backend alembic upgrade head`.
4. Verify `/health` returns `200` with `"status":"healthy"`.

Wiring an automated deploy: set the `STAGING_DEPLOY_WEBHOOK` repo secret and the
`deploy-staging` job will POST the image reference to it; unset, it validates and
skips cleanly.

## Rollback

1. Identify the last-good image SHA (previous green `main` run in Actions).
2. Repoint the stack to `…/backend:<good-sha>` and `up -d`.
3. If the bad deploy ran a migration, roll it back **before** starting old code:
   `docker compose exec backend alembic downgrade <previous_revision>`.
   Check the current revision with `alembic current`. Never start old code against
   a newer schema without confirming the migration is backward-compatible.
4. If schema rollback is unsafe (destructive migration), restore from backup —
   see "Database Corruption / Rollback" below.

## On-Call Triage

First response to any alert:
1. `docker compose ps` — is anything unhealthy or restarting?
2. `curl -s localhost:8000/health | jq` — which dependency is `error`?
   - `database: error` → check `db` container and connection count.
   - `redis: error` → check `redis`; note rate-limiting/lockout degrade (see below).
   - `lockout_degraded: true` → Redis is unreachable for the lockout store; account
     lockout protection is degraded. Treat as security-relevant, not cosmetic.
3. Check Sentry for a spike and grab the `X-Request-ID` from the failing response —
   every request/log line is correlated by it (`app/logging_config.py`).
4. `docker compose logs --tail=200 <service>` for the implicated service.

## Common Failures

- **App won't boot in staging/prod, exits immediately.** Fail-fast config
  validation rejected a missing secret or an embedding-dimension mismatch. Read the
  first log line — it names the offending key. Fix the env, redeploy.
- **`/health` shows `redis: error`.** Rate limiting and account lockout fall back to
  degraded behaviour. Restart `redis`; if it persists, the lockout store is down and
  brute-force protection is weakened — prioritise.
- **Proposals stuck "generating".** Inspect the worker: `docker compose exec worker
  celery -A app.worker.celery_app inspect active` and `... inspect stats`. If the
  queue is backed up, scale workers (add replicas) or check the LLM provider.
- **Matches look wrong / all similar scores.** Pinecone may be unconfigured. In
  staging/prod, matching returns `503` rather than fabricated scores; in dev it
  returns an honest `degraded: true` marker. Verify `PINECONE_API_KEY` and the index.
- **Billing state wrong after payment.** Check `BillingWebhookEvent` for the Stripe
  event id (idempotency) and the webhook signature — a rotated
  `STRIPE_WEBHOOK_SECRET` will 400 all webhooks.

## Database Corruption / Rollback

### Backups

`scripts/backup_db.sh [file]` runs `pg_dump -F c` inside the `db` container and copies
the dump to the host. Schedule it on the host (the script shells into the running
container, so run it from the host cron, not a sidecar):

```
# /etc/cron.d/eurogrant-backup — daily 01:30 UTC, keep 14 days
30 1 * * * deploy cd /opt/eurogrant && ./scripts/backup_db.sh backups/db_$(date +\%Y\%m\%d).dump && find backups -name 'db_*.dump' -mtime +14 -delete
```

Store backups off-host (e.g. sync `backups/` to a separate S3 bucket). A backup on the
same disk as the database is not a backup.

### Restore Drill

Restore is only real if it's been rehearsed. Quarterly, on a throwaway environment:

1. Take a fresh backup: `./scripts/backup_db.sh /tmp/drill.dump`
2. Restore it: `./scripts/restore_db.sh /tmp/drill.dump`
   (Terminates connections, drops and recreates the DB, `pg_restore -1` transactional.)
3. `docker compose exec backend alembic current` — confirm schema head matches code.
4. Smoke test: log in, list grants, open a proposal. Confirm row counts are sane.
5. Record the drill date and the restore wall-clock time (your RTO evidence).

Real incident restore: same steps 2–4 against the affected environment, using the
most recent off-host backup.

## Monitoring & Alerts

Prometheus metrics are exposed on `/metrics` (`prometheus-fastapi-instrumentator`).
Start the monitoring stack with the `infra` profile:

```
docker compose --profile infra up -d   # Prometheus :9090, Alertmanager :9093
```

Prometheus scrapes `backend:8000/metrics` (`deploy/prometheus/prometheus.yml`).
CI failures post to Slack when `SLACK_WEBHOOK_URL` is set (`notify-failure` job).
Sentry captures backend (FastAPI + Celery) and frontend exceptions when
`SENTRY_DSN` / the frontend DSN are configured; it no-ops otherwise.
