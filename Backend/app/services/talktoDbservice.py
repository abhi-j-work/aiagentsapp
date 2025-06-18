import os
import threading
from dotenv import load_dotenv
from sqlalchemy import create_engine, text, inspect, Engine
from typing import Dict

# --- Cache and Thread-Safety Implementation ---
_engine_cache: Dict[str, Engine] = {}
_cache_lock = threading.Lock()

# --- Custom Exceptions for Clear Error Handling ---
class ServiceError(Exception):
    def __init__(self, message, status_code=500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)

class DatabaseServiceError(ServiceError): pass


# ===================================================================
# DATABASE SERVICE CLASS (with Caching)
# ===================================================================
class DatabaseService:
    def _get_or_create_engine(self, conn_str: str) -> Engine:
        if conn_str in _engine_cache:
            return _engine_cache[conn_str]
        with _cache_lock:
            if conn_str in _engine_cache:
                return _engine_cache[conn_str]
            print(f"INFO:     Creating and caching new PostgreSQL engine...")
            try:
                engine = create_engine(conn_str, pool_recycle=3600, pool_pre_ping=True)
                _engine_cache[conn_str] = engine
                return engine
            except Exception as e:
                raise DatabaseServiceError(f"Failed to create database engine: {e}", status_code=400)

    def get_schema_representation(self, conn_str: str) -> str:
        engine = self._get_or_create_engine(conn_str)
        try:
            inspector = inspect(engine)
            schema_parts = []
            # Get schemas (like 'public')
            for schema_name in inspector.get_schema_names():
                 if schema_name.startswith('pg_') or schema_name == 'information_schema':
                     continue
                 for table_name in inspector.get_table_names(schema=schema_name):
                    columns = inspector.get_columns(table_name, schema=schema_name)
                    column_defs = [f"{col['name']} (type: {col['type']})" for col in columns]
                    schema_parts.append(f'Schema "{schema_name}", Table "{table_name}" has columns: {", ".join(column_defs)}.')
            if not schema_parts:
                raise DatabaseServiceError("No user tables found in the database.", status_code=404)
            return "\n".join(schema_parts)
        except Exception as e:
            raise DatabaseServiceError(f"Failed to inspect schema. Error: {e}", status_code=500)

    def execute_query(self, conn_str: str, sql_query: str):
        engine = self._get_or_create_engine(conn_str)
        try:
            with engine.connect() as connection:
                if not sql_query.strip().lower().startswith("select"):
                    with connection.begin():
                        result = connection.execute(text(sql_query))
                        return {"message": f"Operation successful. {result.rowcount} rows affected."}
                else:
                    result = connection.execute(text(sql_query))
                    rows = [dict(row._mapping) for row in result.fetchall()]
                    return {"data": rows}
        except Exception as e:
            raise DatabaseServiceError(f"SQL execution failed. Check query syntax. Error: {e}", status_code=400)

def get_db_service():
    return DatabaseService()
