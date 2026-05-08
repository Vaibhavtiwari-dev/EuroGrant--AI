# ADR-0001: Local Storage Fallback for Development

## Status
Accepted

## Context
Local development environments often lack access to real S3 buckets, leading to crashes when placeholder AWS keys are used. We need a way to develop and test document uploads without requiring valid AWS credentials.

## Decision
Implement a `STORAGE_BACKEND` toggle in the S3 service. 
- If set to `s3` (default), it uses the standard `boto3` client.
- If set to `local`, the service bypasses `boto3` and saves/reads files from the local filesystem at `backend/tmp/uploads/`.
- Introduce a `get_fileobj` abstraction in `S3Service` to unify file retrieval across backends.

## Consequences
- **Positive:** Local development is unblocked and safer.
- **Positive:** Tests can run in local mode without mocking the internal S3 client directly.
- **Negative:** `backend/tmp/uploads` must be ignored by git.
- **Risk:** Minor logic divergence between backends, mitigated by the common abstraction used in the worker.
