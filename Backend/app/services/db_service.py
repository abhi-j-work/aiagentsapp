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

def _list_governed_views_sync(conn_str: str) -> List[str]:
    """Synchronously inspects the database for views ending in '_governed_view'."""
    try:
        engine = create_engine(conn_str)
        inspector = inspect(engine)
        all_views = inspector.get_view_names()
        # Filter the list to find only the views created by our governance process
        governed_views = [v for v in all_views if v.endswith('_governed_view')]
        return governed_views
    except Exception as e:
        logger.error(f"Failed to list governed views: {e}", exc_info=True)
        raise DatabaseServiceError(f"Failed to list views from database: {e}", 500)

async def list_governed_views(conn_str: str) -> List[str]:
    """Asynchronously lists governed views by running the sync inspector in a thread."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _list_governed_views_sync, conn_str)


# =============================================================================
# NEW: Functions for Fetching Data from a View
# =============================================================================

def _fetch_view_data_sync(conn_str: str, view_name: str, limit: int, offset: int, role: str) -> List[Dict[str, Any]]:
    """
    Synchronously fetches paginated data from a specific view,
    assuming a database role for the duration of the transaction.
    """
    try:
        engine = create_engine(conn_str)
        with engine.connect() as connection:
            # Step 1: Set the role for the current transaction.
            # This is the crucial part that applies the masking rules.
            # We use text() and parameter binding to safely handle the role name and prevent SQL injection.
            set_role_stmt = text("SET ROLE :role")
            connection.execute(set_role_stmt, {"role": role})

            # Step 2: Execute the main SELECT query.
            # This query will now run with the permissions of the role set above.
            safe_view_name = f'"{view_name}"'
            query = text(f'SELECT * FROM {safe_view_name} LIMIT :limit OFFSET :offset')
            result = connection.execute(query, {"limit": limit, "offset": offset})
            rows = [dict(row._mapping) for row in result.fetchall()]
            
            # Note: The role is automatically reset to the original user when the
            # connection is closed and returned to the pool at the end of the `with` block.
            return rows
            
    except Exception as e:
        logger.error(f"Failed to fetch data from view '{view_name}' as role '{role}': {e}", exc_info=True)
        # Provide a more specific and helpful error message to the user.
        raise DatabaseServiceError(f"Failed to fetch data from view '{view_name}'. Check if role '{role}' exists and has permissions on the view. Error: {e}", 400)

async def fetch_view_data(conn_str: str, view_name: str, limit: int, offset: int, role: str) -> List[Dict[str, Any]]:
    """
    Asynchronously fetches view data by running the sync query (with SET ROLE) in a thread.
    The function signature now correctly includes the 'role' parameter.
    """
    loop = asyncio.get_running_loop()
    # Pass the 'role' argument to the synchronous worker function.
    return await loop.run_in_executor(
        None, _fetch_view_data_sync, conn_str, view_name, limit, offset, role
    )