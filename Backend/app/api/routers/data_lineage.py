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
    Generates a data lineage graph for a given database table or view.
    - For views, it shows the source tables (upstream).
    - For tables, it shows foreign key relationships (upstream and downstream).
    """
    try: 
        conn_str = _get_conn_str(params.connection_string, settings)
        object_name = params.object_name

        # Step 1: Determine if the object is a table or a view
        object_type = await db_service.get_object_type(conn_str, object_name)

        if not object_type:
            raise HTTPException(status_code=404, detail=f"Object '{object_name}' not found in the database.")

        nodes = []
        edges = []
        
        # Add the central node for the object being queried
        # Note: We use lowercase 'table'/'view' to match the frontend component types
        central_node_type = 'view' if object_type == 'VIEW' else 'table'
        central_node_id = f"{central_node_type}_{object_name}"
        nodes.append({"id": central_node_id, "type": central_node_type, "label": object_name})

        # Step 2: Branch logic based on the object type
        if object_type == 'VIEW':
            # Logic for Views: Show source tables
            sql_definition = await db_service.get_view_definition(conn_str, object_name)
            if not sql_definition:
                 raise HTTPException(status_code=404, detail=f"Could not retrieve definition for view '{object_name}'.")
            
            lineage_info = lineage_service.a_parse_sql_lineage(sql_definition) 
            
            for source_table in lineage_info["sources"]:
                source_node_id = f"table_{source_table}"
                if not any(n["id"] == source_node_id for n in nodes):
                    nodes.append({"id": source_node_id, "type": "table", "label": str(source_table)})
                
                # Edge from source table TO the view
                edges.append({"source": source_node_id, "target": central_node_id})

        elif object_type == 'BASE TABLE':
            # Logic for Tables: Show foreign key relationships
            upstream, downstream = await db_service.get_table_lineage_details(conn_str, object_name)

            # Handle upstream dependencies (this table depends on them)
            for up_table in upstream:
                up_node_id = f"table_{up_table}"
                if not any(n["id"] == up_node_id for n in nodes):
                    nodes.append({"id": up_node_id, "type": "table", "label": up_table})
                
                # Edge from upstream table TO this table
                edges.append({"source": up_node_id, "target": central_node_id})
            
            # Handle downstream dependencies (they depend on this table)
            for down_table in downstream:
                down_node_id = f"table_{down_table}"
                if not any(n["id"] == down_node_id for n in nodes):
                    nodes.append({"id": down_node_id, "type": "table", "label": down_table})
                
                # Edge from this table TO the downstream table
                edges.append({"source": central_node_id, "target": down_node_id})

        return models.LineageResponse(nodes=nodes, edges=edges)

    except DatabaseServiceError as e: 
        raise HTTPException(status_code=e.status_code, detail=e.message) 
    except Exception as e: 
        logger.error(f"Unexpected error getting lineage for '{params.object_name}': {e}", exc_info=True) 
        raise HTTPException(status_code=500, detail="An unexpected server error occurred.")



# Add this endpoint to your router
@router.post("/list-database-objects", response_model=models.ListObjectsResponse)
async def list_database_objects(params: models.DBParams, settings: Settings = Depends(get_settings)):
    """
    Lists all user-defined tables and views from the public schema.
    """
    try:
        conn_str = _get_conn_str(params.connection_string, settings)
        # We need a new db_service function for this
        tables, views = await db_service.list_all_tables_and_views(conn_str)
        
        return models.ListObjectsResponse(tables=tables, views=views)

    except DatabaseServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Unexpected error listing database objects: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected server error occurred.")