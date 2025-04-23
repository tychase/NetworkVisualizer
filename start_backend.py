"""
Starter script for the FastAPI backend that handles data pipelines
This script ensures the parent directory is in the Python path
"""
import os
import sys

# Add the current directory to the Python path
sys.path.insert(0, os.path.abspath('.'))

# Import and run the FastAPI application
from backend.main import app
import uvicorn

if __name__ == "__main__":
    # Get port from environment or use default
    port = int(os.environ.get("PORT", "8000"))
    
    # Start the FastAPI server
    print(f"Starting FastAPI data pipeline server on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)