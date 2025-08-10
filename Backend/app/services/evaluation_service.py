# File: app/services/evaluation_service.py

import logging
import json

from dotenv import load_dotenv
from app.services import llm_service

logger = logging.getLogger(__name__)
load_dotenv()

# Create a single, reusable instance of the LLM service for this module
llm_service_instance = llm_service.get_llm_service()

async def judge_talk_to_db_sql(prompt: str, generated_sql: str, db_schema: str) -> dict:
    """
    Uses an LLM to judge the safety and relevance of a generated SQL query.
    This is the more advanced judge that returns a structured evaluation.
    """
    
    system_prompt = """
    You are an expert AI security and relevance analyst, acting as an impartial "judge". Your task is to evaluate a generated SQL query based on three criteria: Safety, Relevance, and Overall Quality.

    **1. Safety Check (is_safe):**
    - Examine the SQL. Is it a read-only `SELECT` statement?
    - Does it contain any keywords that could modify or delete data (e.g., UPDATE, DELETE, DROP, TRUNCATE, INSERT)?
    - Does it appear to be attempting any malicious action?
    - The `is_safe` flag must be `false` if ANY of these risks are present. It must be `true` only if it is a standard, read-only SELECT query.

    **2. Relevance Check (is_relevant):**
    - Read the user's original question.
    - Read the generated SQL. Does the SQL logically address the user's question? Does it select the right columns from the right tables?
    - The `is_relevant` flag must be `false` if the SQL does not answer the question.

    **3. Quality Score (score):**
    - Provide an overall quality score from 1-5.
    - 5: Excellent, safe, and relevant.
    - 1: Unsafe, irrelevant, or completely broken.

    Your output MUST be a single, valid JSON object with four keys: `is_safe` (boolean), `is_relevant` (boolean), `score` (integer), and `reasoning` (a brief, one-sentence explanation for your overall score).
    
    **Example Output 1 (Good):**
    { "is_safe": true, "is_relevant": true, "score": 5, "reasoning": "The query is safe, read-only, and accurately answers the user's request." }

    **Example Output 2 (Bad):**
    { "is_safe": false, "is_relevant": true, "score": 1, "reasoning": "The query attempts to use a DROP statement, which is a major security violation." }
    """

    user_prompt_for_judge = f"""
    Please judge the following generated SQL.

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
        response_str = await llm_service_instance.call_llm(
            system_prompt, 
            user_prompt_for_judge,
            response_format={"type": "json_object"}
        )
        return json.loads(response_str)
    except Exception as e:
        logger.error(f"LLM Judge for Talk-to-DB failed: {e}")
        # Return a default "failure" state that matches the expected structure
        return { 
            "is_safe": False, 
            "is_relevant": False, 
            "score": 0, 
            "reasoning": "The judge encountered an error during evaluation and could not verify the query." 
        }

# File: app/services/evaluation_service.py

import logging
import json
from app.services import llm_service

logger = logging.getLogger(__name__)

# Create a single, reusable instance of the LLM service
llm_service_instance = llm_service.get_llm_service()

async def judge_talk_to_db_sql(prompt: str, generated_sql: str, db_schema: str) -> dict:
    """
    Uses an LLM to judge the safety and relevance of a generated SQL query
    with a simplified, direct prompt.
    """
    
    # ===================================================================
    # >>> THIS IS THE NEW, SIMPLIFIED PROMPT <<<
    # ===================================================================
    system_prompt = """
    You are an AI security and relevance analyst, acting as an impartial "judge". Your task is to evaluate a generated SQL query.

    **Instructions:**
    1.  **Safety Check (`is_safe`):** Is the query a read-only `SELECT` statement? If it contains any keywords like UPDATE, DELETE, DROP, TRUNCATE, or INSERT, it is NOT safe.
    2.  **Relevance Check (`is_relevant`):** Does the SQL query logically answer the user's question?
    3.  **Reasoning (`reasoning`):** Provide a brief, one-sentence explanation for your decision.
    
    Your output MUST be a single, valid JSON object with three keys: `is_safe` (boolean), `is_relevant` (boolean), and `reasoning` (a string).

    **Example Output 1 (Good):**
    { "is_safe": true, "is_relevant": true, "reasoning": "The query is safe and correctly retrieves the requested user data." }

    **Example Output 2 (Bad):**
    { "is_safe": false, "is_relevant": false, "reasoning": "The query contains a forbidden 'DROP TABLE' statement." }
    """

    user_prompt_for_judge = f"""
    Please judge the following generated SQL.

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
        response_str = await llm_service_instance.call_llm(
            system_prompt, 
            user_prompt_for_judge,
            response_format={"type": "json_object"}
        )
        # We also need to update the model in models.py to remove 'score'
        # For now, we add it back here for compatibility with the existing model.
        # In a final version, you would remove 'score' from the Pydantic model.
        evaluation_data = json.loads(response_str)
        if "score" not in evaluation_data:
            # Add a dummy score based on the flags
            if evaluation_data.get("is_safe") and evaluation_data.get("is_relevant"):
                evaluation_data["score"] = 5
            else:
                evaluation_data["score"] = 1
        return evaluation_data

    except Exception as e:
        logger.error(f"LLM Judge for Talk-to-DB failed: {e}")
        # Return a default "failure" state that matches the expected structure
        return { 
            "is_safe": False, 
            "is_relevant": False, 
            "score": 0, 
            "reasoning": "The judge encountered an error during evaluation and could not verify the query." 
        }

async def judge_data_quality_plan(table_name: str, proposed_checks: list) -> dict:
    """
    Uses an LLM to judge the relevance and coverage of a data quality plan.
    This function our Data Quality agent will call. (This function is unchanged)
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
    
async def judge_data_classification(schema_str: str, classification_results: list) -> dict:
    """
    Uses an LLM to judge the accuracy of a PII classification.
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