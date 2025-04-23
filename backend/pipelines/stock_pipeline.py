"""
Congressional STOCK Act disclosure pipeline

This module downloads, processes, and stores stock transaction data
from Congressional STOCK Act disclosures
"""
import os
import re
import logging
import requests
import tempfile
from datetime import datetime
from bs4 import BeautifulSoup
import pandas as pd
import pdfplumber
from sqlalchemy import select, insert

from backend.database import engine, SessionLocal, Base
from shared.schema import politicians, stockTransactions

# Configure logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# URLs for Congressional Stock Disclosures
HOUSE_DISCLOSURE_URL = "https://disclosures-clerk.house.gov/PublicDisclosure/FinancialDisclosure"
SENATE_DISCLOSURE_URL = "https://efdsearch.senate.gov/search/"

# Data directories
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
STOCK_DATA_DIR = os.path.join(DATA_DIR, "stock")
PDF_DIR = os.path.join(STOCK_DATA_DIR, "pdfs")

def ensure_data_dirs():
    """Ensure data directories exist"""
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(STOCK_DATA_DIR, exist_ok=True)
    os.makedirs(PDF_DIR, exist_ok=True)

def scrape_house_disclosures(year=None):
    """
    Scrape House financial disclosures
    
    Returns a list of URLs to PDF files
    """
    logger.info(f"Scraping House financial disclosures for year: {year or 'current'}")
    
    # If no year specified, use current year
    if year is None:
        year = datetime.now().year
    
    # URL for periodic transaction reports (PTRs)
    ptr_url = f"{HOUSE_DISCLOSURE_URL}/PTR.aspx"
    
    try:
        # Send request to disclosure page
        response = requests.get(ptr_url)
        response.raise_for_status()
        
        # Parse HTML
        soup = BeautifulSoup(response.text, 'lxml')
        
        # Find the form for searching
        search_form = soup.find('form', id='aspnetForm')
        
        # In practice, this would require more complex form submission
        # Here we're showing a simplified version of what would be done
        
        # Extract PDF links from the response
        pdf_links = []
        for link in soup.find_all('a', href=True):
            href = link['href']
            if href.endswith('.pdf') and 'ptr' in href.lower():
                # Full URL
                full_url = f"{HOUSE_DISCLOSURE_URL}/{href}" if not href.startswith('http') else href
                pdf_links.append(full_url)
        
        logger.info(f"Found {len(pdf_links)} PDF disclosure links")
        return pdf_links
    
    except Exception as e:
        logger.error(f"Error scraping House disclosures: {e}")
        return []

