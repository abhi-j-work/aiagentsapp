# In file: app/services/db_service.py
import logging
import asyncio
from typing import Dict, Any, List

from sqlalchemy import create_engine, inspect, text
import asyncpg

from .errors import DatabaseServiceError

logger = logging.getLogger(__name__)


# =============================================================================
# 1. SCHEMA EXTRACTION
# =============================================================================

def _extract_schema_sync(conn_str: str) -> Dict[str, Any]:
    """
    Synchronously inspects the database to extract a detailed schema.
    This function is robust, using fully qualified names for tables (e.g., 'public.users')
    and safely handling optional metadata like foreign key names.
    
    Uses SQLAlchemy's inspector, designed to be run in a thread.
    """
    try:
        engine = create_engine(conn_str)
        inspector = inspect(engine)
        
        all_tables_info = {}
        all_fks = []
        
        # Get all non-system schema names
        schemas = [s for s in inspector.get_schema_names() if not s.startswith('pg_') and s != 'information_schema']
        
        # If no specific schemas found, inspect the default schema
        if not schemas:
            schemas = [None] 

        for schema in schemas:
            table_names = inspector.get_table_names(schema=schema)
            for table_name in table_names:
                # CRITICAL: Create a qualified name to use as a unique key
                qualified_name = f"{schema}.{table_name}" if schema else table_name
                
                # Safely extract column info using .get() to prevent KeyErrors
                columns = [
                    {'column_name': col.get('name'), 'data_type': str(col.get('type'))} 
                    for col in inspector.get_columns(table_name, schema=schema)
                ]
                all_tables_info[qualified_name] = {"columns": columns}
                
                foreign_keys = inspector.get_foreign_keys(table_name, schema=schema)
                for fk in foreign_keys:
                    # THE DEFINITIVE FIX: Use .get() for all optional keys to prevent crashes.
                    all_fks.append({
                        "name": fk.get('name'), # This key is not always present
                        "referencing_table": qualified_name,
                        "referencing_columns": fk.get('constrained_columns'),
                        "referenced_table": fk.get('referred_table'),
                        "referenced_columns": fk.get('referred_columns'),
                    })
                    
        return {"tables": all_tables_info, "foreign_keys": all_fks}
        
    except Exception as e:
        logger.error(f"Failed to extract database schema: {e}", exc_info=True)
        raise DatabaseServiceError(f"Failed to extract database schema: {e}", 500)

async def extract_db_schema(conn_str: str) -> Dict[str, Any]:
    """Asynchronously extracts the DB schema by running the sync inspector in a thread."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _extract_schema_sync, conn_str)


# =============================================================================
# 2. DATA QUALITY QUERY EXECUTION
#    (Uses high-performance asyncpg)
# =============================================================================

async def execute_scalar_query(conn_str: str, query: str) -> int:
    """Executes a SQL query expected to return a single value (a scalar), like a count."""
    conn = None
    try:
        conn = await asyncpg.connect(dsn=conn_str)
        result = await conn.fetchval(query)
        return int(result) if result is not None else 0
    except (asyncpg.PostgresError, OSError) as e:
        logger.error(f"Scalar query failed: {e}", exc_info=True)
        raise DatabaseServiceError(message=f"Database query failed: {e}", status_code=500)
    finally:
        if conn:
            await conn.close()

async def execute_query_as_dict(conn_str: str, query: str) -> List[Dict[str, Any]]:
    """Executes a SQL query and returns the results as a list of dictionaries."""
    conn = None
    try:
        conn = await asyncpg.connect(dsn=conn_str)
        records = await conn.fetch(query)
        return [dict(record) for record in records]
    except (asyncpg.PostgresError, OSError) as e:
        logger.error(f"Dictionary query failed: {e}", exc_info=True)
        raise DatabaseServiceError(message=f"Database query failed: {e}", status_code=500)
    finally:
        if conn:
            await conn.close()


# =============================================================================
# 3. OTHER UTILITY FUNCTIONS
#    (For features like data governance and statement execution)
# =============================================================================

def _execute_statements_sync(conn_str: str, statements: list[str]):
    """Synchronously executes a list of DDL/DML statements in a single transaction."""
    engine = create_engine(conn_str)
    with engine.connect() as connection:
        with connection.begin() as transaction:
            try:
                for stmt in statements:
                    if stmt and stmt.strip():
                        connection.execute(text(stmt))
            except Exception as e:
                transaction.rollback()
                logger.error(f"Failed during batch SQL execution: {e}", exc_info=True)
                raise DatabaseServiceError(message=f"Failed to apply SQL: {e}", status_code=400)

async def execute_statements(conn_str: str, statements: list[str]):
    """Asynchronously executes a list of SQL statements in a thread."""
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, _execute_statements_sync, conn_str, statements)

def _list_governed_views_sync(conn_str: str) -> List[str]:
    """Synchronously inspects the database for views ending in '_governed_view'."""
    try:
        engine = create_engine(conn_str)
        inspector = inspect(engine)
        all_views = inspector.get_view_names()
        return [v for v in all_views if v.endswith('_governed_view')]
    except Exception as e:
        logger.error(f"Failed to list governed views: {e}", exc_info=True)
        raise DatabaseServiceError(f"Failed to list views from database: {e}", 500)

async def list_governed_views(conn_str: str) -> List[str]:
    """Asynchronously lists governed views by running the sync inspector in a thread."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _list_governed_views_sync, conn_str)

def _fetch_view_data_sync(conn_str: str, view_name: str, limit: int, offset: int, role: str) -> List[Dict[str, Any]]:
    """Synchronously fetches paginated data from a view using a specific role."""
    try:
        engine = create_engine(conn_str)
        with engine.connect() as connection:
            set_role_stmt = text("SET ROLE :role")
            connection.execute(set_role_stmt, {"role": role})
            
            safe_view_name = f'"{view_name}"'
            query = text(f'SELECT * FROM {safe_view_name} LIMIT :limit OFFSET :offset')
            result = connection.execute(query, {"limit": limit, "offset": offset})
            return [dict(row._mapping) for row in result.fetchall()]
    except Exception as e:
        logger.error(f"Failed to fetch data from view '{view_name}' as role '{role}': {e}", exc_info=True)
        raise DatabaseServiceError(f"Failed to fetch data from view '{view_name}'. Check if role '{role}' exists and has permissions. Error: {e}", 400)

async def fetch_view_data(conn_str: str, view_name: str, limit: int, offset: int, role: str) -> List[Dict[str, Any]]:
    """Asynchronously fetches view data by running the sync query (with SET ROLE) in a thread."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _fetch_view_data_sync, conn_str, view_name, limit, offset, role)