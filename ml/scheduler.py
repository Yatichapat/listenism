"""Nightly scheduler for recommender model training."""

from __future__ import annotations

from pathlib import Path
import importlib
import logging
import os
from typing import Any

from piplines.train import train_model

logger = logging.getLogger(__name__)

_scheduler: Any | None = None


def _train_job() -> None:
	try:
		train_model()
		logger.info("Nightly recommendation model retraining completed")
	except Exception:
		logger.exception("Nightly recommendation model retraining failed")


def start_scheduler() -> Any:
	global _scheduler
	if _scheduler is not None:
		return _scheduler

	background_module = importlib.import_module("apscheduler.schedulers.background")
	cron_module = importlib.import_module("apscheduler.triggers.cron")
	BackgroundScheduler = getattr(background_module, "BackgroundScheduler")
	CronTrigger = getattr(cron_module, "CronTrigger")

	model_path = Path(os.getenv("MODEL_PATH", "models/cf_model.pkl"))
	run_bootstrap_train = os.getenv("RUN_BOOTSTRAP_TRAIN", "1") == "1"

	if run_bootstrap_train and not model_path.exists():
		_train_job()

	scheduler = BackgroundScheduler(timezone=os.getenv("TZ", "UTC"))
	scheduler.add_job(
		_train_job,
		trigger=CronTrigger(hour=2, minute=0),
		id="nightly_recommender_train",
		replace_existing=True,
	)
	scheduler.start()
	_scheduler = scheduler
	logger.info("Nightly recommendation scheduler started")
	return scheduler


def stop_scheduler() -> None:
	global _scheduler
	if _scheduler is not None:
		_scheduler.shutdown(wait=False)
		_scheduler = None
