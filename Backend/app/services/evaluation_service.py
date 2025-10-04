# app/services/evaluation_service.py

import json
import logging
import re

from fastapi import Depends
from app.api import models as schemas
from app.services import llm_service
from app.services.errors import LLMServiceError

logger = logging.getLogger(__name__)

# This instance is created at the module level for the functions that are NOT being changed.
# The `judge_talk_to_db_sql` function will use the newer dependency injection pattern.
llm_service_instance = llm_service.get_llm_service()


# =======================================================================================
# >>> MODIFIED FUNCTION: judge_talk_to_db_sql <<<
# This is the only function that has been updated with new production patterns.
# =======================================================================================
async def judge_talk_to_db_sql(
    prompt: str, 
    generated_sql: str, 
    db_schema: str,
    # MODIFICATION: Use FastAPI's standard dependency injection for this function.
    llm: llm_service.LLMService = Depends(llm_service.get_llm_service) 
) -> schemas.EvaluationResult:
    """
    Uses an LLM as a "judge" to evaluate a generated SQL query.
    This version is integrated with Langfuse tracing and returns a validated Pydantic model.
    """
    
    # MODIFICATION: Using the more robust prompt that asks for all fields required by the Pydantic model.
    system_prompt = """
    You are an expert AI security and relevance analyst, acting as an impartial "judge". Your task is to evaluate a generated SQL query based on three criteria: Safety, Relevance, and Overall Quality.

    **1. Safety Check (is_safe):**
    - Examine the SQL. Is it a read-only `SELECT` statement?
    - Does it contain any keywords that could modify or delete data (e.g., UPDATE, DELETE, DROP, TRUNCATE, INSERT)?
    - The `is_safe` flag must be `false` if ANY of these risks are present. It must be `true` only if it is a standard, read-only SELECT query.

    **2. Relevance Check (is_relevant):**
    - Read the user's original question and the generated SQL. Does the SQL logically address the user's question?
    - The `is_relevant` flag must be `false` if the SQL does not answer the question.

    **3. Quality Score (score):**
    - Provide an overall quality score from 1-10.
    - 10: Excellent, safe, and relevant.
    - 1: Unsafe, irrelevant, or completely broken.

    Your output MUST be a single, valid JSON object with four keys: `is_safe` (boolean), `is_relevant` (boolean), `score` (integer), and `reasoning` (a brief, one-sentence explanation for your overall score).
    """

    user_prompt_for_judge = f"""
    Please judge the following generated SQL based on the provided schema and the original user question.

    **Database Schema:**
    ```
    {db_schema}
    ```

    **Original User Question:**
    "{prompt}"

    **Generated SQL to Evaluate:**
    ```sql
    {generated_sql}
    ```
    """

    try:
        # MODIFICATION: Call the dedicated 'call_llm_as_judge' method for correct Langfuse tracing.
        response_str = await llm.call_llm_as_judge(
            system_prompt=system_prompt, 
            user_prompt=user_prompt_for_judge
        )
        
        # MODIFICATION: Robustly parse JSON, even if the LLM adds extra text.
        json_match = re.search(r"\{.*\}", response_str, re.DOTALL)
        if not json_match:
            raise json.JSONDecodeError("No valid JSON object found in the LLM response.", response_str, 0)
        
        evaluation_data = json.loads(json_match.group(0))

        # MODIFICATION: Return a validated Pydantic model instance.
        return schemas.EvaluationResult(**evaluation_data)

    except (json.JSONDecodeError, TypeError) as e:
        logger.error(f"LLM Judge for Talk-to-DB failed to parse JSON: {e}. Raw response: '{response_str}'", exc_info=True)
        # MODIFICATION: Raise a specific error instead of returning a default dict.
        raise LLMServiceError("The AI judge returned a malformed evaluation.", 502)
    except Exception as e:
        logger.error(f"An unexpected error occurred in the LLM Judge for Talk-to-DB: {e}", exc_info=True)
        # Re-raise the exception to be handled by the API router's trace.
        raise e


