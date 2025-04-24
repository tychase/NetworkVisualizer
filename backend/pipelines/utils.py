"""
Shared utility functions for data pipelines

This module provides common functions used by multiple pipelines
"""
import os
import hashlib
import logging
import requests
from pathlib import Path
from datetime import datetime
from typing import Tuple, Optional, Dict, List
from sqlalchemy import text

from backend.database import SessionLocal

# Configure logging
logging.basicConfig(level=logging.INFO,
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def smart_download(url: str, dest_path: str) -> Tuple[str, str]:
    """
    Stream to dest, return (path, sha256). Skip download if ETag unchanged
    (store etag in pipeline_file_checksums table).
    
    Args:
        url: URL to download
        dest_path: Destination path as string
        
    Returns:
        Tuple of (path, sha256 hash)
    """
    logger.info(f"Smart downloading {url} to {dest_path}")
    
    # Convert to Path object for directory operations
    dest = Path(dest_path)
    
    # Ensure parent directory exists
    dest.parent.mkdir(parents=True, exist_ok=True)
    
    # Check if we have an existing checksum record
    with SessionLocal() as db:
        # Check if table exists first (create if not)
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS pipeline_file_checksums (
                id SERIAL PRIMARY KEY,
                url TEXT NOT NULL,
                filepath TEXT NOT NULL,
                etag TEXT,
                sha256 TEXT,
                last_checked TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """))
        db.commit()
        
        # Now check for existing record
        checksum_record = db.execute(
            text("SELECT * FROM pipeline_file_checksums WHERE url = :url"),
            {"url": url}
        ).fetchone()
        
        etag = checksum_record.etag if checksum_record else None
    
    # Prepare request headers
    headers = {}
    if etag:
        headers["If-None-Match"] = etag
    
    # Check if we need to download
    try:
        # Try head request first to check ETag
        head_response = requests.head(url, headers=headers, allow_redirects=True)
        
        # If we get a 304 Not Modified, we can skip the download
        if etag and head_response.status_code == 304:
            logger.info(f"File {url} has not been modified")
            # Return existing file and hash
            existing_hash = checksum_record.sha256 if checksum_record else ""
            return dest_path, existing_hash
        
        # We need to download the file
        new_etag = head_response.headers.get("ETag")
        
        # Download the file
        response = requests.get(url, stream=True)
        response.raise_for_status()
        
        # Open file for writing
        with open(dest, 'wb') as f:
            # Calculate hash while downloading
            sha256 = hashlib.sha256()
            
            # Report download progress
            total_size = int(response.headers.get('content-length', 0))
            downloaded = 0
            
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    sha256.update(chunk)
                    downloaded += len(chunk)
                    
                    # Log progress at 10% intervals
                    if total_size > 0:
                        percent = int((downloaded / total_size) * 100)
                        if percent % 10 == 0:
                            logger.info(f"Download progress: {percent}%")
            
            # Get final hash
            hash_value = sha256.hexdigest()
        
        # Update or insert checksum record
        with SessionLocal() as db:
            if checksum_record:
                # Update existing record
                db.execute(
                    text("""
                        UPDATE pipeline_file_checksums 
                        SET etag = :etag, sha256 = :sha256, last_checked = CURRENT_TIMESTAMP
                        WHERE url = :url
                    """),
                    {"url": url, "etag": new_etag, "sha256": hash_value}
                )
            else:
                # Insert new record
                db.execute(
                    text("""
                        INSERT INTO pipeline_file_checksums (url, filepath, etag, sha256)
                        VALUES (:url, :filepath, :etag, :sha256)
                    """),
                    {
                        "url": url, 
                        "filepath": str(dest), 
                        "etag": new_etag, 
                        "sha256": hash_value
                    }
                )
            db.commit()
        
        logger.info(f"Download complete: {dest}")
        return dest_path, hash_value
    
    except Exception as e:
        logger.error(f"Error in smart_download for {url}: {e}")
        # If the file exists, return it
        if dest.exists():
            logger.info(f"Using existing file {dest}")
            # Calculate hash of existing file
            sha256 = hashlib.sha256()
            with open(dest, 'rb') as f:
                for chunk in iter(lambda: f.read(8192), b''):
                    sha256.update(chunk)
            hash_value = sha256.hexdigest()
            return dest_path, hash_value
        
        # Otherwise raise the exception
        raise

def record_pipeline_run(
    pipeline_name: str,
    status: str,
    rows_processed: int = 0,
    rows_inserted: int = 0,
    notes: Optional[str] = None
) -> int:
    """
    Record a pipeline run in the database
    
    Args:
        pipeline_name: Name of the pipeline
        status: Status of the run
        rows_processed: Number of rows processed
        rows_inserted: Number of rows inserted
        notes: Optional notes about the run
        
    Returns:
        ID of the new pipeline run record
    """
    with SessionLocal() as db:
        # Create a new pipeline run record
        result = db.execute(
            text("""
                INSERT INTO pipeline_runs 
                (pipeline_name, started_at, ended_at, status, rows_processed, rows_inserted, notes)
                VALUES 
                (:pipeline_name, CURRENT_TIMESTAMP, 
                 CASE WHEN :status = 'running' THEN NULL ELSE CURRENT_TIMESTAMP END,
                 :status, :rows_processed, :rows_inserted, :notes)
                RETURNING id
            """),
            {
                "pipeline_name": pipeline_name,
                "status": status,
                "rows_processed": rows_processed,
                "rows_inserted": rows_inserted,
                "notes": notes
            }
        )
        
        db.commit()
        
        # Return the ID of the new record
        return result.fetchone()[0]

def update_pipeline_run(
    run_id: int,
    status: str,
    rows_processed: int = 0,
    rows_inserted: int = 0,
    notes: Optional[str] = None
) -> None:
    """
    Update a pipeline run record in the database
    
    Args:
        run_id: ID of the pipeline run to update
        status: Status of the run
        rows_processed: Number of rows processed
        rows_inserted: Number of rows inserted
        notes: Optional notes about the run
    """
    with SessionLocal() as db:
        # Update the pipeline run record
        db.execute(
            text("""
                UPDATE pipeline_runs
                SET ended_at = CURRENT_TIMESTAMP,
                    status = :status,
                    rows_processed = :rows_processed,
                    rows_inserted = :rows_inserted,
                    notes = :notes
                WHERE id = :run_id
            """),
            {
                "run_id": run_id,
                "status": status,
                "rows_processed": rows_processed,
                "rows_inserted": rows_inserted,
                "notes": notes
            }
        )
        
        db.commit()

def get_pipeline_runs(limit: int = 10) -> List[Dict]:
    """
    Get the latest pipeline runs from the database
    
    Args:
        limit: Maximum number of runs to return
        
    Returns:
        List of pipeline run records
    """
    with SessionLocal() as db:
        result = db.execute(
            text("""
                SELECT 
                    id, pipeline_name, started_at, ended_at, status, 
                    rows_processed, rows_inserted, notes
                FROM pipeline_runs
                ORDER BY started_at DESC
                LIMIT :limit
            """),
            {"limit": limit}
        )
        
        # Convert to list of dictionaries
        runs = []
        for row in result:
            runs.append({
                "id": row.id,
                "pipeline_name": row.pipeline_name,
                "started_at": row.started_at,
                "ended_at": row.ended_at,
                "status": row.status,
                "rows_processed": row.rows_processed,
                "rows_inserted": row.rows_inserted,
                "notes": row.notes
            })
        
        return runs