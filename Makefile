.PHONY: up start-backend start-workers smoke-test

up:
	docker-compose up -d

start-backend:
	cd Backend && uvicorn app.main:app --reload --port 8000

start-workers:
	cd Backend && celery -A app.jobs.tasks worker --loglevel=info

smoke-test:
	docker-compose up -d mlflow
	pytest Backend/tests/test_integration.py
	docker-compose down
