# File: app/api/routers/evaluation_router.py

import logging
import json
import httpx
import asyncio
from pathlib import Path
from fastapi import APIRouter, HTTPException, Depends

from app.core.config import Settings, get_settings
from app.api import models

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/evaluation", tags=["Agent Evaluation"])

# This URL MUST point to the application's own API prefix.
API_BASE_URL = "http://127.0.0.1:10239/api" 
GOLDEN_DATASET_DIR = Path(__file__).parent.parent.parent.parent / "evaluation/golden_datasets"

# ... (rest of the helper functions: run_talk_to_db_eval, run_data_quality_eval, run_data_governance_eval) ...
# The helper functions provided in the previous turn are correct and do not need to be pasted again.

@router.post("/run-all", summary="Run all benchmark evaluations for all agents")
async def run_all_evaluations(settings: Settings = Depends(get_settings)):
    eval_conn_str = settings.EVAL_DB_CONNECTION_STRING
    if not eval_conn_str:
        raise HTTPException(status_code=500, detail="EVAL_DB_CONNECTION_STRING is not configured on the server.")

    async with httpx.AsyncClient() as client:
        talk_db_path = GOLDEN_DATASET_DIR / "talk_to_db_benchmark.jsonl"
        dq_path = GOLDEN_DATASET_DIR / "data_quality_benchmark.jsonl"
        gov_path = GOLDEN_DATASET_DIR / "data_governance_benchmark.jsonl"
        
        talk_to_db_tasks = []
        if talk_db_path.exists():
            with open(talk_db_path, 'r') as f:
                dataset = [json.loads(line) for line in f]
            talk_to_db_tasks = [run_talk_to_db_eval(client, eval_conn_str, item["prompt"], item["golden_sql"]) for item in dataset]
        
        dq_tasks = []
        if dq_path.exists():
            with open(dq_path, 'r') as f:
                dataset = [json.loads(line) for line in f]
            dq_tasks = [run_data_quality_eval(client, eval_conn_str, item["table_name"]) for item in dataset]

        gov_tasks = []
        if gov_path.exists():
            gov_tasks.append(run_data_governance_eval(client, eval_conn_str))

        results = await asyncio.gather(*(talk_to_db_tasks + dq_tasks + gov_tasks))
        
        talk_to_db_results = results[:len(talk_to_db_tasks)]
        dq_results = results[len(talk_to_db_tasks):len(talk_to_db_tasks) + len(dq_tasks)]
        gov_results = results[len(talk_to_db_tasks) + len(dq_tasks):]

    successful_talk_db = [r for r in talk_to_db_results if r["status"] == "SUCCESS"]
    avg_score_talk_db = sum(r["score"] for r in successful_talk_db) / len(successful_talk_db) if successful_talk_db else 0
    talk_to_db_summary = {
        "agent": "Talk-to-DB", "status": "Completed" if talk_to_db_tasks else "No Dataset",
        "average_score": round(avg_score_talk_db, 2), "total_prompts": len(talk_to_db_tasks)
    }

    successful_dq = [r for r in dq_results if r["status"] == "SUCCESS"]
    avg_score_dq = sum(r["score"] for r in successful_dq) / len(successful_dq) if successful_dq else 0
    dq_summary = {
        "agent": "Data Quality", "status": "Completed" if dq_tasks else "No Dataset",
        "average_score": round(avg_score_dq, 2), "total_prompts": len(dq_tasks)
    }

    gov_result = gov_results[0] if gov_results else None
    gov_summary = {"agent": "Data Governance", "status": "No Dataset", "average_score": 0, "total_prompts": 0}
    if gov_result:
        gov_summary.update({
            "status": "Completed" if gov_result["status"] == "SUCCESS" else "Failed",
            "average_score": round(gov_result.get("score", 0), 2),
            "total_prompts": 1
        })

    return {
        "summary_report": [talk_to_db_summary, dq_summary, gov_summary],
        "detailed_results": {
            "talk_to_db": talk_to_db_results,
            "data_quality": dq_results,
            "data_governance": gov_results
        }
    }
# Note: The helper functions (run_talk_to_db_eval etc.) are omitted for brevity but should be included as they were in the previous turn.