def download_disclosure_pdf(url, local_path):
    """
    Download a disclosure PDF file
    """
    logger.info(f"Downloading disclosure PDF: {url}")
    
    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()
        
        with open(local_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
        
        logger.info(f"Downloaded PDF to {local_path}")
        return True
    
    except Exception as e:
        logger.error(f"Error downloading PDF: {e}")
        return False

def extract_stock_transactions_from_pdf(pdf_path):
    """
    Extract stock transactions from a disclosure PDF
    
    Returns a list of transaction dictionaries
    """
    logger.info(f"Extracting stock transactions from PDF: {pdf_path}")
    
    try:
        transactions = []
        politician_name = None
        filing_date = None
        
        with pdfplumber.open(pdf_path) as pdf:
            # Extract text from each page
            for i, page in enumerate(pdf.pages):
                text = page.extract_text()
                
                # Extract politician name (usually on first page)
                if i == 0 and not politician_name:
                    name_match = re.search(r'Name:\s*(.*?)\s*\n', text)
                    if name_match:
                        politician_name = name_match.group(1).strip()
                
                # Extract filing date (usually on first page)
                if i == 0 and not filing_date:
                    date_match = re.search(r'Filing Date:\s*(\d{1,2}/\d{1,2}/\d{4})', text)
                    if date_match:
                        try:
                            filing_date = datetime.strptime(date_match.group(1), '%m/%d/%Y').date()
                        except:
                            filing_date = datetime.now().date()
                
                # Look for transaction tables
                # This requires pattern matching based on the specific PDF format
                # Simplified example - would need adjustment for actual PDFs
                
                # Look for asset name, transaction type (purchase/sale), amount
                transaction_patterns = [
                    r'(?P<asset>.*?)\s+(?P<type>Purchase|Sale)\s+\$(?P<amount>[\d,]+) - \$[\d,]+',
                    r'(?P<asset>.*?)\s+(?P<date>\d{1,2}/\d{1,2}/\d{4})\s+(?P<type>P|S)\s+\$(?P<amount>[\d,]+)'
                ]
                
                for pattern in transaction_patterns:
                    for match in re.finditer(pattern, text, re.IGNORECASE):
                        try:
                            asset = match.group('asset').strip()
                            
                            # Handle transaction type
                            if 'type' in match.groupdict():
                                type_text = match.group('type').strip().upper()
                                if type_text in ['P', 'PURCHASE']:
                                    trade_type = 'BUY'
                                elif type_text in ['S', 'SALE']:
                                    trade_type = 'SELL'
                                else:
                                    trade_type = 'UNKNOWN'
                            else:
                                trade_type = 'UNKNOWN'
                            
                            # Handle amount
                            if 'amount' in match.groupdict():
                                amount_text = match.group('amount').replace(',', '')
                                try:
                                    amount = float(amount_text)
                                except:
                                    amount = 0.0
                            else:
                                amount = 0.0
                            
                            # Handle date
                            trade_date = filing_date  # Default to filing date
                            if 'date' in match.groupdict():
                                date_text = match.group('date')
                                try:
                                    trade_date = datetime.strptime(date_text, '%m/%d/%Y').date()
                                except:
                                    pass  # Stick with default date
                            
                            transactions.append({
                                'politician_name': politician_name,
                                'stock_name': asset,
                                'trade_date': trade_date,
                                'trade_type': trade_type,
                                'amount': amount,
                                'related_bill': None,  # Would need additional logic to determine related bills
                                'potential_conflict': False  # Would need additional logic to determine conflicts
                            })
                        
                        except Exception as e:
                            logger.error(f"Error parsing transaction match: {e}")
                            continue
        
        logger.info(f"Extracted {len(transactions)} transactions from PDF")
        return transactions
    
    except Exception as e:
        logger.error(f"Error extracting transactions from PDF: {e}")
        return []

def save_transactions_to_database(transactions):
    """
    Save extracted stock transactions to database
    """
    logger.info(f"Saving {len(transactions)} transactions to database")
    
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
        
        transactions_inserted = 0
        
        for transaction in transactions:
            try:
                politician_name = transaction['politician_name']
                politician_id = None
                
                # Skip if no politician name
                if not politician_name:
                    continue
                
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
                                state="Unknown",  # We don't have this info from PDFs
                                party="Unknown",  # We don't have this info from PDFs
                                profileImage=None
                            )
                        )
                        
                        # Get the new ID
                        politician_id = result.inserted_primary_key[0]
                        
                        # Add to mapping
                        politician_mapping[politician_name.lower()] = politician_id
                        politician_mapping[last_name.lower()] = politician_id
                
                # Insert transaction data if we have a politician ID
                if politician_id:
                    db.execute(
                        insert(stockTransactions).values(
                            politicianId=politician_id,
                            stockName=transaction['stock_name'],
                            tradeDate=transaction['trade_date'],
                            tradeType=transaction['trade_type'],
                            amount=transaction['amount'],
                            relatedBill=transaction['related_bill'],
                            potentialConflict=transaction['potential_conflict']
                        )
                    )
                    
                    transactions_inserted += 1
            
            except Exception as e:
                logger.error(f"Error saving transaction: {e}")
                continue
        
        db.commit()
        logger.info(f"Saved {transactions_inserted} transactions to database")
        return transactions_inserted

def run_stock_pipeline():
    """
    Main function to run the stock disclosure pipeline
    """
    logger.info("Starting Congressional stock disclosure pipeline")
    
    # Ensure data directories exist
    ensure_data_dirs()
    
    # Scrape House disclosures
    pdf_links = scrape_house_disclosures()
    
    # Process each PDF
    all_transactions = []
    
    for i, pdf_url in enumerate(pdf_links):
        # Limit number of PDFs processed for testing
        if i > 10:
            break
            
        # Generate local filename
        filename = os.path.basename(pdf_url)
        local_path = os.path.join(PDF_DIR, filename)
        
        # Download PDF
        if download_disclosure_pdf(pdf_url, local_path):
            # Extract transactions
            transactions = extract_stock_transactions_from_pdf(local_path)
            all_transactions.extend(transactions)
    
    # Save transactions to database
    save_transactions_to_database(all_transactions)
    
    logger.info("Stock disclosure pipeline completed")

if __name__ == "__main__":
    run_stock_pipeline()