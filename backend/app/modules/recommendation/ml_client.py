from typing import Any

import httpx

from app.shared.config import settings


class MLClient:
	def __init__(self) -> None:
		self.base_url = settings.ml_service_url.rstrip("/")

	def get_recommendations(self, user_id: int, limit: int = 10) -> list[dict[str, Any]]:
		try:
			response = httpx.get(
				f"{self.base_url}/recommend",
				params={"user_id": user_id, "n": limit},
				timeout=3,
			)
			response.raise_for_status()
			data = response.json()
			if isinstance(data, list):
				return data
		except Exception:
			pass

		return []
