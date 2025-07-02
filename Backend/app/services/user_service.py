# # File: app/services/user_service.py

# import logging
# from sqlalchemy import create_engine, inspect, text, exc, select
# from sqlalchemy.orm import sessionmaker, declarative_base, Mapped, mapped_column
# from typing import Optional
# import asyncio

# from app.services.errors import DatabaseServiceError

# logger = logging.getLogger(__name__)

# # --- SQLAlchemy Table Definition ---
# # In a real application, you would define your database tables using this structure.
# # This tells SQLAlchemy what the 'users' table looks like.
# Base = declarative_base()

# class User(Base):
#     __tablename__ = "users"
#     id: Mapped[int] = mapped_column(primary_key=True)
#     username: Mapped[str] = mapped_column(unique=True, index=True)
#     email: Mapped[str] = mapped_column(unique=True, index=True)
#     hashed_password: Mapped[str]

# # --- Database Logic ---

# def _get_user_by_id_sync(conn_str: str, user_id: int) -> Optional[User]:
#     """
#     Synchronous function to query the database for a user by their ID.
#     This will be run in a non-blocking thread.
#     """
#     try:
#         engine = create_engine(conn_str)
#         SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        
#         with SessionLocal() as db_session:
#             # Use SQLAlchemy ORM to query the User table
#             user = db_session.get(User, user_id)
#             return user
            
#     except Exception as e:
#         logger.exception(f"Failed to get user by ID: {e}")
#         # Let the endpoint handle the generic error, or raise a specific one
#         raise DatabaseServiceError(f"Database query failed for user ID {user_id}", 500)


# async def get_user_by_id(conn_str: str, user_id: int) -> Optional[User]:
#     """
#     Asynchronously gets a user by ID by running the synchronous
#     database query in a separate thread.
#     """
#     loop = asyncio.get_running_loop()
#     return await loop.run_in_executor(None, _get_user_by_id_sync, conn_str, user_id)