"""
Main entry point for the data pipeline server
"""
import os
import uvicorn
import logging
from backend.api import app
from backend.database import test_connection

# Configure logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    # Test database connection
    if not test_connection():
        logger.error("Database connection failed. Please check your DATABASE_URL environment variable.")
    else:
        logger.info("Database connection successful.")
    
    # Get port from environment or use default
    port = int(os.environ.get("PORT", "8000"))
    
    # Start the FastAPI server
    logger.info(f"Starting FastAPI server on port {port}")
    uvicorn.run("backend.api:app", host="0.0.0.0", port=port, reload=True)