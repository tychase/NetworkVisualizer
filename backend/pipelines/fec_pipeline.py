"""
FEC (Federal Election Commission) data pipeline

This module downloads, processes, and stores FEC bulk data
with support for incremental updates.
"""
import os
import pandas as pd
import requests
import tempfile
import logging
import hashlib
import json
import time
from datetime import datetime, timedelta
from sqlalchemy import select, insert, Table
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert as pg_insert
from typing import Dict, Optional, Tuple

from backend.database import engine, SessionLocal, Base
from shared.schema import politicians, contributions, pipelineRuns

# Configure logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# FEC Bulk Data URLs - use environment variables if available
FEC_BULK_DATA_BASE_URL = os.environ.get("FEC_BULK_DATA_BASE_URL", "https://www.fec.gov/files/bulk-downloads")
CANDIDATE_MASTER_URL = os.environ.get("CANDIDATE_MASTER_URL", f"{FEC_BULK_DATA_BASE_URL}/candidate-master/cn.zip")
COMMITTEE_MASTER_URL = os.environ.get("COMMITTEE_MASTER_URL", f"{FEC_BULK_DATA_BASE_URL}/committee-master/cm.zip")
CONTRIBUTIONS_URL = os.environ.get("CONTRIBUTIONS_URL", f"{FEC_BULK_DATA_BASE_URL}/contributions/indiv.zip")

# Data directories
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
FEC_DATA_DIR = os.path.join(DATA_DIR, "fec")
METADATA_FILE = os.path.join(FEC_DATA_DIR, "metadata.json")

def ensure_data_dirs():
    """Ensure data directories exist"""
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(FEC_DATA_DIR, exist_ok=True)

def get_file_metadata(file_path: str) -> Dict:
    """
    Get metadata for a file including size, modification time, and hash
    """
    metadata = {}
    
    if os.path.exists(file_path):
        metadata["size"] = os.path.getsize(file_path)
        metadata["mtime"] = os.path.getmtime(file_path)
        
        # Calculate md5 hash of first 1MB of file
        with open(file_path, 'rb') as f:
            data = f.read(1024 * 1024)  # Read first 1MB
            metadata["hash"] = hashlib.md5(data).hexdigest()
    
    return metadata

