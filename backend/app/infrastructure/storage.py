import json

import boto3
from botocore.exceptions import ClientError

from app.shared.config import settings


def get_s3_client():
	return boto3.client(
		"s3",
		endpoint_url=settings.s3_endpoint_url,
		aws_access_key_id=settings.s3_access_key,
		aws_secret_access_key=settings.s3_secret_key,
	)


def get_public_file_url(file_key: str) -> str:
	if file_key.startswith("http://") or file_key.startswith("https://"):
		return file_key
	return f"{settings.s3_public_endpoint_url}/{settings.s3_bucket}/{file_key}"


def _ensure_bucket_exists(client) -> None:
	try:
		client.head_bucket(Bucket=settings.s3_bucket)
	except ClientError:
		client.create_bucket(Bucket=settings.s3_bucket)


def _ensure_public_read_policy(client) -> None:
	policy = {
		"Version": "2012-10-17",
		"Statement": [
			{
				"Effect": "Allow",
				"Principal": "*",
				"Action": ["s3:GetObject"],
				"Resource": [f"arn:aws:s3:::{settings.s3_bucket}/*"],
			}
		],
	}
	client.put_bucket_policy(Bucket=settings.s3_bucket, Policy=json.dumps(policy))


def upload_bytes(data: bytes, file_key: str, content_type: str | None = None) -> str:
	client = get_s3_client()
	_ensure_bucket_exists(client)
	try:
		_ensure_public_read_policy(client)
	except ClientError:
		pass
	extra_args = {"ContentType": content_type} if content_type else {}
	client.put_object(Bucket=settings.s3_bucket, Key=file_key, Body=data, **extra_args)
	return file_key
