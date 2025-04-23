"""
Utility functions for the data pipelines
"""
import os
import logging
from typing import Optional, Dict, List, Tuple, Any
from sqlalchemy.orm import Session
from sqlalchemy import text

def setup_logging(name: str, level: int = logging.INFO) -> logging.Logger:
    """
    Set up logging for the pipeline
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    # Create console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(level)
    
    # Create formatter
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    console_handler.setFormatter(formatter)
    
    # Add handler to logger
    logger.addHandler(console_handler)
    
    return logger

def upsert_alias(session: Session, politician_id: int, source: str, external_id: str) -> None:
    """
    Insert or update a politician alias if it doesn't already exist
    
    Args:
        session: SQLAlchemy session
        politician_id: The politician's ID in our database
        source: The source system ('bioguide', 'fec', 'house_fd')
        external_id: The external ID in the source system
    """
    # Check if alias already exists using raw SQL for compatibility
    existing = session.execute(
        text("SELECT id FROM politician_aliases WHERE source = :source AND external_id = :external_id"),
        {"source": source, "external_id": external_id}
    ).fetchone()
    
    if not existing:
        # Insert new alias
        session.execute(
            text("INSERT INTO politician_aliases (politician_id, source, external_id) VALUES (:pid, :src, :ext_id)"),
            {"pid": politician_id, "src": source, "ext_id": external_id}
        )
        session.commit()

def update_photo_url(session: Session, politician_id: int, bioguide_id: str) -> None:
    """
    Update a politician's photo URL based on their bioguide ID
    
    Args:
        session: SQLAlchemy session
        politician_id: The politician's ID in our database
        bioguide_id: The bioguide ID for the politician
    """
    if not bioguide_id:
        return
        
    # Construct the photo URL
    photo_url = f"https://www.congress.gov/img/member/{bioguide_id.lower()}.jpg"
    
    # Update the politician record
    session.execute(
        text("UPDATE politicians SET photo_url = :url WHERE id = :pid"),
        {"url": photo_url, "pid": politician_id}
    )
    session.commit()