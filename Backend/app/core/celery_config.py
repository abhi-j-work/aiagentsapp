# backend/app/core/celery_config.py
"""
Celery configuration for the application.
"""
from celery import Celery

# Redis URL for Celery broker and backend.
# This should match the service name in docker-compose.yml if running in docker.
# For local development, localhost is fine.
REDIS_URL = "redis://localhost:6379/0"

celery_app = Celery(
    "worker",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["app.jobs.tasks"] # Points to the tasks module
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
)
