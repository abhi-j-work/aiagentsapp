# AI Agents App

This project is a multi-agent application with a FastAPI backend and a React frontend. It includes a feature for local model training and management.

## Features

- **Data Governance Agent**: Analyze, classify, and apply masking policies.
- **Data Lineage Agent**: Discover and visualize data lineage.
- **Talk to DB Agent**: Query your database using natural language.
- **Data Quality Agent**: Profile data and manage data quality checks.
- **Model Training**: Fine-tune models locally, track experiments with MLflow, and manage models in a registry.

## Setup and Installation

### Prerequisites

- Docker and Docker Compose
- Python 3.10+ and pip
- Node.js and npm

### 1. Start Infrastructure

This project uses Docker Compose to manage the necessary infrastructure services: MLflow and Redis.

To start the services, run:
```bash
make up
# or
docker-compose up -d
```
This will start:
- An MLflow server, accessible at `http://localhost:5000`.
- A Redis instance, accessible at `localhost:6379`.

### 2. Install Dependencies

**Backend (Python):**
```bash
pip install -r Backend/requirements.txt
```

**Frontend (React):**
```bash
cd frontend/React_FE/react_AI_agent
npm install
cd ../../..
```

### 3. Configure Environment

Create a `.env` file in the `Backend` directory by copying the example file:
```bash
cp .env.example Backend/.env
```
Update `Backend/.env` with your `GROQ_API_KEY` and database credentials.

## Running the Application

You need to run three processes in separate terminals:

**1. Backend Server:**
```bash
make start-backend
# or
cd Backend && uvicorn app.main:app --reload --port 8000
```

**2. Celery Worker:**
```bash
make start-workers
# or
cd Backend && celery -A app.jobs.tasks worker --loglevel=info
```

**3. Frontend Development Server:**
```bash
cd frontend/React_FE/react_AI_agent
npm run dev
```

You can now access:
- **Frontend UI**: `http://localhost:5173`
- **MLflow UI**: `http://localhost:5000`

## Model Training and Promotion

1.  **Start a Training Job**:
    -   Navigate to the "Training" page in the UI (`/training/runs`).
    -   Click "Start New Job".
    -   Fill out the form and click "Start Training".

2.  **Monitor the Job**:
    -   The "Runs" page shows the status of all training jobs.
    -   You can view logs and link to the MLflow run for more details.

3.  **Promote a Model**:
    -   Go to the "Models" page (`/training/models`).
    -   Here you can see all registered models and their versions.
    -   Click the "Promote" button to move a model to a different stage (e.g., "Staging" or "Production").
    -   Promoting a model to "Production" will make it the active model for the LLM service.

## Running Tests

To run the unit and integration tests, use the following command from the root directory:
```bash
make smoke-test
```
This will start the MLflow container, run the tests, and then stop the container.

## Acceptance Criteria

-   [ ] `docker-compose up -d` brings MLflow UI at `http://localhost:5000` and Redis at `6379`.
-   [ ] Frontend form can start a job and backend returns a `job_id` and `mlflow_run_id`.
-   [ ] Celery worker processes the job and MLflow logs: params, metrics, artifacts.
-   [ ] Validators run and log `json_parse_rate` and `sql_static_pass_rate` metrics.
-   [ ] A model can be registered in MLflow registry and promoted to `Staging` via API.
-   [ ] `llm_service` config is updated to point to the promoted model URI.
-   [ ] Integration smoke test runs (tiny dataset) in CI using CPU and asserts artifact existence.