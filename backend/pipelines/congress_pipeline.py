"""
Congress.gov data pipeline

This module downloads, processes, and stores data from Congress.gov and GovInfo
"""
import os
import json
import requests
import logging
import tempfile
import xml.etree.ElementTree as ET
from datetime import datetime
from sqlalchemy import select, insert
from bs4 import BeautifulSoup

from backend.database import engine, SessionLocal, Base
from shared.schema import politicians, votes
from backend.utils import upsert_alias, update_photo_url

# Configure logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Congress.gov and GovInfo URLs
GOVINFO_API_URL = "https://api.govinfo.gov/collections"
CONGRESS_XML_BASE_URL = "https://www.govinfo.gov/bulkdata/BILLSTATUS"
CONGRESS_MEMBERS_URL = "https://www.congress.gov/members"
GOVINFO_BULK_DATA_URL = "https://www.govinfo.gov/bulkdata"

# Data directories
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
CONGRESS_DATA_DIR = os.path.join(DATA_DIR, "congress")

def ensure_data_dirs():
    """Ensure data directories exist"""
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(CONGRESS_DATA_DIR, exist_ok=True)

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

def fetch_congressman_list(congress_number=117):
    """
    Fetch list of members of Congress
    
    This demonstrates scraping the Congress.gov members page,
    though in a production environment you might prefer a bulk data file
    """
    logger.info(f"Fetching members of the {congress_number}th Congress")
    
    # In a real implementation, we would scrape or use an API to get the congressmen
    url = f"{CONGRESS_MEMBERS_URL}?q={{%22congress%22:%22{congress_number}%22}}"
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        
        # Parse HTML
        soup = BeautifulSoup(response.text, 'lxml')
        
        # Find member names and details
        members = []
        
        # Example implementation - would need adjustment for the actual HTML structure
        member_elements = soup.select('.expanded-view .table tbody tr')
        
        for element in member_elements:
            try:
                name_elem = element.select_one('td:nth-child(1) a')
                if not name_elem:
                    continue
                    
                name = name_elem.text.strip()
                member_url = name_elem.get('href', '')
                
                # Try to get party and state
                party = "Unknown"
                state = "Unknown"
                
                party_state_elem = element.select_one('td:nth-child(2)')
                if party_state_elem:
                    party_state_text = party_state_elem.text.strip()
                    
                    # Parse party and state (format is usually "D-NY" or similar)
                    if '-' in party_state_text:
                        party_code, state_code = party_state_text.split('-', 1)
                        party = party_code.strip()
                        state = state_code.strip()
                
                members.append({
                    'name': name,
                    'party': party,
                    'state': state,
                    'url': f"https://www.congress.gov{member_url}" if member_url.startswith('/') else member_url,
                    'congress': congress_number
                })
            
            except Exception as e:
                logger.error(f"Error parsing member element: {e}")
                continue
        
        logger.info(f"Found {len(members)} members of the {congress_number}th Congress")
        return members
    
    except Exception as e:
        logger.error(f"Error fetching congressional members: {e}")
        return []

def download_vote_data(congress_number, session, chamber="house"):
    """
    Download voting data for a specific Congress, session, and chamber
    """
    if chamber not in ["house", "senate"]:
        logger.error(f"Invalid chamber: {chamber}")
        return False
    
    # Example URL: https://www.govinfo.gov/bulkdata/BILLSTATUS/117/hr/BILLSTATUS-117hr.zip
    if chamber == "house":
        chamber_code = "hr"
    else:
        chamber_code = "s"
    
    url = f"{CONGRESS_XML_BASE_URL}/{congress_number}/{chamber_code}/BILLSTATUS-{congress_number}{chamber_code}.zip"
    local_path = os.path.join(CONGRESS_DATA_DIR, f"votes_{congress_number}_{chamber}.zip")
    
    return download_file(url, local_path)

def process_bill_status_file(file_path):
    """
    Process bill status XML file and extract vote information
    """
    logger.info(f"Processing bill status file: {file_path}")
    
    try:
        # Parse XML
        tree = ET.parse(file_path)
        root = tree.getroot()
        
        # Extract bill information
        bill_number = root.find('.//billNumber')
        bill_title = root.find('.//title')
        
        bill_name = bill_number.text if bill_number is not None else "Unknown"
        bill_description = bill_title.text if bill_title is not None else "Unknown"
        
        # Extract votes
        vote_elements = root.findall('.//recordedVote')
        votes_data = []
        
        for vote_elem in vote_elements:
            try:
                # Get vote date
                date_elem = vote_elem.find('./date')
                vote_date = datetime.now().date()
                if date_elem is not None and date_elem.text:
                    try:
                        vote_date = datetime.strptime(date_elem.text, "%Y-%m-%d").date()
                    except:
                        logger.warning(f"Could not parse vote date: {date_elem.text}")
                
                # Get legislators and their votes
                legislators = vote_elem.findall('.//legislator')
                
                for legislator in legislators:
                    name_elem = legislator.find('./fullName')
                    vote_cast_elem = legislator.find('./vote')
                    party_elem = legislator.find('./party')
                    state_elem = legislator.find('./state')
                    
                    if name_elem is not None and vote_cast_elem is not None:
                        votes_data.append({
                            'politician_name': name_elem.text,
                            'vote_result': vote_cast_elem.text,
                            'vote_date': vote_date,
                            'bill_name': bill_name,
                            'bill_description': bill_description,
                            'party': party_elem.text if party_elem is not None else "Unknown",
                            'state': state_elem.text if state_elem is not None else "Unknown"
                        })
            
            except Exception as e:
                logger.error(f"Error processing vote element: {e}")
                continue
        
        logger.info(f"Extracted {len(votes_data)} votes for bill {bill_name}")
        return votes_data
    
    except Exception as e:
        logger.error(f"Error processing bill status file: {e}")
        return []