def load_metadata() -> Dict:
    """
    Load pipeline metadata from file
    """
    if not os.path.exists(METADATA_FILE):
        return {}
    
    try:
        with open(METADATA_FILE, 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading metadata: {e}")
        return {}

def save_metadata(metadata: Dict) -> None:
    """
    Save pipeline metadata to file
    """
    try:
        with open(METADATA_FILE, 'w') as f:
            json.dump(metadata, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving metadata: {e}")

def check_for_updates(url: str, local_path: str, metadata: Dict) -> bool:
    """
    Check if a remote file has been updated by comparing headers
    """
    logger.info(f"Checking for updates to {url}")
    
    file_metadata = metadata.get(local_path, {})
    last_modified = file_metadata.get("last_modified")
    etag = file_metadata.get("etag")
    
    headers = {}
    if last_modified:
        headers["If-Modified-Since"] = last_modified
    if etag:
        headers["If-None-Match"] = etag
    
    try:
        response = requests.head(url, headers=headers, allow_redirects=True)
        
        # If 304 Not Modified, file hasn't changed
        if response.status_code == 304:
            logger.info(f"File {url} has not been modified")
            return False
        
        # Check if response contains Last-Modified or ETag
        new_last_modified = response.headers.get("Last-Modified")
        new_etag = response.headers.get("ETag")
        
        # If we have both old and new values, compare them
        if last_modified and new_last_modified and last_modified == new_last_modified:
            logger.info(f"File {url} has same Last-Modified header: {last_modified}")
            return False
        
        if etag and new_etag and etag == new_etag:
            logger.info(f"File {url} has same ETag: {etag}")
            return False
        
        # File has been updated
        logger.info(f"File {url} has been updated")
        if new_last_modified:
            file_metadata["last_modified"] = new_last_modified
        if new_etag:
            file_metadata["etag"] = new_etag
        
        metadata[local_path] = file_metadata
        save_metadata(metadata)
        
        return True
    
    except Exception as e:
        logger.error(f"Error checking for updates: {e}")
        # If error occurs, assume we need to update
        return True

def download_file(url: str, local_path: str, force: bool = False) -> Tuple[bool, Dict]:
    """
    Download a file from URL to local path with progress reporting,
    with support for resume and partial downloads
    """
    logger.info(f"Downloading {url} to {local_path}")
    
    # Load metadata
    metadata = load_metadata()
    
    # If file exists and force is False, check if it needs updating
    if os.path.exists(local_path) and not force:
        if not check_for_updates(url, local_path, metadata):
            # File hasn't changed, no need to re-download
            return (False, metadata)
    
    # File needs to be downloaded or updated
    try:
        # Create a temporary file for downloading
        temp_path = f"{local_path}.tmp"
        
        # Check if we can resume download
        headers = {}
        if os.path.exists(temp_path):
            temp_size = os.path.getsize(temp_path)
            headers["Range"] = f"bytes={temp_size}-"
            logger.info(f"Resuming download from byte {temp_size}")
            mode = "ab"
        else:
            logger.info("Starting new download")
            mode = "wb"
        
        with requests.get(url, headers=headers, stream=True) as response:
            # Handle non-206 response for resume requests
            if "Range" in headers and response.status_code != 206:
                logger.info("Server doesn't support resume, starting new download")
                mode = "wb"
                response = requests.get(url, stream=True)
            
            response.raise_for_status()
            
            # Get content length if available
            total_size = int(response.headers.get('content-length', 0))
            if "Range" in headers and response.status_code == 206:
                # For resumed downloads, add the existing file size
                total_size += os.path.getsize(temp_path)
            
            # Save headers for future update checks
            file_metadata = metadata.get(local_path, {})
            
            if "Last-Modified" in response.headers:
                file_metadata["last_modified"] = response.headers["Last-Modified"]
            
            if "ETag" in response.headers:
                file_metadata["etag"] = response.headers["ETag"]
            
            # Write the response content to the temporary file
            with open(temp_path, mode) as f:
                downloaded = os.path.getsize(temp_path) if mode == "ab" else 0
                
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
                        
                        # Log progress at 10% intervals
                        if total_size > 0:
                            percent = int((downloaded / total_size) * 100)
                            if percent % 10 == 0:
                                logger.info(f"Download progress: {percent}%")
            
            # Move the temporary file to the final location
            os.replace(temp_path, local_path)
            
            # Update file metadata
            file_metadata.update(get_file_metadata(local_path))
            metadata[local_path] = file_metadata
            save_metadata(metadata)
            
            logger.info(f"Download complete: {local_path}")
            return (True, metadata)
    
    except Exception as e:
        logger.error(f"Error downloading {url}: {e}")
        return (False, metadata)

def record_pipeline_run(
    pipeline_name: str,
    status: str,
    rows_processed: int = 0,
    rows_inserted: int = 0,
    notes: Optional[str] = None
) -> int:
    """
    Record a pipeline run in the database
    """
    with SessionLocal() as db:
        # Create a new pipeline run record
        result = db.execute(
            insert(pipelineRuns).values(
                pipelineName=pipeline_name,
                startedAt=datetime.now(),
                endedAt=datetime.now() if status != "running" else None,
                status=status,
                rowsProcessed=rows_processed,
                rowsInserted=rows_inserted,
                notes=notes
            )
        )
        
        db.commit()
        
        # Return the ID of the new record
        return result.inserted_primary_key[0]

def update_pipeline_run(
    run_id: int,
    status: str,
    rows_processed: int = 0,
    rows_inserted: int = 0,
    notes: Optional[str] = None
) -> None:
    """
    Update a pipeline run record in the database
    """
    with SessionLocal() as db:
        # Update the pipeline run record
        query = pipelineRuns.update().where(pipelineRuns.c.id == run_id).values(
            endedAt=datetime.now(),
            status=status,
            rowsProcessed=rows_processed,
            rowsInserted=rows_inserted,
            notes=notes
        )
        
        db.execute(query)
        db.commit()

def upsert_data(table: Table, data: Dict, unique_constraints: list) -> Tuple[bool, str]:
    """
    Insert or update data in a table using PostgreSQL's ON CONFLICT clause
    """
    try:
        with SessionLocal() as db:
            # Create an insert statement with ON CONFLICT DO UPDATE
            stmt = pg_insert(table).values(**data)
            
            # Set up the ON CONFLICT clause
            update_dict = {c.name: getattr(stmt.excluded, c.name) 
                          for c in table.columns 
                          if c.name not in unique_constraints and c.name != 'id'}
            
            # Only update if any of the non-constraint fields differ
            stmt = stmt.on_conflict_do_update(
                index_elements=unique_constraints,
                set_=update_dict
            )
            
            db.execute(stmt)
            db.commit()
            
            return (True, "")
    
    except Exception as e:
        error_message = str(e)
        logger.error(f"Error upserting data into {table.name}: {error_message}")
        return (False, error_message)

def process_candidate_data(file_path: str, run_id: int) -> bool:
    """
    Process candidate master file and insert into database with support for incremental updates
    """
    logger.info(f"Processing candidate data from {file_path}")
    
    try:
        # Read CSV file
        df = pd.read_csv(file_path, delimiter='|', header=None, 
                         encoding='iso-8859-1', low_memory=False)
        
        # Columns in the FEC candidate master file (2022 format)
        # Adjust column names if needed for different years
        columns = [
            'candidate_id', 'candidate_name', 'party_1', 'party_2', 'party_3',
            'filing_year', 'office', 'state', 'district', 'incumbent_challenger',
            'status', 'principal_committee_id', 'address', 'city', 'state_address',
            'zip_code'
        ]
        
        # Assign column names
        if len(df.columns) >= len(columns):
            df.columns = columns + list(range(len(df.columns) - len(columns)))
        else:
            logger.warning(f"Column mismatch: expected {len(columns)} columns, got {len(df.columns)}")
            columns = columns[:len(df.columns)]
            df.columns = columns
        
        rows_processed = 0
        rows_inserted = 0
        
        # Process data
        with SessionLocal() as db:
            # Get existing politicians by FEC candidate_id for incremental updates
            # (We'll need to add candidate_id to the politicians table, so for now we match by name)
            existing_politicians = db.execute(select(politicians)).fetchall()
            existing_map = {}
            
            for p in existing_politicians:
                full_name = f"{p.firstName} {p.lastName}".lower()
                existing_map[full_name] = p.id
            
            for _, row in df.iterrows():
                try:
                    rows_processed += 1
                    
                    # Basic validation
                    if pd.isna(row['candidate_name']) or pd.isna(row['party_1']):
                        continue
                    
                    # Extract first and last name
                    name_parts = row['candidate_name'].split(',')
                    if len(name_parts) >= 2:
                        last_name = name_parts[0].strip()
                        first_name = name_parts[1].strip()
                    else:
                        last_name = row['candidate_name']
                        first_name = ""
                    
                    full_name = f"{first_name} {last_name}".lower()
                    
                    # Check if politician already exists
                    if full_name in existing_map:
                        # Politician already exists, could update here if needed
                        continue
                    
                    # Insert new politician
                    result = db.execute(
                        insert(politicians).values(
                            firstName=first_name,
                            lastName=last_name,
                            state=row['state'] if not pd.isna(row['state']) else 'Unknown',
                            party=row['party_1'] if not pd.isna(row['party_1']) else 'Unknown',
                            profileImage=None
                        )
                    )
                    
                    # Add to existing map to avoid duplicate inserts
                    new_id = result.inserted_primary_key[0]
                    existing_map[full_name] = new_id
                    
                    rows_inserted += 1
                
                except Exception as e:
                    logger.error(f"Error processing candidate row: {e}")
                    continue
            
            db.commit()
        
        # Update pipeline run record
        update_pipeline_run(
            run_id=run_id,
            status="processing_candidates_completed",
            rows_processed=rows_processed,
            rows_inserted=rows_inserted
        )
        
        logger.info(f"Candidate data processing complete: {rows_processed} processed, {rows_inserted} inserted")
        return True
    
    except Exception as e:
        error_message = str(e)
        logger.error(f"Error processing candidate data: {error_message}")
        
        # Update pipeline run record with error
        update_pipeline_run(
            run_id=run_id,
            status="error",
            notes=f"Error processing candidate data: {error_message}"
        )
        
        return False

def process_contributions_data(file_path: str, run_id: int, batch_size: int = 10000, last_processed_time: Optional[str] = None) -> bool:
    """
    Process individual contributions file and insert into database with support for incremental updates
    """
    logger.info(f"Processing contributions data from {file_path}")
    
    try:
        # Get last processed record datetime for incremental processing
        last_processed_datetime = None
        if last_processed_time:
            try:
                last_processed_datetime = pd.to_datetime(last_processed_time)
                logger.info(f"Processing contributions after {last_processed_datetime}")
            except:
                logger.warning(f"Could not parse last processed time: {last_processed_time}")
        
        # Use pandas to read the file in chunks due to size
        chunks = pd.read_csv(file_path, delimiter='|', header=None,
                            encoding='iso-8859-1', low_memory=False,
                            chunksize=batch_size)
        
        # Columns in the FEC individual contributions file
        # Adjust column names if needed for different years
        columns = [
            'committee_id', 'amendment_ind', 'report_type', 'transaction_pgi',
            'image_number', 'transaction_type', 'entity_type', 'contributor_name',
            'city', 'state', 'zip_code', 'employer', 'occupation',
            'transaction_date', 'transaction_amount', 'committee_name',
            'candidate_id', 'candidate_name', 'candidate_office'
        ]
        
        chunk_count = 0
        total_records_processed = 0
        total_records_inserted = 0
        latest_transaction_date = last_processed_datetime
        
        # Process each chunk
        for chunk in chunks:
            chunk_count += 1
            logger.info(f"Processing chunk {chunk_count}")
            
            # Assign column names
            if len(chunk.columns) >= len(columns):
                chunk.columns = columns + list(range(len(chunk.columns) - len(columns)))
            else:
                logger.warning(f"Column mismatch: expected {len(columns)} columns, got {len(chunk.columns)}")
                columns_adjusted = columns[:len(chunk.columns)]
                chunk.columns = columns_adjusted
            
            # For incremental processing, convert transaction dates to datetime
            if 'transaction_date' in chunk.columns:
                chunk['transaction_date_dt'] = pd.to_datetime(chunk['transaction_date'], errors='coerce')
                
                # Skip records older than last processed time
                if last_processed_datetime:
                    chunk = chunk[chunk['transaction_date_dt'] > last_processed_datetime]
                    
                    # If no records remain after filtering, skip this chunk
                    if chunk.empty:
                        logger.info(f"Chunk {chunk_count} contains no new records, skipping")
                        continue
            
            # Track the latest transaction date for next incremental run
            if 'transaction_date_dt' in chunk.columns and not chunk['transaction_date_dt'].isna().all():
                chunk_max_date = chunk['transaction_date_dt'].max()
                if latest_transaction_date is None or chunk_max_date > latest_transaction_date:
                    latest_transaction_date = chunk_max_date
            
            with SessionLocal() as db:
                # Get all politicians from the database
                politicians_data = db.execute(select(politicians)).fetchall()
                politician_mapping = {f"{p.firstName} {p.lastName}".lower(): p.id for p in politicians_data}
                
                chunk_records_processed = 0
                chunk_records_inserted = 0
                
                for _, row in chunk.iterrows():
                    try:
                        chunk_records_processed += 1
                        
                        # Skip rows with missing key data
                        if pd.isna(row['transaction_amount']) or pd.isna(row['candidate_name']):
                            continue
                        
                        # Clean candidate name and try to match with database
                        candidate_name_clean = row['candidate_name'].replace(',', ' ').strip().lower()
                        politician_id = None
                        
                        # Try to find matching politician
                        for name, pid in politician_mapping.items():
                            if name in candidate_name_clean or candidate_name_clean in name:
                                politician_id = pid
                                break
                        
                        if not politician_id:
                            # Skip if no matching politician found
                            continue
                        
                        # Parse date
                        try:
                            transaction_date = pd.to_datetime(row['transaction_date']).date()
                        except:
                            # Try alternative format if needed
                            try:
                                transaction_date = pd.to_datetime(row['transaction_date'], format="%m%d%Y").date()
                            except:
                                # Skip records with invalid dates for incremental processing
                                continue
                        
                        # Determine organization and industry
                        organization = row['committee_name'] if not pd.isna(row['committee_name']) else "Unknown"
                        industry = row['occupation'] if not pd.isna(row['occupation']) else "Unknown"
                        
                        # Convert amount to decimal
                        try:
                            amount = float(row['transaction_amount'])
                        except:
                            continue
                        
                        # Insert into database
                        db.execute(
                            insert(contributions).values(
                                politicianId=politician_id,
                                organization=organization,
                                amount=amount,
                                contributionDate=transaction_date,
                                industry=industry
                            )
                        )
                        
                        chunk_records_inserted += 1
                    
                    except Exception as e:
                        logger.error(f"Error processing contribution row: {e}")
                        continue
                
                # Commit changes for this chunk
                db.commit()
                
                total_records_processed += chunk_records_processed
                total_records_inserted += chunk_records_inserted
                
                logger.info(f"Chunk {chunk_count} processed: {chunk_records_processed} records, {chunk_records_inserted} inserted")
                
                # Update pipeline run record periodically
                if chunk_count % 10 == 0:
                    update_pipeline_run(
                        run_id=run_id,
                        status=f"processing_contributions_chunk_{chunk_count}",
                        rows_processed=total_records_processed,
                        rows_inserted=total_records_inserted
                    )
        
        # Store latest transaction date for next incremental run
        metadata = load_metadata()
        if latest_transaction_date:
            metadata["contributions_last_processed"] = latest_transaction_date.isoformat()
            save_metadata(metadata)
        
        # Update pipeline run record
        update_pipeline_run(
            run_id=run_id,
            status="completed",
            rows_processed=total_records_processed,
            rows_inserted=total_records_inserted,
            notes=f"Latest transaction date: {latest_transaction_date.isoformat() if latest_transaction_date else 'None'}"
        )
        
        logger.info(f"Contributions data processing complete: {total_records_processed} processed, {total_records_inserted} inserted")
        return True
    
    except Exception as e:
        error_message = str(e)
        logger.error(f"Error processing contributions data: {error_message}")
        
        # Update pipeline run record with error
        update_pipeline_run(
            run_id=run_id,
            status="error",
            rows_processed=total_records_processed,
            rows_inserted=total_records_inserted,
            notes=f"Error processing contributions data: {error_message}"
        )
        
        return False

def run_fec_pipeline(force_download: bool = False, skip_candidates: bool = False, skip_contributions: bool = False) -> Dict:
    """
    Main function to run the FEC data pipeline with support for incremental updates
    """
    # Record pipeline run start
    run_id = record_pipeline_run("fec", "running")
    
    logger.info("Starting FEC data pipeline")
    start_time = time.time()
    
    # Load metadata
    metadata = load_metadata()
    
    # Ensure data directories exist
    ensure_data_dirs()
    
    # Define local file paths
    candidates_file = os.path.join(FEC_DATA_DIR, "candidates.csv")
    committees_file = os.path.join(FEC_DATA_DIR, "committees.csv")
    contributions_file = os.path.join(FEC_DATA_DIR, "contributions.csv")
    
    results = {
        "success": False,
        "run_id": run_id,
        "candidate_processing": False,
        "contributions_processing": False,
        "rows_processed": 0,
        "rows_inserted": 0,
        "duration_seconds": 0,
        "errors": []
    }
    
    try:
        # Process candidates
        if not skip_candidates:
            # Download candidate data
            candidate_downloaded, metadata = download_file(CANDIDATE_MASTER_URL, candidates_file, force=force_download)
            
            # Process candidate data
            if candidate_downloaded or force_download:
                logger.info("Processing candidate data")
                if process_candidate_data(candidates_file, run_id):
                    results["candidate_processing"] = True
                else:
                    results["errors"].append("Error processing candidate data")
            else:
                logger.info("No new candidate data to process")
                results["candidate_processing"] = True
        
        # Process contributions
        if not skip_contributions:
            # Download contributions data (this file is very large, may take a while)
            contributions_downloaded, metadata = download_file(CONTRIBUTIONS_URL, contributions_file, force=force_download)
            
            # Process contributions data
            if contributions_downloaded or force_download:
                logger.info("Processing contributions data")
                
                # Get last processed time for incremental processing
                last_processed_time = metadata.get("contributions_last_processed")
                
                if process_contributions_data(contributions_file, run_id, last_processed_time=last_processed_time):
                    results["contributions_processing"] = True
                else:
                    results["errors"].append("Error processing contributions data")
            else:
                logger.info("No new contributions data to process")
                results["contributions_processing"] = True
        
        # Calculate duration
        end_time = time.time()
        duration_seconds = int(end_time - start_time)
        
        # Update pipeline run record
        with SessionLocal() as db:
            pipeline_run = db.execute(select(pipelineRuns).where(pipelineRuns.c.id == run_id)).fetchone()
            
            if pipeline_run:
                results["rows_processed"] = pipeline_run.rowsProcessed
                results["rows_inserted"] = pipeline_run.rowsInserted
        
        # Overall success if both processes succeeded
        results["success"] = (skip_candidates or results["candidate_processing"]) and (skip_contributions or results["contributions_processing"])
        results["duration_seconds"] = duration_seconds
        
        # Final update to pipeline run
        update_pipeline_run(
            run_id=run_id,
            status="completed" if results["success"] else "error",
            notes=f"Duration: {duration_seconds} seconds. Errors: {'; '.join(results['errors']) if results['errors'] else 'None'}"
        )
        
        logger.info(f"FEC data pipeline completed in {duration_seconds} seconds with status: {'success' if results['success'] else 'error'}")
        
        return results
    
    except Exception as e:
        error_message = str(e)
        logger.error(f"Error in FEC pipeline: {error_message}")
        
        # Update pipeline run record with error
        update_pipeline_run(
            run_id=run_id,
            status="error",
            notes=f"Unhandled error in FEC pipeline: {error_message}"
        )
        
        # Add error to results
        results["errors"].append(error_message)
        
        # Calculate duration
        end_time = time.time()
        results["duration_seconds"] = int(end_time - start_time)
        
        return results

if __name__ == "__main__":
    run_fec_pipeline()