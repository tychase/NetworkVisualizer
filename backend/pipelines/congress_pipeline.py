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

def download_vote_data(congress_number, session, bill_types=None):
    """
    Download bill status data for a specific Congress, session, and bill types
    
    Args:
        congress_number: The Congress number (e.g., 118)
        session: The session number
        bill_types: List of bill types to download, defaults to ["hr", "s", "hjres", "sjres"]
        
    Returns:
        Dictionary of {bill_type: success} for each download
    """
    # Default bill types if none provided
    if bill_types is None:
        bill_types = ["hr", "s", "hjres", "sjres"]
    
    # Validate bill types
    valid_bill_types = ["hr", "s", "hjres", "sjres", "hconres", "sconres", "hres", "sres"]
    for bill_type in bill_types:
        if bill_type not in valid_bill_types:
            logger.warning(f"Invalid bill type: {bill_type}, skipping")
            bill_types.remove(bill_type)
    
    if not bill_types:
        logger.error("No valid bill types specified")
        return {}
    
    # Ensure data directories exist
    ensure_data_dirs()
    
    # Download each bill type
    results = {}
    for bill_type in bill_types:
        url = f"{CONGRESS_XML_BASE_URL}/{congress_number}/{bill_type}/BILLSTATUS-{congress_number}{bill_type}.zip"
        local_path = os.path.join(CONGRESS_DATA_DIR, f"BILLSTATUS-{congress_number}{bill_type}.zip")
        
        logger.info(f"Downloading {bill_type} bill status data for {congress_number}th Congress")
        
        # Use our utilities module for smart download
        try:
            from backend.pipelines.utils import smart_download
            success, hash_value = smart_download(url, local_path)
            results[bill_type] = success
            
            # Additional logging
            if success:
                logger.info(f"Successfully downloaded {bill_type} data for {congress_number}th Congress")
            else:
                logger.warning(f"Failed to download {bill_type} data for {congress_number}th Congress")
        except ImportError:
            # Fall back to original download method if utils module not available
            success = download_file(url, local_path)
            results[bill_type] = success
    
    return results

