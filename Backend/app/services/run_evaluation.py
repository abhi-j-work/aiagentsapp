# File: app/api/routers/evaluation_router.py

import logging
import json
import httpx
import asyncio
from pathlib import Path
from fastapi import APIRouter, HTTPException, Depends, Request

from app.core.config import Settings, get_settings
from app.api import models

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/evaluation", tags=["Agent Evaluation"])

# This path should now be correct after you moved the folder
GOLDEN_DATASET_DIR = Path(__file__).parent.parent.parent.parent / "Backend/evaluation/golden_datasets"

# ====================================================================
# Helper Functions (No changes needed here)
# ====================================================================

async def run_talk_to_db_eval(client: httpx.AsyncClient, base_url: str, conn_str: str, prompt: str, golden_sql: str) -> dict:
    """Runs a single Talk-to-DB evaluation with detailed logging."""
    payload = {"connection_string": conn_str, "prompt": prompt}
    endpoint = f"{base_url}talk-to-db/query"
    logger.info(f"[Talk-to-DB] Calling endpoint for prompt: '{prompt[:30]}...'")
    try:
        response = await client.post(endpoint, json=payload, timeout=60.0)
        response.raise_for_status() 
        result_data = response.json()
        evaluation = result_data.get("evaluation", {})
        return {
            "prompt": prompt, "status": "SUCCESS", "generated_sql": result_data.get("generated_sql"),
            "golden_sql": golden_sql, "score": evaluation.get("score", 0),
            "reasoning": evaluation.get("reasoning", "N/A"), "latency_ms": response.elapsed.total_seconds() * 1000,
        }
    except httpx.HTTPStatusError as e:
        logger.error(f"[Talk-to-DB] HTTP Error for prompt '{prompt}': {e.response.text}")
        return {"prompt": prompt, "status": "API_ERROR", "score": 0, "reasoning": e.response.text}
    except Exception as e:
        logger.error(f"[Talk-to-DB] Script Error for prompt '{prompt}': {e}")
        return {"prompt": prompt, "status": "SCRIPT_ERROR", "score": 0, "reasoning": str(e)}

async def run_data_quality_eval(client: httpx.AsyncClient, base_url: str, conn_str: str, table_name: str) -> dict:
    """Runs a single Data Quality evaluation with detailed logging."""
    payload = {"connection_string": conn_str, "table_name": table_name}
    prompt = f"Generate DQ plan for table: {table_name}"
    endpoint = f"{base_url}data-quality/generate-quality-plan"
    logger.info(f"[Data Quality] Calling endpoint for table: '{table_name}'")
    try:
        response = await client.post(endpoint, json=payload, timeout=120.0)
        response.raise_for_status()
        result_data = response.json()
        evaluation = result_data.get("evaluation", {})
        return {
            "prompt": prompt, "status": "SUCCESS", "score": evaluation.get("score", 0),
            "reasoning": evaluation.get("reasoning", "N/A"), "latency_ms": response.elapsed.total_seconds() * 1000,
        }
    except httpx.HTTPStatusError as e:
        logger.error(f"[Data Quality] HTTP Error for table '{table_name}': {e.response.text}")
        return {"prompt": prompt, "status": "API_ERROR", "score": 0, "reasoning": e.response.text}
    except Exception as e:
        logger.error(f"[Data Quality] Script Error for table '{table_name}': {e}")
        return {"prompt": prompt, "status": "SCRIPT_ERROR", "score": 0, "reasoning": str(e)}

async def run_data_governance_eval(client: httpx.AsyncClient, base_url: str, conn_str: str) -> dict:
    """Runs a two-step Data Governance evaluation with detailed logging."""
    prompt = "Classify data for the entire database schema"
    try:
        logger.info("[Data Gov] Starting Step 1: Extract Schema")
        schema_payload = {"connection_string": conn_str}
        schema_endpoint = f"{base_url}data-gov/schema"
        schema_response = await client.post(schema_endpoint, json=schema_payload, timeout=180.0)
        schema_response.raise_for_status()
        schema_data = schema_response.json().get("schema_data")
        if not schema_data:
            raise Exception("Failed to extract schema.")
        
        logger.info("[Data Gov] Starting Step 2: Classify Data")
        classify_payload = {"schema_data": schema_data}
        classify_endpoint = f"{base_url}data-gov/classify_data"
        classify_response = await client.post(classify_endpoint, json=classify_payload, timeout=180.0)
        classify_response.raise_for_status()
        result_data = classify_response.json()
        evaluation = result_data.get("evaluation", {})
        return {
            "prompt": prompt, "status": "SUCCESS", "score": evaluation.get("score", 0),
            "reasoning": evaluation.get("reasoning", "N/A"),
            "latency_ms": (schema_response.elapsed + classify_response.elapsed).total_seconds() * 1000,
        }
    except httpx.HTTPStatusError as e:
        logger.error(f"[Data Gov] HTTP Error: {e.response.text}")
        return {"prompt": prompt, "status": "API_ERROR", "score": 0, "reasoning": f"Failed at {e.request.url}. Body: {e.response.text}"}
    except Exception as e:
        logger.error(f"[Data Gov] Script Error: {e}")
        return {"prompt": prompt, "status": "SCRIPT_ERROR", "score": 0, "reasoning": str(e)}


