import os
import redis

def get_redis_client():
    """
    Creates and returns a Redis client if Redis is configured.
    Returns None if Redis is not configured.
    """
    if not os.getenv("REDIS_HOST"):
        return None
    try:
        client = redis.Redis(
            host=os.getenv("REDIS_HOST", "localhost"),
            port=int(os.getenv("REDIS_PORT", 6379)),
            db=int(os.getenv("REDIS_DB", 0)),
            password=os.getenv("REDIS_PASSWORD", None),
            decode_responses=True,
        )
        client.ping()
        print("Successfully connected to Redis.")
        return client
    except redis.exceptions.ConnectionError as e:
        print(f"Could not connect to Redis: {e}")
        return None

# Initialize the client
redis_client = get_redis_client()
