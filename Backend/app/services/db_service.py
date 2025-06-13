# In file: app/services/db_service.py
import logging
from sqlalchemy import create_engine, inspect
from typing import Dict, Any
import asyncio
from app.services.errors import DatabaseServiceError

logger = logging.getLogger(__name__)

def _extract_schema_sync(conn_str: str) -> Dict[str, Any]:
    try:
        engine = create_engine(conn_str)
        inspector = inspect(engine)
        
        all_tables_info = {}
        all_fks = []
        
        schemas = [s for s in inspector.get_schema_names() if not s.startswith('pg_') and s != 'information_schema']
        
        if not schemas:
            schemas = [None] 

        for schema in schemas:
            for table_name in inspector.get_table_names(schema=schema):
                # ### FIX: Changed keys 'name'->'column_name' and 'type'->'data_type' to match models.py
                columns = [
                    {'column_name': col['name'], 'data_type': str(col['type'])} 
                    for col in inspector.get_columns(table_name, schema=schema)
                ]
                all_tables_info[table_name] = {"columns": columns}
                
                foreign_keys = inspector.get_foreign_keys(table_name, schema=schema)
                for fk in foreign_keys:
                    all_fks.append({
                        "name": fk['name'],
                        "referencing_table": table_name,
                        "referencing_columns": fk['constrained_columns'],
                        "referenced_table": fk['referred_table'],
                        "referenced_columns": fk['referred_columns'],
                    })
                    
        return {"tables": all_tables_info, "foreign_keys": all_fks}
        
    except Exception as e:
        logger.error(f"Failed to extract schema: {e}")
        raise DatabaseServiceError(f"Failed to extract schema: {e}", 500)

async def extract_db_schema(conn_str: str) -> Dict[str, Any]:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _extract_schema_sync, conn_str)

# ### BEST PRACTICE: Included your apply_sql_statements function for completeness.
def _apply_sql_sync(conn_str: str, statements: list[str]):
    engine = create_engine(conn_str)
    with engine.connect() as connection:
        with connection.begin() as transaction:
            try:
                for stmt in statements:
                    if stmt.strip():
                        connection.execute(text(stmt))
                transaction.commit()
            except Exception as e:
                transaction.rollback()
                raise DatabaseServiceError(f"Failed to apply SQL: {e}", 400)

async def apply_sql_statements(conn_str: str, statements: list[str]):
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, _apply_sql_sync, conn_str, statements)