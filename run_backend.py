import sys
import uvicorn
from pathlib import Path

# Add the Backend directory to the sys.path
backend_dir = Path(__file__).parent
sys.path.append(str(backend_dir))

if __name__ == "__main__":
    uvicorn.run("Backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
