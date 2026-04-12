from fastapi import APIRouter, Depends, Query

from app.modules.recommendation.ml_client import MLClient
from app.modules.recommendation.service import RecommendationService
from app.shared.deps import current_user_id

router = APIRouter()
service = RecommendationService(MLClient())


@router.get("/for-you")
def for_you(
	limit: int = Query(10, ge=1, le=50),
	user_id: int = Depends(current_user_id),
) -> dict:
	return service.get_for_user(user_id, limit=limit)
