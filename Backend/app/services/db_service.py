# In file: app/services/db_service.py
import logging
import asyncio
from typing import Dict, Any, List, Optional
from app.services.errors import DatabaseServiceError
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




async def list_all_tables_and_views(conn_str: str) -> tuple[list[str], list[str]]:
    """
    Connects to the database and fetches a list of all user-defined tables and views
    from the 'public' schema using a single, efficient query.

    Args:
        conn_str: The full database connection string.

    Returns:
        A tuple containing two lists: (list_of_tables, list_of_views).

    Raises:
        DatabaseServiceError: If the connection fails or the query cannot be executed.
    """
    conn = None
    try:
        # Establish a connection to the database
        conn = await asyncpg.connect(dsn=conn_str)
        
        # --- THE FIX: A SINGLE, EFFICIENT QUERY ---
        # This query fetches both tables and views in one go.
        query = """
            SELECT table_name, table_type
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type IN ('BASE TABLE', 'VIEW')
            ORDER BY table_type, table_name;
        """

        # Execute the single query
        records = await conn.fetch(query)

        # --- Process the results in Python ---
        tables = []
        views = []
        for record in records:
            if record['table_type'] == 'BASE TABLE':
                tables.append(record['table_name'])
            else: # 'VIEW'
                views.append(record['table_name'])
        
        logger.info(f"Successfully listed {len(tables)} tables and {len(views)} views.")
        
        return tables, views

    except (asyncpg.exceptions.PostgresError, OSError) as e:
        # Catch specific database or connection errors
        error_message = f"Database query failed while listing objects: {e}"
        logger.error(error_message)
        raise DatabaseServiceError(status_code=503, message=error_message)
        
    except Exception as e:
        # Catch any other unexpected errors
        error_message = f"An unexpected error occurred while listing database objects: {e}"
        logger.error(error_message, exc_info=True)
        raise DatabaseServiceError(status_code=500, message=error_message)

    finally:
        # Ensure the connection is always closed, even if errors occur
        if conn and not conn.is_closed():
            await conn.close()



async def get_view_definition(conn_str: str, view_name: str) -> Optional[str]:
    """
    Connects to the database and retrieves the SQL definition of a specific view.

    Args:
        conn_str: The full database connection string.
        view_name: The name of the view to look up.

    Returns:
        A string containing the SQL 'CREATE VIEW...' statement if the view is found,
        otherwise None.

    Raises:
        DatabaseServiceError: If the connection fails or the query cannot be executed.
    """
    conn = None
    try:
        conn = await asyncpg.connect(dsn=conn_str)
        
        # This query uses a built-in PostgreSQL function to get the view's source code.
        # It's safe from SQL injection because we use a parameterized query ($1).
        # The second argument `true` to pg_get_viewdef pretty-prints the SQL.
        query = "SELECT pg_get_viewdef($1, true);"

        # Use fetchval to get a single value from a single row.
        # It will return None if no row is found (i.e., the view doesn't exist).
        view_definition = await conn.fetchval(query, view_name)

        if view_definition:
            logger.info(f"Successfully retrieved definition for view: {view_name}")
            # The function returns the SELECT part, so we prepend the CREATE VIEW part
            # to make it a full, parsable statement for sqllineage.
            return f"CREATE OR REPLACE VIEW {view_name} AS {view_definition}"
        else:
            logger.warning(f"No definition found for view: {view_name}. It may not exist.")
            return None

    except (asyncpg.exceptions.PostgresError, OSError) as e:
        error_message = f"Database query failed while getting view definition for '{view_name}': {e}"
        logger.error(error_message)
        raise DatabaseServiceError(status_code=503, message=error_message)
        
    except Exception as e:
        error_message = f"An unexpected error occurred while getting view definition for '{view_name}': {e}"
        logger.error(error_message, exc_info=True)
        raise DatabaseServiceError(status_code=500, message=error_message)

    finally:
        if conn and not conn.is_closed():
            await conn.close()


async def get_object_type(conn_str: str, object_name: str) -> Optional[str]:
    """
    Checks the database to determine if an object is a 'BASE TABLE' or a 'VIEW'.

    Returns:
        The type of the object as a string, or None if not found.
    """
    conn = None
    try:
        conn = await asyncpg.connect(dsn=conn_str)
        query = """
            SELECT table_type FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = $1;
        """
        # fetchval is perfect for getting a single value from a single row
        object_type = await conn.fetchval(query, object_name)
        return object_type
    except (asyncpg.exceptions.PostgresError, OSError) as e:
        logger.error(f"Database query failed while getting object type for '{object_name}': {e}")
        raise DatabaseServiceError(status_code=503, message=f"Database error checking object type for '{object_name}'.")
    finally:
        if conn and not conn.is_closed():
            await conn.close()

async def get_table_lineage_details(conn_str: str, table_name: str) -> tuple[list[str], list[str]]:
    """
    Finds all upstream and downstream dependencies for a given table based on foreign keys
    using a single, efficient, combined query.

    Returns:
        A tuple of two lists: (upstream_dependencies, downstream_dependencies).
    """
    conn = None
    try:
        conn = await asyncpg.connect(dsn=conn_str)
        
        # --- THE FIX: A SINGLE, COMBINED SQL QUERY ---
        # This query uses a UNION ALL to combine the results of the upstream
        # and downstream lookups into one result set, with a 'direction'
        # column to distinguish them.
        query = """
        -- Upstream dependencies: tables that this table depends on
        SELECT 
            'upstream' as direction,
            ccu.table_name AS related_table
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = $1
        
        UNION ALL
        
        -- Downstream dependencies: tables that depend on this table
        SELECT 
            'downstream' as direction,
            tc.table_name AS related_table
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = $1;
        """

        # Execute the single, combined query
        records = await conn.fetch(query, table_name)

        # Process the results in Python
        upstream_dependencies = []
        downstream_dependencies = []
        for record in records:
            if record['direction'] == 'upstream':
                upstream_dependencies.append(record['related_table'])
            else: # 'downstream'
                downstream_dependencies.append(record['related_table'])

        return upstream_dependencies, downstream_dependencies

    except (asyncpg.exceptions.PostgresError, OSError) as e:
        logger.error(f"Database query failed while getting table lineage for '{table_name}': {e}")
        raise DatabaseServiceError(status_code=503, message=f"Database error getting lineage for table '{table_name}'.")
    finally:
        if conn and not conn.is_closed():
            await conn.close()