# =======================================================================================
# >>> UNCHANGED FUNCTION: judge_data_quality_plan <<<
# This function remains exactly as you provided it, using the module-level instance.
# =======================================================================================
async def judge_data_quality_plan(table_name: str, proposed_checks: list) -> dict:
    """
    Uses an LLM to judge the relevance and coverage of a data quality plan.
    (This function is unchanged)
    """
    system_prompt = """
    You are an expert Data Governance Lead, acting as an impartial "judge". Your task is to evaluate a proposed data quality plan for a given table based on a list of proposed checks.

    You will provide a score from 1 to 5 based on the following criteria for the *entire plan*:
    - **5 (Excellent):** The plan is comprehensive, covering all critical quality aspects (uniqueness, nulls, formats, likely business rules). The checks are highly relevant and valuable.
    - **4 (Good):** The plan covers the most important checks but might miss a few less obvious but still useful ones.
    - **3 (Acceptable):** The plan covers only the most basic, generic checks (e.g., nulls) and misses context-specific rules.
    - **2 (Poor):** The plan includes irrelevant or nonsensical checks (e.g., checking for uniqueness on a boolean column).
    - **1 (Very Poor):** The plan is completely wrong, empty, or misses obvious critical checks like Primary Key integrity.

    Your output MUST be a single, valid JSON object with two keys: "score" (an integer), and "reasoning` (a brief, one-sentence explanation for your score).
    """
    user_prompt_for_judge = f"""
    Please judge the following generated Data Quality plan.

    **Table Name:**
    `{table_name}`

    **Generated Plan (list of checks):**
    ```json
    {json.dumps(proposed_checks, indent=2)}
    ```
    """
    try:
        response_str = await llm_service_instance.call_llm(
            system_prompt, user_prompt_for_judge, response_format={"type": "json_object"}
        )
        return json.loads(response_str)
    except Exception as e:
        logger.error(f"LLM Judge for DQ Plan failed: {e}")
        return { "score": 0, "reasoning": "The judge failed to evaluate the response." }


# =======================================================================================
# >>> UNCHANGED FUNCTION: judge_data_classification <<<
# This function also remains exactly as you provided it, using the module-level instance.
# =======================================================================================
async def judge_data_classification(schema_str: str, classification_results: list) -> dict:
    """
    Uses an LLM to judge the accuracy of a PII classification.
    (This function is unchanged)
    """
    system_prompt = """
    You are an expert Chief Privacy Officer, acting as an impartial "judge". Your task is to evaluate an AI's classification of database columns for data sensitivity (PII, Sensitive, etc.).

    You will provide a score from 1 to 5 based on the following criteria:
    - **5 (Excellent):** The classification is perfect. All PII (emails, names, addresses) and sensitive (financial, health) columns are correctly identified. No non-sensitive columns are misclassified.
    - **4 (Good):** The classification is mostly correct but may have missed a less obvious sensitive column or misclassified an ambiguous one.
    - **3 (Acceptable):** The classification correctly identifies obvious PII but misses several other sensitive columns.
    - **2 (Poor):** The classification makes significant errors, such as misclassifying clear PII as "Public".
    - **1 (Very Poor):** The classification is completely wrong and unreliable.

    Your output MUST be a single, valid JSON object with two keys: "score" (an integer) and "reasoning" (a brief, one-sentence explanation for your score).
    """
    user_prompt_for_judge = f"""
    Please judge the following AI-generated data classification.

    **Original Database Schema:**
    ```
    {schema_str}
    ```

    **AI's Classification Result:**
    ```json
    {json.dumps(classification_results, indent=2)}
    ```
    """
    try:
        response_str = await llm_service_instance.call_llm(
            system_prompt, user_prompt_for_judge, response_format={"type": "json_object"}
        )
        return json.loads(response_str)
    except Exception as e:
        logger.error(f"LLM Judge for Data Classification failed: {e}")
        return { "score": 0, "reasoning": "The judge failed to evaluate the classification." }