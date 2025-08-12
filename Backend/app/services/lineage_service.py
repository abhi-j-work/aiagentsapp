from sqllineage.runner import LineageRunner 
from typing import Dict, Any, List 

def a_parse_sql_lineage(sql: str) -> Dict[str, Any]: 
    """ 
    Parses a single SQL statement to extract source and target tables. 
    """ 
    result = LineageRunner(sql) 
    
    # Extract source and target tables 
    sources = {str(table) for table in result.source_tables} 
    targets = {str(table) for table in result.target_tables} 
    
    return { 
        "sources": list(sources), 
        "targets": list(targets) 
    }