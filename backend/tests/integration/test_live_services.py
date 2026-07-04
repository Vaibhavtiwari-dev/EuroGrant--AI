"""Opt-in integration tests against real external services (Wave 5).

These are the confidence tests the mocked unit suite cannot give: they prove the
real OpenAI/Pinecone/Stripe wiring works end to end. They are **skipped by default**
so the hermetic unit suite stays fast and offline — the whole module is skipped
unless ``RUN_LIVE_TESTS`` is set, and each test additionally skips when its specific
credential is absent.

Run locally (with real keys exported):

    RUN_LIVE_TESTS=1 pytest tests/integration/test_live_services.py -v

In CI they run only in the scheduled ``live-integration`` workflow, which injects
keys from repository secrets and skips cleanly when they are not configured.
"""

import hashlib
import hmac
import json
import os
import time

import pytest

pytestmark = pytest.mark.live

if os.getenv("RUN_LIVE_TESTS", "").lower() not in {"1", "true", "yes"}:
    pytest.skip(
        "RUN_LIVE_TESTS not set — skipping live external-service tests.",
        allow_module_level=True,
    )

from fastapi.testclient import TestClient  # noqa: E402

from app.config import settings  # noqa: E402
from app.main import app  # noqa: E402
from app.services.proposal_gen import get_proposal_service  # noqa: E402
from app.services.vector_db import get_vector_service, reset_vector_service  # noqa: E402


def _require(env_var: str) -> None:
    """Skip the current test unless the named credential is present."""
    if not os.getenv(env_var) and not getattr(settings, env_var, None):
        pytest.skip(f"{env_var} not configured for live test")


# ---------------------------------------------------------------------------
# OpenAI embeddings — dimension coherence
# ---------------------------------------------------------------------------


def test_live_embedding_matches_configured_dimension():
    """A real embedding call returns exactly EMBEDDING_DIMENSION floats.

    This is the runtime half of the Wave 1 embedding-coherence guard: config
    default (text-embedding-3-small / 1536) and .env.example
    (nv-embedqa-e5-v5 / 1024) disagree, so the only safe check is that the
    *configured* model actually emits the *configured* dimension.
    """
    _require("OPENAI_API_KEY")
    reset_vector_service()
    service = get_vector_service()

    embedding = service.generate_embeddings("EU innovation grant funding for SMEs")

    assert isinstance(embedding, list)
    assert len(embedding) == settings.EMBEDDING_DIMENSION
    assert all(isinstance(value, float) for value in embedding)


# ---------------------------------------------------------------------------
# Pinecone — upsert then query round-trip
# ---------------------------------------------------------------------------


def test_live_pinecone_upsert_and_query_roundtrip():
    """Upsert a uniquely-identified grant, then find it via semantic query."""
    _require("OPENAI_API_KEY")
    _require("PINECONE_API_KEY")
    reset_vector_service()
    service = get_vector_service()
    if service.index is None:
        pytest.skip("Pinecone index unavailable in this environment")

    grant_id = int(time.time())  # unique per run; avoids cross-run collisions
    text = "Grant for renewable energy storage research and battery innovation."
    service.upsert_grant(grant_id, text, {"title": "Live Test Grant", "sector": "Energy"})

    try:
        # Pinecone is eventually consistent — poll briefly before asserting.
        found = False
        for _ in range(10):
            if grant_id in service.query_grants(text, limit=10):
                found = True
                break
            time.sleep(2)
        assert found, f"grant {grant_id} not returned by query within timeout"
    finally:
        service.index.delete(ids=[f"grant_{grant_id}_chunk_0"], namespace="grants")


# ---------------------------------------------------------------------------
# LLM — real proposal-section generation path
# ---------------------------------------------------------------------------


def test_live_llm_generates_section_text():
    """The configured LLM returns non-empty text through the proposal service.

    Pragmatic smoke test of the generation path (the real client + model +
    base URL) without standing up full DB context.
    """
    _require("OPENAI_API_KEY")
    service = get_proposal_service()

    output = service._call_llm(
        "You are an expert EU grant proposal writer.",
        "Write one concise sentence describing the objective of an SME innovation grant.",
    )

    assert isinstance(output, str)
    assert output.strip()


# ---------------------------------------------------------------------------
# Stripe — real webhook signature verification (test mode)
# ---------------------------------------------------------------------------


def _stripe_signature(payload: bytes, secret: str) -> str:
    """Build a Stripe-format signature header for a raw payload."""
    timestamp = int(time.time())
    signed_payload = f"{timestamp}.".encode() + payload
    digest = hmac.new(secret.encode(), signed_payload, hashlib.sha256).hexdigest()
    return f"t={timestamp},v1={digest}"


def test_live_stripe_webhook_signature_is_accepted():
    """A correctly-signed test-mode webhook passes real signature crypto.

    Unlike the unit suite (which patches construct_event), this exercises the
    actual ``stripe.Webhook.construct_event`` path with the configured test
    webhook secret. The event targets a non-existent subscription so handling
    is a safe no-op; the assertion is that the signature is accepted (not 400).
    """
    _require("STRIPE_WEBHOOK_SECRET")
    secret = os.getenv("STRIPE_WEBHOOK_SECRET") or settings.STRIPE_WEBHOOK_SECRET

    event = {
        "id": f"evt_live_{int(time.time())}",
        "type": "invoice.paid",
        "data": {"object": {"subscription": "sub_live_nonexistent", "customer": "cus_x"}},
    }
    payload = json.dumps(event).encode()

    client = TestClient(app)
    response = client.post(
        "/api/v1/billing/webhook",
        content=payload,
        headers={"stripe-signature": _stripe_signature(payload, secret)},
    )

    assert response.status_code != 400, "valid signature was rejected"
    assert response.status_code == 200
