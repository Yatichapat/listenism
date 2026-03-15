import boto3

from app.shared.config import settings


def get_s3_client():
	return boto3.client(
		"s3",
		endpoint_url=settings.s3_endpoint_url,
		aws_access_key_id=settings.s3_access_key,
		aws_secret_access_key=settings.s3_secret_key,
	)


def get_public_file_url(file_key: str) -> str:
	return f"{settings.s3_endpoint_url}/{settings.s3_bucket}/{file_key}"