# ====================================================================
# MAIN API ENDPOINT WITH RATE LIMITING
# ====================================================================

@router.post("/run-all", summary="Run all benchmark evaluations for all agents")
async def run_all_evaluations(request: Request, settings: Settings = Depends(get_settings)):
    logger.info("="*20 + " Starting All Evaluations " + "="*20)
    
    eval_conn_str = 'postgresql://postgres:postgres@localhost:5432/postgres'
    base_url = str(request.base_url)

    # --- Load Golden Datasets ---
    logger.info(f"Checking for datasets in: {GOLDEN_DATASET_DIR.resolve()}")
    talk_db_path = GOLDEN_DATASET_DIR / "talk_to_db_benchmark.jsonl"
    dq_path = GOLDEN_DATASET_DIR / "data_quality_benchmark.jsonl"
    gov_path = GOLDEN_DATASET_DIR / "data_governance_benchmark.jsonl"
    
    logger.info(f"Data Governance file exists: {gov_path.exists()}")

    # --- Semaphore to limit concurrent requests to avoid rate limiting ---
    semaphore = asyncio.Semaphore(2)

    # Wrapper to run a task within the semaphore's control
    async def sem_task(coro):
        async with semaphore:
            await asyncio.sleep(1) 
            return await coro

    async with httpx.AsyncClient() as client:
        tasks = []
        
        talk_to_db_prompts = 0
        if talk_db_path.exists():
            with open(talk_db_path, 'r') as f: dataset = [json.loads(line) for line in f]
            talk_to_db_prompts = len(dataset)
            for item in dataset:
                tasks.append(sem_task(run_talk_to_db_eval(client, base_url, eval_conn_str, item["prompt"], item["golden_sql"])))
        
        dq_prompts = 0
        if dq_path.exists():
            with open(dq_path, 'r') as f: dataset = [json.loads(line) for line in f]
            dq_prompts = len(dataset)
            for item in dataset:
                tasks.append(sem_task(run_data_quality_eval(client, base_url, eval_conn_str, item["table_name"])))

        gov_prompts = 0
        if gov_path.exists():
            gov_prompts = 1
            tasks.append(sem_task(run_data_governance_eval(client, base_url, eval_conn_str)))
        
        if not tasks:
            logger.warning("No evaluation tasks created. Check if golden dataset files exist.")
            return {"summary_report": [], "detailed_results": {}}

        logger.info(f"Created {talk_to_db_prompts} Talk-to-DB, {dq_prompts} Data Quality, and {gov_prompts} Data Governance tasks.")
        logger.info(f"Executing {len(tasks)} tasks with a concurrency limit of 2...")
        
        all_results = await asyncio.gather(*tasks)
        logger.info("All tasks have completed.")

        talk_to_db_results = all_results[:talk_to_db_prompts]
        dq_results = all_results[talk_to_db_prompts : talk_to_db_prompts + dq_prompts]
        gov_results = all_results[talk_to_db_prompts + dq_prompts :]

    # --- Calculate and return summaries ---
    successful_talk_db = [r for r in talk_to_db_results if r.get("status") == "SUCCESS"]
    avg_score_talk_db = sum(r["score"] for r in successful_talk_db) / len(successful_talk_db) if successful_talk_db else 0
    talk_to_db_summary = {"agent": "Talk-to-DB", "status": "Completed" if talk_to_db_prompts > 0 else "No Dataset", "average_score": round(avg_score_talk_db, 2), "total_prompts": talk_to_db_prompts}

    successful_dq = [r for r in dq_results if r.get("status") == "SUCCESS"]
    avg_score_dq = sum(r["score"] for r in successful_dq) / len(successful_dq) if successful_dq else 0
    dq_summary = {"agent": "Data Quality", "status": "Completed" if dq_prompts > 0 else "No Dataset", "average_score": round(avg_score_dq, 2), "total_prompts": dq_prompts}

    gov_result = gov_results[0] if gov_results else None
    gov_summary = {"agent": "Data Governance", "status": "No Dataset", "average_score": 0, "total_prompts": 0}
    if gov_result:
        gov_summary.update({"status": "Completed" if gov_result.get("status") == "SUCCESS" else "Failed", "average_score": round(gov_result.get("score", 0), 2), "total_prompts": 1})

    logger.info("="*20 + " Finished All Evaluations " + "="*20 + "\n")

    return {
        "summary_report": [talk_to_db_summary, dq_summary, gov_summary],
        "detailed_results": {
            "talk_to_db": talk_to_db_results,
            "data_quality": dq_results,
            "data_governance": gov_results
        }
    }