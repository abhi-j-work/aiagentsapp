# File: app/agents/contracts.py

from pydantic import BaseModel
from typing import List, Set

class ColumnClassificationInfo(BaseModel):
    """
    A clear contract defining the sensitivity information for a single column.
    """
    column_name: str
    is_sensitive: bool  # A simple boolean for easy and reliable checks.
    classification: str # The original classification string (e.g., "PII") for context.

class TableClassificationContract(BaseModel):
    """
    Represents the complete sensitivity analysis for a single table.
    This is the object that the Governance Agent provides to other agents.
    """
    table_name: str
    columns: List[ColumnClassificationInfo]

    def get_sensitive_column_set(self) -> Set[str]:
        """
        A helper method to quickly retrieve a set of all sensitive column names in this table.
        This encapsulates the logic within the contract itself.
        """
        return {
            col.column_name for col in self.columns if col.is_sensitive
        }