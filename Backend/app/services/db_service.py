# In file: app/services/db_service.py
import logging
from sqlalchemy import create_engine, inspect
from typing import Dict, Any
import asyncio
from typing import List 
from sqlalchemy import create_engine, text

from .errors import DatabaseServiceError
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
def _execute_statements_sync(conn_str: str, statements: list[str]):
    """
    Synchronously executes statements using SQLAlchemy.
    This function is designed to be run in a separate thread.
    """
    # create_engine is a factory for connections and manages a connection pool.
    engine = create_engine(conn_str)
    
    # engine.connect() checks out a connection from the pool.
    with engine.connect() as connection:
        # connection.begin() starts a transaction block.
        with connection.begin() as transaction:
            try:
                for stmt in statements:
                    # Ensure we don't execute empty strings
                    if stmt and stmt.strip():
                        connection.execute(text(stmt))
                
                # The transaction is automatically committed here if no exception was raised.
                # The explicit `transaction.commit()` is not needed with `with connection.begin()`.
            except Exception as e:
                # The transaction is automatically rolled back here upon exiting the `with`
                # block due to an exception.
                raise DatabaseServiceError(message=f"Failed to apply SQL: {e}", status_code=400)

# This is your async wrapper function. We'll call this from the API endpoint.
async def execute_statements(conn_str: str, statements: list[str]):
    """
    Asynchronously executes a list of SQL statements by running the
    synchronous SQLAlchemy logic in a thread pool executor.
    """
    loop = asyncio.get_running_loop()
    # `run_in_executor` pushes the blocking function to a thread,
    # freeing the event loop to handle other requests.
    await loop.run_in_executor(
        None,  # Use the default thread pool executor
        _execute_statements_sync,
        conn_str,
        statements
    )