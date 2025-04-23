"""
FEC (Federal Election Commission) data pipeline

This module downloads, processes, and stores FEC bulk data
"""
import os
import pandas as pd
import requests
import tempfile
import logging
from datetime import datetime
from sqlalchemy import select, insert
from sqlalchemy.orm import Session

from backend.database import engine, SessionLocal, Base
from shared.schema import politicians, contributions

# Configure logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# FEC Bulk Data URLs
FEC_BULK_DATA_BASE_URL = "https://www.fec.gov/files/bulk-downloads"
CANDIDATE_MASTER_URL = f"{FEC_BULK_DATA_BASE_URL}/candidate-master/cn.zip"
COMMITTEE_MASTER_URL = f"{FEC_BULK_DATA_BASE_URL}/committee-master/cm.zip" 
CONTRIBUTIONS_URL = f"{FEC_BULK_DATA_BASE_URL}/contributions/indiv.zip"

# Data directories
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
FEC_DATA_DIR = os.path.join(DATA_DIR, "fec")

def ensure_data_dirs():
    """Ensure data directories exist"""
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(FEC_DATA_DIR, exist_ok=True)

def download_file(url, local_path):
    """
    Download a file from URL to local path with progress reporting
    """
    logger.info(f"Downloading {url} to {local_path}")
    
    try:
        with requests.get(url, stream=True) as response:
            response.raise_for_status()
            total_size = int(response.headers.get('content-length', 0))
            
            with open(local_path, 'wb') as f:
                downloaded = 0
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
                        
                        # Log progress at 10% intervals
                        if total_size > 0:
                            percent = int((downloaded / total_size) * 100)
                            if percent % 10 == 0:
                                logger.info(f"Download progress: {percent}%")
                                
        logger.info(f"Download complete: {local_path}")
        return True
    except Exception as e:
        logger.error(f"Error downloading {url}: {e}")
        return False

def process_candidate_data(file_path):
    """
    Process candidate master file and insert into database
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
        
        # Process data
        with SessionLocal() as db:
            for _, row in df.iterrows():
                try:
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
                    
                    # Check if politician already exists
                    exists = db.execute(
                        select(politicians.c.id).where(
                            politicians.c.firstName == first_name,
                            politicians.c.lastName == last_name
                        )
                    ).scalar_one_or_none()
                    
                    if not exists:
                        # Insert into database
                        db.execute(
                            insert(politicians).values(
                                firstName=first_name,
                                lastName=last_name,
                                state=row['state'] if not pd.isna(row['state']) else 'Unknown',
                                party=row['party_1'] if not pd.isna(row['party_1']) else 'Unknown',
                                profileImage=None
                            )
                        )
                
                except Exception as e:
                    logger.error(f"Error processing candidate row: {e}")
                    continue
            
            db.commit()
            
        logger.info("Candidate data processing complete")
        return True
    
    except Exception as e:
        logger.error(f"Error processing candidate data: {e}")
        return False

def process_contributions_data(file_path, batch_size=10000):
    """
    Process individual contributions file and insert into database
    """
    logger.info(f"Processing contributions data from {file_path}")
    
    try:
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
        records_processed = 0
        
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
            
            with SessionLocal() as db:
                # Get all politicians from the database
                politicians_data = db.execute(select(politicians)).fetchall()
                politician_mapping = {f"{p.firstName} {p.lastName}": p.id for p in politicians_data}
                
                for _, row in chunk.iterrows():
                    try:
                        # Skip rows with missing key data
                        if pd.isna(row['transaction_amount']) or pd.isna(row['candidate_name']):
                            continue
                        
                        # Clean candidate name and try to match with database
                        candidate_name_clean = row['candidate_name'].replace(',', ' ').strip()
                        politician_id = None
                        
                        # Try to find matching politician
                        for name, pid in politician_mapping.items():
                            if name.lower() in candidate_name_clean.lower() or candidate_name_clean.lower() in name.lower():
                                politician_id = pid
                                break
                        
                        if not politician_id:
                            # Skip if no matching politician found
                            continue
                        
                        # Parse date (adjust format as needed)
                        try:
                            transaction_date = pd.to_datetime(row['transaction_date']).date()
                        except:
                            # Try alternative format if needed
                            try:
                                transaction_date = pd.to_datetime(row['transaction_date'], format="%m%d%Y").date()
                            except:
                                # Default to current date if parsing fails
                                transaction_date = datetime.now().date()
                        
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
                        
                        records_processed += 1
                    
                    except Exception as e:
                        logger.error(f"Error processing contribution row: {e}")
                        continue
                
                db.commit()
            
            logger.info(f"Chunk {chunk_count} processed, {records_processed} total records inserted")
            
        logger.info(f"Contributions data processing complete: {records_processed} records inserted")
        return True
    
    except Exception as e:
        logger.error(f"Error processing contributions data: {e}")
        return False

def run_fec_pipeline():
    """
    Main function to run the FEC data pipeline
    """
    logger.info("Starting FEC data pipeline")
    
    # Ensure data directories exist
    ensure_data_dirs()
    
    # Define local file paths
    candidates_file = os.path.join(FEC_DATA_DIR, "candidates.csv")
    committees_file = os.path.join(FEC_DATA_DIR, "committees.csv")
    contributions_file = os.path.join(FEC_DATA_DIR, "contributions.csv")
    
    # Download candidate data
    candidate_downloaded = download_file(CANDIDATE_MASTER_URL, candidates_file)
    
    # Process candidate data
    if candidate_downloaded:
        process_candidate_data(candidates_file)
    
    # Download contributions data (this file is very large, may take a while)
    contributions_downloaded = download_file(CONTRIBUTIONS_URL, contributions_file)
    
    # Process contributions data
    if contributions_downloaded:
        process_contributions_data(contributions_file)
    
    logger.info("FEC data pipeline completed")

if __name__ == "__main__":
    run_fec_pipeline()