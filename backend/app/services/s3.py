import boto3
import os
from botocore.exceptions import ClientError
from fastapi import HTTPException, UploadFile, status
import logging
import shutil
from pathlib import Path

logger = logging.getLogger(__name__)

class S3Service:
    def __init__(self):
        self.storage_backend = os.getenv('STORAGE_BACKEND', 's3').lower()
        if self.storage_backend == 's3':
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
                aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
                region_name=os.getenv('AWS_REGION', 'eu-central-1')
            )
            self.bucket_name = os.getenv('S3_BUCKET_NAME')
        else:
            # Use backend root for local storage
            self.local_path = Path("tmp/uploads")
            self.local_path.mkdir(parents=True, exist_ok=True)
            logger.info(f"Using local storage at {self.local_path.absolute()}")

    def _validate_local_path(self, s3_key: str) -> Path:
        """Validate s3_key to prevent path traversal attacks (CWE-22)."""
        # Reject any path component that tries to escape local_path
        dest_path = (self.local_path / s3_key).resolve()
        if not dest_path.is_relative_to(self.local_path.resolve()):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file path: traversal attempt detected"
            )
        return dest_path

    async def upload_fileobj(self, file: UploadFile, s3_key: str) -> str:
        if self.storage_backend == 'local':
            try:
                dest_path = self._validate_local_path(s3_key)
                dest_path.parent.mkdir(parents=True, exist_ok=True)
                with dest_path.open("wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)
                return s3_key
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Failed to save locally: {e}")
                raise HTTPException(status_code=500, detail="Failed to save file to local storage")

        try:
            self.s3_client.upload_fileobj(
                file.file,
                self.bucket_name,
                s3_key,
                ExtraArgs={'ContentType': file.content_type}
            )
            return s3_key
        except ClientError as e:
            logger.error(f"Failed to upload to S3: {e}")
            raise HTTPException(status_code=500, detail="Failed to upload file to storage")

    def get_fileobj(self, s3_key: str) -> bytes:
        if self.storage_backend == 'local':
            try:
                dest_path = self._validate_local_path(s3_key)
                return dest_path.read_bytes()
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Failed to read locally: {e}")
                raise HTTPException(status_code=500, detail="Failed to read file from local storage")

        try:
            response = self.s3_client.get_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            return response['Body'].read()
        except ClientError as e:
            logger.error(f"Failed to download from S3: {e}")
            raise HTTPException(status_code=500, detail="Failed to download file from storage")

s3_service = S3Service()
