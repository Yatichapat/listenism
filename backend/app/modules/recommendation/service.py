from app.modules.recommendation.ml_client import MLClient


class RecommendationService:
	def __init__(self, ml_client: MLClient) -> None:
		self.ml_client = ml_client

	def get_for_user(self, user_id: int, limit: int = 10) -> dict:
		items = self.ml_client.get_recommendations(user_id, limit=limit)
		return {"user_id": user_id, "items": items}
