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

# This configuration is correct based on your previous input.
router = APIRouter(prefix="/evaluation", tags=["Agent Evaluation"])
API_BASE_URL = "http://127.0.0.1:1028"
GOLDEN_DATASET_DIR = Path(__file__).parent.parent.parent.parent / "evaluation/golden_datasets"

# Helper functions (run_talk_to_db_eval, etc.) are correct and do not need to be changed.
# They are omitted here for brevity but should be in your file.
# ... PASTE YOUR HELPER FUNCTIONS HERE ...
async def run_talk_to_db_eval(client: httpx.AsyncClient, conn_str: str, prompt: str, golden_sql: str) -> dict:
    payload = {"connection_string": conn_str, "prompt": prompt}
    try:
        response = await client.post(f"{API_BASE_URL}/talk-to-db/query", json=payload, timeout=60.0)
        response.raise_for_status()
        result_data = response.json()
        evaluation = result_data.get("evaluation", {})
        return { "prompt": prompt, "status": "SUCCESS", "generated_sql": result_data.get("generated_sql"), "golden_sql": golden_sql, "score": evaluation.get("score", 0), "reasoning": evaluation.get("reasoning", "N/A"), "latency_ms": response.elapsed.total_seconds() * 1000 }
    except Exception as e:
        return {"prompt": prompt, "status": "SCRIPT_ERROR", "score": 0, "reasoning": str(e)}

async def run_data_quality_eval(client: httpx.AsyncClient, conn_str: str, table_name: str) -> dict:
    payload = {"connection_string": conn_str, "table_name": table_name}
    prompt = f"Generate DQ plan for table: {table_name}"
    try:
        response = await client.post(f"{API_BASE_URL}/data-quality/generate-quality-plan", json=payload, timeout=120.0)
        response.raise_for_status()
        result_data = response.json()
        evaluation = result_data.get("evaluation", {})
        return { "prompt": prompt, "status": "SUCCESS", "score": evaluation.get("score", 0), "reasoning": evaluation.get("reasoning", "N/A"), "latency_ms": response.elapsed.total_seconds() * 1000 }
    except Exception as e:
        return {"prompt": prompt, "status": "SCRIPT_ERROR", "score": 0, "reasoning": str(e)}

async def run_data_governance_eval(client: httpx.AsyncClient, conn_str: str) -> dict:
    payload = {"connection_string": conn_str}
    prompt = "Classify data for the entire database schema"
    try:
        response = await client.post(f"{API_BASE_URL}/data-gov/classify_data", json=payload, timeout=180.0)
        response.raise_for_status()
        result_data = response.json()
        evaluation = result_data.get("evaluation", {})
        return { "prompt": prompt, "status": "SUCCESS", "score": evaluation.get("score", 0), "reasoning": evaluation.get("reasoning", "N/A"), "latency_ms": response.elapsed.total_seconds() * 1000 }
    except Exception as e:
        return {"prompt": prompt, "status": "SCRIPT_ERROR", "score": 0, "reasoning": str(e)}


# ====================================================================
# MAIN API ENDPOINT WITH DIAGNOSTICS
# ====================================================================

@router.post("/run-all", summary="Run all benchmark evaluations for all agents")
async def run_all_evaluations(settings: Settings = Depends(get_settings)):
    eval_conn_str = 'postgresql://postgres:postgres@localhost:5432/postgres'
    if not eval_conn_str:
        raise HTTPException(status_code=500, detail="EVAL_DB_CONNECTION_STRING is not configured.")

    # --- START: DIAGNOSTIC PRINTING ---
    # This will print the exact paths being checked to your backend terminal.
    print("\n--- Running Evaluation Diagnostics ---")
    print(f"Checking for Golden Dataset Directory at: {GOLDEN_DATASET_DIR.resolve()}")

    talk_db_path = GOLDEN_DATASET_DIR / "talk_to_db_benchmark.jsonl"
    dq_path = GOLDEN_DATASET_DIR / "data_quality_benchmark.jsonl"
    gov_path = GOLDEN_DATASET_DIR / "data_governance_benchmark.jsonl"
    
    print(f"Checking for Talk-to-DB file: {talk_db_path.resolve()} -> Exists: {talk_db_path.exists()}")
    print(f"Checking for Data Quality file: {dq_path.resolve()} -> Exists: {dq_path.exists()}")
    print(f"Checking for Data Governance file: {gov_path.resolve()} -> Exists: {gov_path.exists()}")
    print("--- End Diagnostics ---\n")
    # --- END: DIAGNOSTIC PRINTING ---

    async with httpx.AsyncClient() as client:
        # The rest of the logic is correct
        # ... (The logic to create tasks, gather results, and summarize them is correct and omitted for brevity) ...
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

    successful_talk_db = [r for r in talk_to_db_results if r.get("status") == "SUCCESS"]
    avg_score_talk_db = sum(r["score"] for r in successful_talk_db) / len(successful_talk_db) if successful_talk_db else 0
    talk_to_db_summary = {
        "agent": "Talk-to-DB", "status": "Completed" if talk_to_db_tasks else "No Dataset",
        "average_score": round(avg_score_talk_db, 2), "total_prompts": len(talk_to_db_tasks)
    }

    successful_dq = [r for r in dq_results if r.get("status") == "SUCCESS"]
    avg_score_dq = sum(r["score"] for r in successful_dq) / len(successful_dq) if successful_dq else 0
    dq_summary = {
        "agent": "Data Quality", "status": "Completed" if dq_tasks else "No Dataset",
        "average_score": round(avg_score_dq, 2), "total_prompts": len(dq_tasks)
    }

    gov_result = gov_results[0] if gov_results else None
    gov_summary = {"agent": "Data Governance", "status": "No Dataset", "average_score": 0, "total_prompts": 0}
    if gov_result:
        gov_summary.update({
            "status": "Completed" if gov_result.get("status") == "SUCCESS" else "Failed",
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