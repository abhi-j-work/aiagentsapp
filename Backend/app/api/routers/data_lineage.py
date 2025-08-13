import logging
from fastapi import APIRouter, Depends, HTTPException, logger
from app.api import models
from app.api.routers.data_governance import _get_conn_str
from app.core.config import Settings, get_settings
from app.services import db_service
from app.services.errors import DatabaseServiceError
from app.services import lineage_service 
logger = logging.getLogger(__name__)    
router = APIRouter(
    prefix="/data",
    tags=["Data Lineage"]
)

@router.post("/lineage", response_model=models.LineageResponse) 
async def get_data_lineage(params: models.LineageRequest, settings: Settings = Depends(get_settings)): 
    """
    Generates a data lineage graph for a given database table or view,
    now including primary key information for each table node.
    """
    try: 
        conn_str = _get_conn_str(params.connection_string, settings)
        object_name = params.object_name
        object_type = await db_service.get_object_type(conn_str, object_name)

        if not object_type:
            raise HTTPException(status_code=404, detail=f"Object '{object_name}' not found.")

        # Use a temporary list of dictionaries to build the nodes
        nodes_data = []
        edges = []
        
        central_node_type = 'view' if object_type == 'VIEW' else 'table'
        central_node_id = f"{central_node_type}_{object_name}"
        nodes_data.append({"id": central_node_id, "type": central_node_type, "label": object_name})

        # Step 2: Discover all related nodes (same as before)
        if object_type == 'VIEW':
            sql_definition = await db_service.get_view_definition(conn_str, object_name)
            if not sql_definition:
                 raise HTTPException(status_code=404, detail=f"Could not get definition for '{object_name}'.")
            
            lineage_info = lineage_service.a_parse_sql_lineage(sql_definition) 
            for source_table in lineage_info["sources"]:
                source_node_id = f"table_{source_table}"
                if not any(n["id"] == source_node_id for n in nodes_data):
                    nodes_data.append({"id": source_node_id, "type": "table", "label": str(source_table)})
                edges.append({"source": source_node_id, "target": central_node_id})
        else: # BASE TABLE
            upstream, downstream = await db_service.get_table_lineage_details(conn_str, object_name)
            for up_table in upstream:
                up_node_id = f"table_{up_table}"
                if not any(n["id"] == up_node_id for n in nodes_data):
                    nodes_data.append({"id": up_node_id, "type": "table", "label": up_table})
                edges.append({"source": up_node_id, "target": central_node_id})
            for down_table in downstream:
                down_node_id = f"table_{down_table}"
                if not any(n["id"] == down_node_id for n in nodes_data):
                    nodes_data.append({"id": down_node_id, "type": "table", "label": down_table})
                edges.append({"source": central_node_id, "target": down_node_id})
        
        # --- NEW ENRICHMENT STEP ---
        # 1. Get a list of all table labels from the nodes we just discovered.
        table_labels = [n['label'] for n in nodes_data if n['type'] == 'table']
        
        # 2. Fetch the primary keys for ONLY those tables in a single DB call.
        pk_map = await db_service.get_primary_keys_for_tables(conn_str, table_labels)
        
        # 3. Add the 'primary_key' field to each node dictionary.
        for node in nodes_data:
            if node['type'] == 'table':
                # .get() safely returns None if the table has no PK or wasn't found
                node['primary_key'] = pk_map.get(node['label'])

        # Pydantic will validate the final enriched structure
        return models.LineageResponse(nodes=nodes_data, edges=edges)

    except DatabaseServiceError as e: 
        raise HTTPException(status_code=e.status_code, detail=e.message) 
    except Exception as e: 
        logger.error(f"Unexpected error getting lineage for '{params.object_name}': {e}", exc_info=True) 
        raise HTTPException(status_code=500, detail="An unexpected server error occurred.")

@router.post("/list-database-objects", response_model=models.ListObjectsResponse)
async def list_database_objects(params: models.DBParams, settings: Settings = Depends(get_settings)):
    """
    Lists all user-defined tables (with their primary keys) and views
    from the public schema.
    """
    try:
        conn_str = _get_conn_str(params.connection_string, settings)
        tables, views = await db_service.list_all_tables_and_views(conn_str)
        
        return models.ListObjectsResponse(tables=tables, views=views)

    except DatabaseServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Unexpected error listing database objects: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected server error occurred.")