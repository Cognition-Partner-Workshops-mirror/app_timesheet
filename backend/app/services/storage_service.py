"""
CareAI Storage Service
Handles file uploads and downloads using AWS S3 or MinIO (open-source S3-compatible).
Falls back to local filesystem storage when S3 is not configured.
Supports health records, prescriptions, profile images, and lab reports.
"""

import os
import uuid
import logging
from typing import Optional
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError, NoCredentialsError

from app.config import settings

logger = logging.getLogger(__name__)


class StorageService:
    """
    Unified file storage service supporting AWS S3 and local filesystem.
    Uses S3 when credentials are configured, otherwise falls back to local storage.
    Compatible with MinIO for self-hosted open-source deployments.
    """

    def __init__(self):
        self._s3_client = None
        # Initialize S3 client if credentials are available
        if settings.s3_configured:
            self._init_s3_client()
        else:
            logger.info("S3 not configured - using local filesystem storage")
            # Ensure local upload directory exists
            os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    def _init_s3_client(self):
        """Initialize the boto3 S3 client with configured credentials.
        Supports both AWS S3 and MinIO (via endpoint_url).
        """
        try:
            client_kwargs = {
                "service_name": "s3",
                "region_name": settings.S3_REGION,
                "aws_access_key_id": settings.S3_ACCESS_KEY_ID,
                "aws_secret_access_key": settings.S3_SECRET_ACCESS_KEY,
            }
            # Set custom endpoint for MinIO or other S3-compatible services
            if settings.S3_ENDPOINT_URL:
                client_kwargs["endpoint_url"] = settings.S3_ENDPOINT_URL

            self._s3_client = boto3.client(**client_kwargs)
            # Ensure the bucket exists (create if not)
            self._ensure_bucket_exists()
            logger.info(f"S3 storage initialized - bucket: {settings.S3_BUCKET_NAME}")
        except (ClientError, NoCredentialsError) as e:
            logger.warning(f"S3 initialization failed: {e}. Falling back to local storage.")
            self._s3_client = None

    def _ensure_bucket_exists(self):
        """Create the S3 bucket if it doesn't already exist."""
        try:
            self._s3_client.head_bucket(Bucket=settings.S3_BUCKET_NAME)
        except ClientError:
            try:
                # Create bucket with region constraint for non-us-east-1 regions
                if settings.S3_REGION != "us-east-1":
                    self._s3_client.create_bucket(
                        Bucket=settings.S3_BUCKET_NAME,
                        CreateBucketConfiguration={"LocationConstraint": settings.S3_REGION},
                    )
                else:
                    self._s3_client.create_bucket(Bucket=settings.S3_BUCKET_NAME)
                logger.info(f"Created S3 bucket: {settings.S3_BUCKET_NAME}")
            except ClientError as e:
                logger.error(f"Failed to create S3 bucket: {e}")

    @property
    def is_s3_enabled(self) -> bool:
        """Check if S3 storage is active and available."""
        return self._s3_client is not None

    def _generate_s3_key(self, folder: str, filename: str) -> str:
        """Generate a unique S3 object key with folder structure.
        Format: folder/YYYY/MM/uuid_filename
        """
        now = datetime.now(timezone.utc)
        unique_id = uuid.uuid4().hex[:8]
        # Sanitize filename to prevent path traversal
        safe_filename = os.path.basename(filename)
        return f"{folder}/{now.year}/{now.month:02d}/{unique_id}_{safe_filename}"

    async def upload_file(
        self,
        file_content: bytes,
        filename: str,
        content_type: str = "application/octet-stream",
        folder: str = "uploads",
    ) -> dict:
        """
        Upload a file to S3 or local storage.
        Returns dict with file_url, file_key, and storage_type.

        Args:
            file_content: Raw file bytes to upload
            filename: Original filename
            content_type: MIME type of the file
            folder: S3 folder/prefix (e.g., 'health-records', 'prescriptions', 'avatars')
        """
        if self.is_s3_enabled:
            return await self._upload_to_s3(file_content, filename, content_type, folder)
        return await self._upload_to_local(file_content, filename, folder)

    async def _upload_to_s3(
        self,
        file_content: bytes,
        filename: str,
        content_type: str,
        folder: str,
    ) -> dict:
        """Upload file to AWS S3 / MinIO bucket."""
        s3_key = self._generate_s3_key(folder, filename)
        try:
            self._s3_client.put_object(
                Bucket=settings.S3_BUCKET_NAME,
                Key=s3_key,
                Body=file_content,
                ContentType=content_type,
                # Server-side encryption for HIPAA compliance
                ServerSideEncryption="AES256",
            )
            # Build the file URL based on endpoint configuration
            if settings.S3_ENDPOINT_URL:
                # MinIO URL format
                file_url = f"{settings.S3_ENDPOINT_URL}/{settings.S3_BUCKET_NAME}/{s3_key}"
            else:
                # AWS S3 URL format
                file_url = f"https://{settings.S3_BUCKET_NAME}.s3.{settings.S3_REGION}.amazonaws.com/{s3_key}"

            logger.info(f"File uploaded to S3: {s3_key}")
            return {
                "file_url": file_url,
                "file_key": s3_key,
                "storage_type": "s3",
                "bucket": settings.S3_BUCKET_NAME,
            }
        except ClientError as e:
            logger.error(f"S3 upload failed: {e}")
            # Fallback to local storage on S3 error
            return await self._upload_to_local(file_content, filename, folder)

    async def _upload_to_local(
        self,
        file_content: bytes,
        filename: str,
        folder: str,
    ) -> dict:
        """Upload file to local filesystem as fallback storage."""
        folder_path = os.path.join(settings.UPLOAD_DIR, folder)
        os.makedirs(folder_path, exist_ok=True)

        # Generate unique filename to prevent collisions
        unique_id = uuid.uuid4().hex[:8]
        safe_filename = os.path.basename(filename)
        local_filename = f"{unique_id}_{safe_filename}"
        file_path = os.path.join(folder_path, local_filename)

        with open(file_path, "wb") as f:
            f.write(file_content)

        logger.info(f"File uploaded locally: {file_path}")
        return {
            "file_url": f"/uploads/{folder}/{local_filename}",
            "file_key": file_path,
            "storage_type": "local",
        }

    async def get_presigned_url(self, s3_key: str, expires_in: int = 3600) -> Optional[str]:
        """
        Generate a presigned URL for secure temporary file access.
        Presigned URLs expire after the specified duration (default 1 hour).
        Only available when S3 is enabled.
        """
        if not self.is_s3_enabled:
            return None
        try:
            url = self._s3_client.generate_presigned_url(
                "get_object",
                Params={"Bucket": settings.S3_BUCKET_NAME, "Key": s3_key},
                ExpiresIn=expires_in,
            )
            return url
        except ClientError as e:
            logger.error(f"Failed to generate presigned URL: {e}")
            return None

    async def delete_file(self, file_key: str, storage_type: str = "s3") -> bool:
        """
        Delete a file from S3 or local storage.
        Returns True if deletion was successful.
        """
        if storage_type == "s3" and self.is_s3_enabled:
            try:
                self._s3_client.delete_object(
                    Bucket=settings.S3_BUCKET_NAME,
                    Key=file_key,
                )
                logger.info(f"File deleted from S3: {file_key}")
                return True
            except ClientError as e:
                logger.error(f"S3 deletion failed: {e}")
                return False
        else:
            # Local file deletion
            try:
                if os.path.exists(file_key):
                    os.remove(file_key)
                    logger.info(f"File deleted locally: {file_key}")
                    return True
                return False
            except OSError as e:
                logger.error(f"Local file deletion failed: {e}")
                return False

    async def list_files(self, folder: str, max_keys: int = 100) -> list:
        """List files in an S3 folder/prefix. Returns list of file keys."""
        if not self.is_s3_enabled:
            return []
        try:
            response = self._s3_client.list_objects_v2(
                Bucket=settings.S3_BUCKET_NAME,
                Prefix=folder,
                MaxKeys=max_keys,
            )
            return [obj["Key"] for obj in response.get("Contents", [])]
        except ClientError as e:
            logger.error(f"S3 list failed: {e}")
            return []


# Global storage service instance
storage_service = StorageService()
