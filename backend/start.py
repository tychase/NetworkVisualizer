"""
Start script for the FastAPI backend server
"""
import os
import uvicorn
from backend.api import app

if __name__ == "__main__":
    port = int(os.environ.get("BACKEND_PORT", 8000))
    host = os.environ.get("BACKEND_HOST", "0.0.0.0")
    
    # Start the server
    uvicorn.run(app, host=host, port=port)