def save_votes_to_database(votes_data):
    """
    Save votes to the database
    """
    logger.info(f"Saving {len(votes_data)} votes to database")
    
    with SessionLocal() as db:
        # Get all politicians from the database
        politicians_data = db.execute(select(politicians)).fetchall()
        
        # Create mapping of names to IDs
        politician_mapping = {}
        for p in politicians_data:
            full_name = f"{p.firstName} {p.lastName}".lower()
            politician_mapping[full_name] = p.id
            # Also add just the last name for fuzzy matching
            politician_mapping[p.lastName.lower()] = p.id
        
        votes_inserted = 0
        
        for vote_data in votes_data:
            try:
                politician_name = vote_data['politician_name']
                politician_id = None
                
                # Try to find matching politician
                politician_name_lower = politician_name.lower()
                
                for name, pid in politician_mapping.items():
                    if name in politician_name_lower or politician_name_lower in name:
                        politician_id = pid
                        break
                
                # If politician not found, we can optionally create them
                if not politician_id:
                    # Split name into parts
                    name_parts = politician_name.split()
                    
                    if len(name_parts) > 1:
                        first_name = name_parts[0]
                        last_name = name_parts[-1]
                        
                        # Create new politician
                        result = db.execute(
                            insert(politicians).values(
                                firstName=first_name,
                                lastName=last_name,
                                state=vote_data.get('state', 'Unknown'),
                                party=vote_data.get('party', 'Unknown'),
                                profileImage=None
                            )
                        )
                        
                        # Get the new ID
                        politician_id = result.inserted_primary_key[0]
                        
                        # Add to mapping
                        politician_mapping[politician_name.lower()] = politician_id
                        politician_mapping[last_name.lower()] = politician_id
                
                # Insert vote data if we have a politician ID
                if politician_id:
                    db.execute(
                        insert(votes).values(
                            politicianId=politician_id,
                            billName=vote_data['bill_name'],
                            billDescription=vote_data['bill_description'],
                            voteDate=vote_data['vote_date'],
                            voteResult=vote_data['vote_result']
                        )
                    )
                    
                    votes_inserted += 1
            
            except Exception as e:
                logger.error(f"Error saving vote: {e}")
                continue
        
        db.commit()
        logger.info(f"Saved {votes_inserted} votes to database")
        return votes_inserted

def run_congress_pipeline(congress_number=117, session=1):
    """
    Main function to run the Congress.gov data pipeline
    """
    logger.info(f"Starting Congress.gov data pipeline for the {congress_number}th Congress, session {session}")
    
    # Ensure data directories exist
    ensure_data_dirs()
    
    # Fetch list of Congress members
    members = fetch_congressman_list(congress_number)
    
    # Save members to database (if not already there)
    with SessionLocal() as db:
        members_synced = 0
        
        for member in members:
            try:
                # Split name into parts
                name_parts = member['name'].split()
                
                if len(name_parts) > 1:
                    first_name = name_parts[0]
                    last_name = name_parts[-1]
                    
                    # Check if politician already exists
                    existing_politician = db.execute(
                        select(politicians).where(
                            politicians.c.firstName == first_name,
                            politicians.c.lastName == last_name
                        )
                    ).fetchone()
                    
                    if existing_politician:
                        politician_id = existing_politician.id
                    else:
                        # Extract bioguide ID from URL if available
                        bioguide_id = None
                        if 'url' in member and '/member/' in member['url']:
                            url_parts = member['url'].split('/')
                            for i, part in enumerate(url_parts):
                                if part == 'member' and i+1 < len(url_parts):
                                    bioguide_id = url_parts[i+1]
                                    break
                        
                        # Insert into database
                        result = db.execute(
                            insert(politicians).values(
                                firstName=first_name,
                                lastName=last_name,
                                state=member['state'],
                                party=member['party'],
                                bioguideId=None,  # Will be set with the utility function
                                profileImage=None
                            )
                        )
                        politician_id = result.inserted_primary_key[0]
                        members_synced += 1
                    
                    # If bioguide ID is available, add alias and update photo URL
                    if bioguide_id:
                        # Store the bioguide ID as an alias
                        upsert_alias(db, politician_id, 'bioguide', bioguide_id)
                        
                        # Update the photo URL
                        update_photo_url(db, politician_id, bioguide_id)
            
            except Exception as e:
                logger.error(f"Error saving member {member['name']}: {e}")
                continue
        
        db.commit()
        logger.info(f"💾 Members synced: {members_synced}")
    
    # Download vote data for House and Senate
    house_downloaded = download_vote_data(congress_number, session, "house")
    senate_downloaded = download_vote_data(congress_number, session, "senate")
    
    # Process vote data (this is a simplified example)
    # In a real implementation, we would need to extract and parse the files from the ZIP
    # Here we're demonstrating the concept with a placeholder
    
    # Example bill status file (in practice, you would iterate through files in the ZIP)
    bill_file = os.path.join(CONGRESS_DATA_DIR, "example_bill.xml")
    
    # This would normally be created by extracting from the ZIP file
    # For this example, we're showing the processing logic
    
    # Process and save votes
    #votes_data = process_bill_status_file(bill_file)
    #save_votes_to_database(votes_data)
    
    logger.info("Congress.gov data pipeline completed")

if __name__ == "__main__":
    run_congress_pipeline()