# Load Tests

Locust load test for EuroGrant AI's hot paths, plus the latency/error budgets a
run is measured against.

## Prerequisites

```
pip install locust
```

Point `--host` at a running stack (dev, or ideally a staging deploy that mirrors
prod resources). Load-testing against SQLite/dev is only useful for smoke checks —
budgets below assume Postgres + Redis + real workers.

## Run

Interactive UI (http://localhost:8089):

```
locust -f load_tests/locustfile.py --host http://localhost:8000
```

Authenticated (protected paths return 200 instead of 401). Supply a JWT the API
accepts via its Bearer fallback:

```
LOAD_TEST_TOKEN=<jwt> locust -f load_tests/locustfile.py --host https://staging.eurogrant.ai
```

Headless, with percentile CSVs written to `load_tests/results_*.csv`:

```
locust -f load_tests/locustfile.py --host http://localhost:8000 \
    --headless -u 50 -r 5 -t 2m --csv load_tests/results
```

`-u` users, `-r` ramp/sec, `-t` duration. Locust reports p50/p95/p99 per endpoint
in the summary and in `results_stats.csv`.

## Coverage

| Endpoint | Method | Weight | Auth |
|----------|--------|--------|------|
| `/health` | GET | 1 | none |
| `/api/v1/grants/search` | POST | 3 | required (401 when anonymous) |
| `/api/v1/proposals` | GET | 1 | required (401 when anonymous) |

Proposal *generation* is deliberately excluded — it's an async LLM job, not a
synchronous request, and is load-shaped by worker throughput and queue depth
(below), not HTTP latency.

## Latency & error budgets

Targets for a run at 50 concurrent users. Tune to the deployment's resources and
re-baseline after infra changes; treat regressions against a prior baseline as the
real signal.

| Path | p95 target | Notes |
|------|-----------|-------|
| `/health` | < 50 ms | Async DB + Redis pings; a spike means a dependency is slow |
| `/api/v1/grants/search` | < 800 ms | Vector query + cached explanations |
| `/api/v1/proposals` | < 300 ms | Paginated DB read |

Error budget: **< 1%** non-acceptable responses across the run. A 401 under an
anonymous run is *not* an error (it's the measured auth path); a 401 under an
authenticated run is.

## Worker queue depth

HTTP latency doesn't capture async backpressure. While a load run drives proposal
creation, watch the Celery queue so you know when workers are the bottleneck:

```
# Active/reserved tasks and per-worker stats
docker compose exec worker celery -A app.worker.celery_app inspect active
docker compose exec worker celery -A app.worker.celery_app inspect stats

# Broker-side backlog (default queue key is "celery")
docker compose exec redis redis-cli -a "$REDIS_PASSWORD" LLEN celery
```

A steadily growing `LLEN` means enqueue rate exceeds worker throughput — add worker
replicas or raise concurrency. Record the queue depth alongside the p95 numbers so a
run's results are interpretable.
