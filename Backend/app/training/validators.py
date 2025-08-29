# backend/app/training/validators.py
"""
Validator functions for model outputs.
"""
import json
import re
import logging
from typing import List, Dict, Optional, Type
from pydantic import BaseModel, ValidationError

try:
    import sqlfluff
    SQLFLUFF_AVAILABLE = True
except ImportError:
    SQLFLUFF_AVAILABLE = False

def validate_json_outputs(
    predictions: List[str], pydantic_model: Optional[Type[BaseModel]] = None
) -> Dict:
    """
    Validates that model outputs are parsable as JSON and optionally conform to a Pydantic model.

    Args:
        predictions (List[str]): A list of strings, where each string is an expected JSON object.
        pydantic_model (Optional[Type[BaseModel]]): A Pydantic model to validate against.

    Returns:
        Dict: A dictionary containing the parse rate and a list of errors.
    """
    successful_parses = 0
    errors = []

    if not predictions:
        return {"json_parse_rate": 1.0, "errors": []}

    for i, pred in enumerate(predictions):
        try:
            parsed_json = json.loads(pred)
            if pydantic_model:
                pydantic_model.model_validate(parsed_json)
            successful_parses += 1
        except json.JSONDecodeError as e:
            errors.append({"prediction_index": i, "error": f"JSONDecodeError: {e}"})
        except ValidationError as e:
            errors.append({"prediction_index": i, "error": f"ValidationError: {e}"})
        except Exception as e:
            errors.append({"prediction_index": i, "error": f"Unexpected error: {e}"})

    parse_rate = successful_parses / len(predictions)
    return {"json_parse_rate": parse_rate, "errors": errors}


def sql_static_check(sql_text: str) -> bool:
    """
    Performs static checks on a SQL query.
    - Uses sqlfluff to parse the query and check the statement type.
    - Falls back to regex-based checks otherwise.
    """
    if SQLFLUFF_AVAILABLE:
        try:
            # The noqa("PRS") is to ignore the parsing rule violation for this line
            parsed = sqlfluff.parse(sql_text, dialect="snowflake")
            # Check if the query was parsable and if it's a select statement.
            if parsed.tree and parsed.tree.segments:
                return parsed.tree.segments[0].is_type("select_statement")
            return False
        except Exception:
            return fallback_sql_check(sql_text)
    else:
        return fallback_sql_check(sql_text)

def fallback_sql_check(sql_text: str) -> bool:
    """
    A simple regex-based fallback for SQL static checks.
    - Ensures SELECT-only queries.
    - Disallows common destructive keywords.
    """
    normalized_sql = sql_text.strip().upper()

    if not normalized_sql.startswith('SELECT'):
        return False

    forbidden_keywords = [
        "DELETE", "DROP", "TRUNCATE", "UPDATE", "INSERT", "GRANT", "REVOKE", "ALTER"
    ]
    if any(re.search(r'\b' + keyword + r'\b', normalized_sql) for keyword in forbidden_keywords):
        return False

    return True
