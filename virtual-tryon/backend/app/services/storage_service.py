"""
Object storage service for MinIO (S3-compatible).
Handles uploading, downloading, and deleting image files
from the object storage bucket.
"""

import io
from typing import Optional

import boto3
import structlog
from botocore.exceptions import ClientError

from app.core.config import settings

logger = structlog.get_logger(__name__)


class StorageService:
    """
    Manages file operations against MinIO/S3-compatible object storage.
    Provides methods for upload, download, delete, and URL generation.
    """

    def __init__(self):
        """Initialize the S3 client with MinIO endpoint configuration."""
        self.client = boto3.client(
            "s3",
            endpoint_url=f"{'https' if settings.STORAGE_USE_SSL else 'http'}://{settings.STORAGE_ENDPOINT}",
            aws_access_key_id=settings.STORAGE_ACCESS_KEY,
            aws_secret_access_key=settings.STORAGE_SECRET_KEY,
            region_name=settings.STORAGE_REGION,
        )
        self.bucket_name = settings.STORAGE_BUCKET_NAME

    def ensure_bucket_exists(self):
        """Create the storage bucket if it does not already exist."""
        try:
            self.client.head_bucket(Bucket=self.bucket_name)
            logger.info("storage_bucket_exists", bucket=self.bucket_name)
        except ClientError:
            self.client.create_bucket(Bucket=self.bucket_name)
            logger.info("storage_bucket_created", bucket=self.bucket_name)

    def upload_file(
        self,
        content: bytes,
        storage_path: str,
        content_type: str = "image/jpeg",
    ) -> str:
        """
        Upload a file to object storage.
        Returns the full URL to the uploaded object.
        """
        try:
            self.client.put_object(
                Bucket=self.bucket_name,
                Key=storage_path,
                Body=io.BytesIO(content),
                ContentType=content_type,
                ContentLength=len(content),
            )
            url = self.get_file_url(storage_path)
            logger.info("file_uploaded", path=storage_path, size=len(content))
            return url
        except ClientError as e:
            logger.error("upload_failed", path=storage_path, error=str(e))
            raise

    def download_file(self, storage_path: str) -> bytes:
        """Download a file from object storage and return its bytes."""
        try:
            response = self.client.get_object(
                Bucket=self.bucket_name,
                Key=storage_path,
            )
            return response["Body"].read()
        except ClientError as e:
            logger.error("download_failed", path=storage_path, error=str(e))
            raise

    def delete_file(self, storage_path: str) -> bool:
        """Delete a file from object storage. Returns True if successful."""
        try:
            self.client.delete_object(
                Bucket=self.bucket_name,
                Key=storage_path,
            )
            logger.info("file_deleted", path=storage_path)
            return True
        except ClientError as e:
            logger.error("delete_failed", path=storage_path, error=str(e))
            return False

    def get_file_url(self, storage_path: str) -> str:
        """Generate the public URL for a stored object."""
        protocol = "https" if settings.STORAGE_USE_SSL else "http"
        return f"{protocol}://{settings.STORAGE_ENDPOINT}/{self.bucket_name}/{storage_path}"

    def generate_presigned_url(
        self, storage_path: str, expiration: int = 3600
    ) -> str:
        """
        Generate a presigned URL for temporary access to a private object.
        Default expiration is 1 hour (3600 seconds).
        """
        try:
            url = self.client.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": self.bucket_name,
                    "Key": storage_path,
                },
                ExpiresIn=expiration,
            )
            return url
        except ClientError as e:
            logger.error("presigned_url_failed", path=storage_path, error=str(e))
            raise


# Singleton storage service instance
storage_service = StorageService()
