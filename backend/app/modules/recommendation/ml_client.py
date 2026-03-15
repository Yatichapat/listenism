from typing import Any

import httpx

from app.shared.config import settings


class MLClient:
	def __init__(self) -> None:
		self.base_url = settings.ml_service_url.rstrip("/")

	def get_recommendations(self, user_id: int) -> list[dict[str, Any]]:
		try:
			response = httpx.get(
				f"{self.base_url}/recommend",
				params={"user_id": user_id},
				timeout=3,
			)
			response.raise_for_status()
			data = response.json()
			if isinstance(data, list):
				return data
		except Exception:
			pass

		return [
			{"song_id": 1, "score": 0.92},
			{"song_id": 2, "score": 0.87},
			{"song_id": 3, "score": 0.79},
		]
