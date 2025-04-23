"""
Test script for data pipelines

This script runs a small test of each pipeline to verify they are working correctly.
"""
import logging
import argparse
from backend.database import test_connection
from backend.pipelines.fec_pipeline import run_fec_pipeline
from backend.pipelines.congress_pipeline import run_congress_pipeline
from backend.pipelines.stock_pipeline import run_stock_pipeline

# Configure logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def main():
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Test political data pipelines')
    parser.add_argument('--pipeline', choices=['fec', 'congress', 'stock', 'all'],
                        default='all', help='Pipeline to test')
    args = parser.parse_args()
    
    # Test database connection
    logger.info("Testing database connection...")
    if not test_connection():
        logger.error("Database connection failed! Please check your DATABASE_URL environment variable.")
        return
    
    logger.info("Database connection successful.")
    
    # Run selected pipeline(s)
    if args.pipeline == 'fec' or args.pipeline == 'all':
        logger.info("Testing FEC pipeline...")
        run_fec_pipeline()
    
    if args.pipeline == 'congress' or args.pipeline == 'all':
        logger.info("Testing Congress pipeline...")
        run_congress_pipeline()
    
    if args.pipeline == 'stock' or args.pipeline == 'all':
        logger.info("Testing Stock pipeline...")
        run_stock_pipeline()
    
    logger.info("Pipeline tests completed!")

if __name__ == "__main__":
    main()