# # File: app/api/routers/user_management.py

# import logging
# from fastapi import APIRouter, HTTPException, Depends

# from app.core.config import Settings, get_settings
# from app.api import models
# from app.services import user_service
# from app.services.errors import DatabaseServiceError

# logger = logging.getLogger(__name__)
# router = APIRouter()

# def _get_conn_str(settings: Settings) -> str:
#     """Helper to resolve connection string."""
#     conn_str = settings.DATABASE_URL
#     if not conn_str:
#         raise HTTPException(status_code=500, detail="DATABASE_URL is not configured on the server.")
#     return conn_str

# @router.get(
#     "/users/{user_id}",
#     response_model=models.UserResponse,
#     summary="Get a single user by their ID",
#     responses={
#         404: {"description": "User not found"},
#         500: {"description": "Internal server error"}
#     }
# )
# async def get_user(user_id: int, settings: Settings = Depends(get_settings)):
#     """
#     Retrieves the details for a specific user from the database.
    
#     - The **user_id** must be an integer.
#     - The response will not include any sensitive information like passwords.
#     """
#     try:
#         conn_str = _get_conn_str(settings)
#         user = await user_service.get_user_by_id(conn_str, user_id)

#         if not user:
#             raise HTTPException(status_code=404, detail=f"User with ID {user_id} not found.")

#         # FastAPI will automatically use the UserResponse model to filter the fields
#         return user
        
#     except DatabaseServiceError as e:
#         raise HTTPException(status_code=e.status_code, detail=e.message)
#     except Exception as e:
#         logger.exception(f"An unexpected error occurred while fetching user {user_id}.")
#         raise HTTPException(status_code=500, detail="An unexpected internal error occurred.")