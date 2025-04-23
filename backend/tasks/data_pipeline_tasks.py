"""
Celery tasks for data pipeline processing
"""
import os
import logging
from datetime import datetime
from typing import Dict, Optional

from backend.celery_app import app
from backend.pipelines.fec_pipeline import run_fec_pipeline
from backend.pipelines.congress_pipeline import run_congress_pipeline
from backend.pipelines.stock_pipeline import run_stock_pipeline

# Configure logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.task(bind=True, max_retries=3, default_retry_delay=300)
def run_fec_pipeline_task(self, force_download: bool = False, skip_candidates: bool = False, skip_contributions: bool = False) -> Dict:
    """
    Task to run the FEC data pipeline
    """
    logger.info("Starting FEC pipeline task")
    
    try:
        # Run the pipeline
        result = run_fec_pipeline(force_download, skip_candidates, skip_contributions)
        
        logger.info(f"FEC pipeline task completed with status: {result['success']}")
        return result
    
    except Exception as e:
        error_message = str(e)
        logger.error(f"Error running FEC pipeline task: {error_message}")
        
        # Retry the task
        raise self.retry(exc=e, countdown=300)

@app.task(bind=True, max_retries=3, default_retry_delay=300)
def run_congress_pipeline_task(self, congress_number: int = 117, session: int = 1) -> Dict:
    """
    Task to run the Congress data pipeline
    """
    logger.info(f"Starting Congress pipeline task for {congress_number}th Congress, session {session}")
    
    try:
        # Run the pipeline
        result = run_congress_pipeline(congress_number, session)
        
        logger.info("Congress pipeline task completed")
        return result
    
    except Exception as e:
        error_message = str(e)
        logger.error(f"Error running Congress pipeline task: {error_message}")
        
        # Retry the task
        raise self.retry(exc=e, countdown=300)

@app.task(bind=True, max_retries=3, default_retry_delay=300)
def run_stock_pipeline_task(self) -> Dict:
    """
    Task to run the stock disclosure pipeline
    """
    logger.info("Starting stock disclosure pipeline task")
    
    try:
        # Run the pipeline
        result = run_stock_pipeline()
        
        logger.info("Stock disclosure pipeline task completed")
        return result
    
    except Exception as e:
        error_message = str(e)
        logger.error(f"Error running stock disclosure pipeline task: {error_message}")
        
        # Retry the task
        raise self.retry(exc=e, countdown=300)