def process_bill_status_file(file_path):
    """
    Process bill status XML file and extract vote information and cosponsors
    
    This function extracts:
    1. Bill metadata (number, title, etc.)
    2. Cosponsors with bioguide IDs for politician mapping
    3. Votes from roll call votes (actions with roll attribute)
    """
    logger.info(f"Processing bill status file: {file_path}")
    
    try:
        # Parse XML
        tree = ET.parse(file_path)
        root = tree.getroot()
        
        # Extract bill information
        bill_number = root.find('.//billNumber')
        bill_title = root.find('.//title')
        bill_type = root.find('.//billType')
        bill_congress = root.find('.//congress')
        
        bill_name = f"{bill_type.text if bill_type is not None else ''}. {bill_number.text}" if bill_number is not None else "Unknown"
        bill_description = bill_title.text if bill_title is not None else "Unknown"
        congress_num = bill_congress.text if bill_congress is not None else "Unknown"
        
        # For tracking data
        votes_data = []
        cosponsor_data = []
        
        # Extract cosponsors (contains bioguide IDs) - important for politician mapping
        cosponsors = root.findall('.//cosponsor')
        for cosponsor in cosponsors:
            try:
                bioguide_id = cosponsor.get('bioguideId')
                name = cosponsor.text
                
                if name and bioguide_id:
                    # Extract additional info if available
                    state = cosponsor.get('state', 'Unknown')
                    party = cosponsor.get('party', 'Unknown')
                    sponsorship_date = cosponsor.get('sponsorshipDate')
                    
                    # Attempt to parse date
                    sponsor_date = None
                    if sponsorship_date:
                        try:
                            sponsor_date = datetime.strptime(sponsorship_date, "%Y-%m-%d").date()
                        except:
                            logger.warning(f"Could not parse sponsor date: {sponsorship_date}")
                    
                    # Store cosponsor data
                    cosponsor_data.append({
                        'politician_name': name,
                        'bioguide_id': bioguide_id,
                        'state': state,
                        'party': party,
                        'sponsorship_date': sponsor_date
                    })
                    
                    # Also treat cosponsoring as a "vote" for the bill
                    votes_data.append({
                        'politician_name': name,
                        'bioguide_id': bioguide_id,
                        'vote_result': 'Cosponsor',
                        'vote_date': sponsor_date or datetime.now().date(),
                        'bill_name': bill_name,
                        'bill_description': bill_description,
                        'party': party,
                        'state': state
                    })
            except Exception as e:
                logger.error(f"Error processing cosponsor: {e}")
                continue
        
        # Extract votes from actions with roll call votes
        actions = root.findall('.//actions/action')
        for action in actions:
            try:
                # Check for roll call vote attribute
                roll_elem = action.find('.//roll')
                if roll_elem is None:
                    continue
                
                # Get date of vote
                date_elem = action.find('./actionDate')
                vote_date = datetime.now().date()
                if date_elem is not None and date_elem.text:
                    try:
                        vote_date = datetime.strptime(date_elem.text, "%Y-%m-%d").date()
                    except:
                        logger.warning(f"Could not parse vote date: {date_elem.text}")
                
                # Get roll call vote number
                roll_call = roll_elem.text
                
                # Get vote description
                vote_description = "Vote"
                text_elem = action.find('./text')
                if text_elem is not None and text_elem.text:
                    vote_description = text_elem.text
                
                # Use Legislator Vote API to get actual votes
                # This would require additional API calls to get the vote details
                # For simplicity, we're just recording that a vote happened
                
                logger.info(f"Found roll call vote {roll_call} on {vote_date} for bill {bill_name}")
                
                # In a real implementation, we would use an API call to get the vote details
                # For illustration, we'll check if there's recorded vote data in the XML
                recorded_votes = action.findall('.//recordedVote')
                
                for vote_elem in recorded_votes:
                    try:
                        # Get legislator info
                        legislator = vote_elem.find('.//legislator')
                        if legislator is None:
                            continue
                            
                        name_elem = legislator.find('./fullName')
                        vote_cast_elem = legislator.find('./vote')
                        party_elem = legislator.find('./party')
                        state_elem = legislator.find('./state')
                        bioguide_id_elem = legislator.find('./bioguideId')
                        
                        if name_elem is not None and vote_cast_elem is not None:
                            votes_data.append({
                                'politician_name': name_elem.text,
                                'bioguide_id': bioguide_id_elem.text if bioguide_id_elem is not None else None,
                                'vote_result': vote_cast_elem.text,
                                'vote_date': vote_date,
                                'bill_name': bill_name,
                                'bill_description': vote_description,
                                'roll_call': roll_call,
                                'party': party_elem.text if party_elem is not None else "Unknown",
                                'state': state_elem.text if state_elem is not None else "Unknown"
                            })
                    except Exception as e:
                        logger.error(f"Error processing individual vote: {e}")
                        continue
            except Exception as e:
                logger.error(f"Error processing action with roll call: {e}")
                continue
                
        # Extract direct recorded votes (if any)
        direct_vote_elements = root.findall('.//recordedVote')
        for vote_elem in direct_vote_elements:
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
                    bioguide_id_elem = legislator.find('./bioguideId')
                    
                    if name_elem is not None and vote_cast_elem is not None:
                        votes_data.append({
                            'politician_name': name_elem.text,
                            'bioguide_id': bioguide_id_elem.text if bioguide_id_elem is not None else None,
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
        
        logger.info(f"Extracted {len(votes_data)} votes and {len(cosponsor_data)} cosponsors for bill {bill_name}")
        return {
            'votes': votes_data,
            'cosponsors': cosponsor_data,
            'bill_info': {
                'name': bill_name,
                'description': bill_description,
                'congress': congress_num
            }
        }
    
    except Exception as e:
        logger.error(f"Error processing bill status file: {e}")
        return {'votes': [], 'cosponsors': [], 'bill_info': {}}

def save_votes_to_database(processed_data):
    """
    Save votes to the database
    
    Args:
        processed_data: Dictionary containing votes, cosponsors, and bill info
    
    Returns:
        Number of votes inserted
    """
    votes_data = processed_data.get('votes', [])
    cosponsor_data = processed_data.get('cosponsors', [])
    bill_info = processed_data.get('bill_info', {})
    
    logger.info(f"Saving {len(votes_data)} votes and {len(cosponsor_data)} cosponsors to database")
    
    with SessionLocal() as db:
        # Get all politicians from the database
        politicians_data = db.execute(select(politicians)).fetchall()
        
        # Create mapping of names to IDs
        politician_mapping = {}
        bioguide_mapping = {}
        
        for p in politicians_data:
            full_name = f"{p.firstName} {p.lastName}".lower()
            politician_mapping[full_name] = p.id
            # Also add just the last name for fuzzy matching
            politician_mapping[p.lastName.lower()] = p.id
            
            # Check for bioguide IDs
            try:
                # If we have a dedicated bioguideId field
                if hasattr(p, 'bioguideId') and p.bioguideId:
                    bioguide_mapping[p.bioguideId] = p.id
                
                # Try to get aliases from the database
                aliases = db.execute(text("""
                    SELECT source_id 
                    FROM politician_aliases 
                    WHERE politician_id = :pid AND source = 'bioguide'
                """), {"pid": p.id}).fetchall()
                
                for alias in aliases:
                    if alias.source_id:
                        bioguide_mapping[alias.source_id] = p.id
            except Exception as e:
                logger.error(f"Error getting bioguide aliases: {e}")
        
        votes_inserted = 0
        politicians_created = 0
        
        # First process cosponsors to ensure we have all politicians
        for cosponsor in cosponsor_data:
            try:
                politician_id = None
                bioguide_id = cosponsor.get('bioguide_id')
                
                # First try to match by bioguide ID (most reliable)
                if bioguide_id and bioguide_id in bioguide_mapping:
                    politician_id = bioguide_mapping[bioguide_id]
                else:
                    # Fall back to name matching
                    politician_name = cosponsor['politician_name']
                    politician_name_lower = politician_name.lower()
                    
                    for name, pid in politician_mapping.items():
                        if name in politician_name_lower or politician_name_lower in name:
                            politician_id = pid
                            break
                
                # If politician not found, create them
                if not politician_id:
                    # Split name into parts
                    name_parts = cosponsor['politician_name'].split()
                    
                    if len(name_parts) > 1:
                        first_name = name_parts[0]
                        last_name = name_parts[-1]
                        
                        # Create new politician
                        result = db.execute(
                            insert(politicians).values(
                                firstName=first_name,
                                lastName=last_name,
                                state=cosponsor.get('state', 'Unknown'),
                                party=cosponsor.get('party', 'Unknown'),
                                profileImage=None
                            )
                        )
                        
                        # Get the new ID
                        politician_id = result.inserted_primary_key[0]
                        politicians_created += 1
                        
                        # Add to mappings
                        politician_mapping[cosponsor['politician_name'].lower()] = politician_id
                        politician_mapping[last_name.lower()] = politician_id
                        
                        # If we have a bioguide ID, store it as an alias
                        if bioguide_id:
                            bioguide_mapping[bioguide_id] = politician_id
                            upsert_alias(db, politician_id, 'bioguide', bioguide_id)
                            
                            # Update photo URL
                            update_photo_url(db, politician_id, bioguide_id)
            
            except Exception as e:
                logger.error(f"Error processing cosponsor: {e}")
                continue
        
        # Now process votes
        for vote_data in votes_data:
            try:
                politician_id = None
                bioguide_id = vote_data.get('bioguide_id')
                
                # First try to match by bioguide ID (most reliable)
                if bioguide_id and bioguide_id in bioguide_mapping:
                    politician_id = bioguide_mapping[bioguide_id]
                else:
                    # Fall back to name matching
                    politician_name = vote_data['politician_name']
                    politician_name_lower = politician_name.lower()
                    
                    for name, pid in politician_mapping.items():
                        if name in politician_name_lower or politician_name_lower in name:
                            politician_id = pid
                            break
                
                # If politician not found, create them
                if not politician_id:
                    # Split name into parts
                    name_parts = vote_data['politician_name'].split()
                    
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
                        politicians_created += 1
                        
                        # Add to mappings
                        politician_mapping[vote_data['politician_name'].lower()] = politician_id
                        politician_mapping[last_name.lower()] = politician_id
                        
                        # If we have a bioguide ID, store it as an alias
                        if bioguide_id:
                            bioguide_mapping[bioguide_id] = politician_id
                            upsert_alias(db, politician_id, 'bioguide', bioguide_id)
                            
                            # Update photo URL
                            update_photo_url(db, politician_id, bioguide_id)
                
                # Insert vote data if we have a politician ID
                if politician_id:
                    # Check if the vote already exists
                    existing_vote = db.execute(text("""
                        SELECT id FROM votes 
                        WHERE politician_id = :pid AND bill_name = :bill AND vote_date = :date
                    """), {
                        "pid": politician_id,
                        "bill": vote_data['bill_name'],
                        "date": vote_data['vote_date']
                    }).fetchone()
                    
                    if not existing_vote:
                        # Insert new vote
                        db.execute(
                            text("""
                                INSERT INTO votes 
                                (politician_id, bill_name, bill_description, vote_date, vote_result)
                                VALUES 
                                (:pid, :bill_name, :bill_desc, :vote_date, :vote_result)
                            """),
                            {
                                "pid": politician_id,
                                "bill_name": vote_data['bill_name'],
                                "bill_desc": vote_data['bill_description'],
                                "vote_date": vote_data['vote_date'],
                                "vote_result": vote_data['vote_result']
                            }
                        )
                        
                        votes_inserted += 1
            
            except Exception as e:
                logger.error(f"Error saving vote: {e}")
                continue
        
        db.commit()
        logger.info(f"Saved {votes_inserted} votes and created {politicians_created} new politicians")
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