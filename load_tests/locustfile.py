"""Locust load test for EuroGrant AI (Wave 5).

Exercises the hot read/write paths — ``/health``, ``/grants/search``, and
``/proposals`` — and reports latency percentiles (Locust prints p50/p95/p99
natively and via ``--csv``).

Authentication is optional and driven by ``LOAD_TEST_TOKEN`` (a JWT accepted via
the Bearer fallback). With a token, the protected paths must return 200 and a
401 is a real failure. Without one, a 401 is treated as a reachable response so
the run still measures the routing + auth latency instead of reporting every
request as failed.

Run:
    locust -f load_tests/locustfile.py --host http://localhost:8000
    LOAD_TEST_TOKEN=<jwt> locust -f load_tests/locustfile.py --host https://staging.eurogrant.ai

Headless with percentile CSVs:
    locust -f load_tests/locustfile.py --host http://localhost:8000 \
        --headless -u 50 -r 5 -t 2m --csv load_tests/results
"""

import os

from locust import HttpUser, between, task

_TOKEN = os.getenv("LOAD_TEST_TOKEN", "")


class EuroGrantUser(HttpUser):
    wait_time = between(1, 5)

    def on_start(self) -> None:
        """Attach the bearer token once per simulated user, if provided."""
        self.authenticated = bool(_TOKEN)
        if self.authenticated:
            self.client.headers["Authorization"] = f"Bearer {_TOKEN}"

    def _acceptable(self, response, ok_when_anonymous=(401,)) -> None:
        """Mark a response success/failure by whether we're authenticated.

        Authenticated runs demand a 200; anonymous runs accept the documented
        unauthenticated status so the routing/auth latency is still measured.
        """
        if response.status_code == 200:
            response.success()
        elif not self.authenticated and response.status_code in ok_when_anonymous:
            response.success()
        else:
            response.failure(f"unexpected status {response.status_code}")

    @task(1)
    def health(self) -> None:
        with self.client.get("/health", name="/health", catch_response=True) as response:
            # /health returns 503 when a dependency is degraded — surface that.
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"health status {response.status_code}")

    @task(3)
    def search_grants(self) -> None:
        with self.client.post(
            "/api/v1/grants/search",
            json={"query": "AI research", "limit": 10},
            name="/api/v1/grants/search",
            catch_response=True,
        ) as response:
            self._acceptable(response)

    @task(1)
    def list_proposals(self) -> None:
        with self.client.get(
            "/api/v1/proposals/",
            name="/api/v1/proposals",
            catch_response=True,
        ) as response:
            self._acceptable(response)
