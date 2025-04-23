"""
Celery tasks for PDF OCR processing
"""
import os
import logging
import pdfplumber
import re
from datetime import datetime
from sqlalchemy import select, insert
from typing import Dict, Optional, List, Tuple

from backend.celery_app import app
from backend.database import SessionLocal
from shared.schema import politicians, stockTransactions, pipelineRuns

# Configure logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.task(bind=True, max_retries=3, default_retry_delay=60)
def process_pdf_file(self, pdf_path: str, run_id: Optional[int] = None) -> Dict:
    """
    Process a single PDF file for stock transactions
    """
    logger.info(f"Processing PDF: {pdf_path}")
    
    result = {
        "success": False,
        "pdf_path": pdf_path,
        "transactions_found": 0,
        "transactions_inserted": 0,
        "errors": []
    }
    
    try:
        # Extract transactions from PDF
        transactions = extract_stock_transactions_from_pdf(pdf_path)
        result["transactions_found"] = len(transactions)
        
        if transactions:
            # Save transactions to database
            inserted = save_transactions_to_database(transactions)
            result["transactions_inserted"] = inserted
            result["success"] = True
        
        # Update pipeline run
        if run_id:
            update_pipeline_run(
                run_id, 
                "processing", 
                result["transactions_found"], 
                result["transactions_inserted"],
                f"Processed PDF: {os.path.basename(pdf_path)}"
            )
        
        return result
    
    except Exception as e:
        error_message = str(e)
        result["errors"].append(error_message)
        logger.error(f"Error processing PDF {pdf_path}: {error_message}")
        
        # Update pipeline run with error
        if run_id:
            update_pipeline_run(
                run_id, 
                "error", 
                0, 
                0,
                f"Error processing PDF {os.path.basename(pdf_path)}: {error_message}"
            )
        
        # Retry task
        raise self.retry(exc=e, countdown=60)

def extract_stock_transactions_from_pdf(pdf_path: str) -> List[Dict]:
    """
    Extract stock transactions from a disclosure PDF
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

def save_transactions_to_database(transactions: List[Dict]) -> int:
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
            endedAt=datetime.now() if status != "processing" else None,
            status=status,
            rowsProcessed=rows_processed,
            rowsInserted=rows_inserted,
            notes=notes
        )
        
        db.execute(query)
        db.commit()

@app.task
def process_pdf_directory(directory_path: str) -> Dict:
    """
    Process all PDFs in a directory
    """
    logger.info(f"Processing PDF directory: {directory_path}")
    
    result = {
        "success": True,
        "directory": directory_path,
        "files_processed": 0,
        "transactions_found": 0,
        "transactions_inserted": 0,
        "failed_files": [],
        "errors": []
    }
    
    # Record pipeline run
    run_id = record_pipeline_run("stock_pdf_ocr", "running")
    
    try:
        # Check if directory exists
        if not os.path.exists(directory_path) or not os.path.isdir(directory_path):
            error_message = f"Directory not found: {directory_path}"
            result["errors"].append(error_message)
            result["success"] = False
            
            # Update pipeline run
            update_pipeline_run(run_id, "error", 0, 0, error_message)
            
            return result
        
        # Get all PDF files in directory
        pdf_files = [os.path.join(directory_path, f) for f in os.listdir(directory_path) 
                     if f.lower().endswith('.pdf') and os.path.isfile(os.path.join(directory_path, f))]
        
        if not pdf_files:
            logger.info(f"No PDF files found in {directory_path}")
            
            # Update pipeline run
            update_pipeline_run(run_id, "completed", 0, 0, f"No PDF files found in {directory_path}")
            
            return result
        
        # Process each PDF file
        for pdf_file in pdf_files:
            try:
                # Process PDF file
                pdf_result = process_pdf_file.delay(pdf_file, run_id)
                
                # Note: For async processing, we would need to collect results separately
                # Here we're just initiating the tasks
                
                result["files_processed"] += 1
            
            except Exception as e:
                error_message = str(e)
                result["failed_files"].append(pdf_file)
                result["errors"].append(f"Error processing {pdf_file}: {error_message}")
                logger.error(f"Error processing {pdf_file}: {error_message}")
        
        # Update pipeline run
        update_pipeline_run(
            run_id, 
            "initiated", 
            result["files_processed"], 
            0,
            f"Processing {result['files_processed']} PDF files in background"
        )
        
        return result
    
    except Exception as e:
        error_message = str(e)
        result["errors"].append(error_message)
        result["success"] = False
        logger.error(f"Error processing PDF directory: {error_message}")
        
        # Update pipeline run
        update_pipeline_run(run_id, "error", 0, 0, error_message)
        
        return result

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