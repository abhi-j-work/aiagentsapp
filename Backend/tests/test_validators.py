import pytest
from app.training.validators import validate_json_outputs, sql_static_check

def test_validate_json_outputs_success():
    predictions = ['{"key": "value"}', '{"a": 1}']
    result = validate_json_outputs(predictions)
    assert result["json_parse_rate"] == 1.0
    assert len(result["errors"]) == 0

def test_validate_json_outputs_failure():
    predictions = ['{"key": "value"}', 'not json']
    result = validate_json_outputs(predictions)
    assert result["json_parse_rate"] == 0.5
    assert len(result["errors"]) == 1
    assert result["errors"][0]["prediction_index"] == 1

def test_sql_static_check_safe():
    safe_queries = [
        'SELECT * FROM my_table WHERE id = 1',
        'select name, age from users where country = "USA"',
    ]
    for query in safe_queries:
        assert sql_static_check(query) is True

def test_sql_static_check_unsafe():
    unsafe_queries = [
        'DELETE FROM my_table WHERE id = 1',
        'DROP TABLE users',
        'UPDATE users SET name = "new name" WHERE id = 1',
        'INSERT INTO users (name) VALUES ("new user")',
        'GRANT SELECT ON users TO public',
    ]
    for query in unsafe_queries:
        assert sql_static_check(query) is False
