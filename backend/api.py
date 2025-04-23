"""
FastAPI endpoints for the data pipelines

This module provides REST API endpoints to access the data and trigger pipeline runs
"""
import os
import logging
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.database import get_db, test_connection
from backend.pipelines.fec_pipeline import run_fec_pipeline
from backend.pipelines.congress_pipeline import run_congress_pipeline
from backend.pipelines.stock_pipeline import run_stock_pipeline

# Configure logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(title="Political Data API", 
              description="API for political finance and voting data")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for API requests/responses
class StatusResponse(BaseModel):
    status: str
    message: str

class PipelineResponse(BaseModel):
    pipeline: str
    status: str
    message: str

class PoliticianResponse(BaseModel):
    id: int
    firstName: str
    lastName: str
    state: str
    party: str
    profileImage: Optional[str] = None

class VoteResponse(BaseModel):
    id: int
    politicianId: int
    billName: str
    billDescription: Optional[str] = None
    voteDate: str
    voteResult: str

class ContributionResponse(BaseModel):
    id: int
    politicianId: int
    organization: str
    amount: float
    contributionDate: str
    industry: Optional[str] = None

class StockTransactionResponse(BaseModel):
    id: int
    politicianId: int
    stockName: str
    tradeDate: str
    tradeType: str
    amount: float
    relatedBill: Optional[str] = None
    potentialConflict: bool = False

# Root endpoint
@app.get("/", response_model=StatusResponse)
def read_root():
    return {"status": "active", "message": "Political Data API is running"}

# Health check endpoint
@app.get("/health", response_model=StatusResponse)
def health_check():
    db_ok = test_connection()
    if db_ok:
        return {"status": "ok", "message": "API and database connection healthy"}
    else:
        raise HTTPException(status_code=500, detail="Database connection failed")

# Trigger FEC pipeline
@app.post("/pipelines/fec", response_model=PipelineResponse)
def trigger_fec_pipeline(background_tasks: BackgroundTasks):
    """
    Trigger the FEC data pipeline to run in the background
    """
    logger.info("Triggering FEC pipeline")
    background_tasks.add_task(run_fec_pipeline)
    return {"pipeline": "fec", "status": "started", "message": "FEC pipeline started in background"}

# Trigger Congress pipeline
@app.post("/pipelines/congress", response_model=PipelineResponse)
def trigger_congress_pipeline(background_tasks: BackgroundTasks, congress_number: int = 117, session: int = 1):
    """
    Trigger the Congress.gov data pipeline to run in the background
    """
    logger.info(f"Triggering Congress pipeline for {congress_number}th Congress, session {session}")
    background_tasks.add_task(run_congress_pipeline, congress_number, session)
    return {"pipeline": "congress", "status": "started", "message": f"Congress pipeline started in background for {congress_number}th Congress, session {session}"}

# Trigger Stock pipeline
@app.post("/pipelines/stock", response_model=PipelineResponse)
def trigger_stock_pipeline(background_tasks: BackgroundTasks):
    """
    Trigger the stock disclosure pipeline to run in the background
    """
    logger.info("Triggering stock disclosure pipeline")
    background_tasks.add_task(run_stock_pipeline)
    return {"pipeline": "stock", "status": "started", "message": "Stock disclosure pipeline started in background"}

# Get politicians
@app.get("/politicians", response_model=List[PoliticianResponse])
def get_politicians(db: Session = Depends(get_db)):
    """
    Get all politicians
    """
    # This would be replaced with an actual database query
    # using SQLAlchemy models
    # For reference only, not complete implementation
    try:
        from sqlalchemy import select
        from shared.schema import politicians
        
        query = select(politicians)
        result = db.execute(query).fetchall()
        
        return [
            {
                "id": row.id,
                "firstName": row.firstName,
                "lastName": row.lastName,
                "state": row.state,
                "party": row.party,
                "profileImage": row.profileImage
            } 
            for row in result
        ]
    except Exception as e:
        logger.error(f"Error fetching politicians: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Get politician by ID
@app.get("/politicians/{politician_id}", response_model=PoliticianResponse)
def get_politician(politician_id: int, db: Session = Depends(get_db)):
    """
    Get a politician by ID
    """
    try:
        from sqlalchemy import select
        from shared.schema import politicians
        
        query = select(politicians).where(politicians.c.id == politician_id)
        result = db.execute(query).first()
        
        if not result:
            raise HTTPException(status_code=404, detail=f"Politician with ID {politician_id} not found")
        
        return {
            "id": result.id,
            "firstName": result.firstName,
            "lastName": result.lastName,
            "state": result.state,
            "party": result.party,
            "profileImage": result.profileImage
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching politician {politician_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Get votes for a politician
@app.get("/politicians/{politician_id}/votes", response_model=List[VoteResponse])
def get_politician_votes(politician_id: int, db: Session = Depends(get_db)):
    """
    Get all votes for a politician
    """
    try:
        from sqlalchemy import select
        from shared.schema import votes
        
        query = select(votes).where(votes.c.politicianId == politician_id)
        result = db.execute(query).fetchall()
        
        return [
            {
                "id": row.id,
                "politicianId": row.politicianId,
                "billName": row.billName,
                "billDescription": row.billDescription,
                "voteDate": str(row.voteDate),
                "voteResult": row.voteResult
            } 
            for row in result
        ]
    except Exception as e:
        logger.error(f"Error fetching votes for politician {politician_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Get contributions for a politician
@app.get("/politicians/{politician_id}/contributions", response_model=List[ContributionResponse])
def get_politician_contributions(politician_id: int, db: Session = Depends(get_db)):
    """
    Get all contributions for a politician
    """
    try:
        from sqlalchemy import select
        from shared.schema import contributions
        
        query = select(contributions).where(contributions.c.politicianId == politician_id)
        result = db.execute(query).fetchall()
        
        return [
            {
                "id": row.id,
                "politicianId": row.politicianId,
                "organization": row.organization,
                "amount": float(row.amount),
                "contributionDate": str(row.contributionDate),
                "industry": row.industry
            } 
            for row in result
        ]
    except Exception as e:
        logger.error(f"Error fetching contributions for politician {politician_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Get stock transactions for a politician
@app.get("/politicians/{politician_id}/stock-transactions", response_model=List[StockTransactionResponse])
def get_politician_stock_transactions(politician_id: int, db: Session = Depends(get_db)):
    """
    Get all stock transactions for a politician
    """
    try:
        from sqlalchemy import select
        from shared.schema import stockTransactions
        
        query = select(stockTransactions).where(stockTransactions.c.politicianId == politician_id)
        result = db.execute(query).fetchall()
        
        return [
            {
                "id": row.id,
                "politicianId": row.politicianId,
                "stockName": row.stockName,
                "tradeDate": str(row.tradeDate),
                "tradeType": row.tradeType,
                "amount": float(row.amount),
                "relatedBill": row.relatedBill,
                "potentialConflict": row.potentialConflict
            } 
            for row in result
        ]
    except Exception as e:
        logger.error(f"Error fetching stock transactions for politician {politician_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Get all stock transactions
@app.get("/stock-transactions", response_model=List[StockTransactionResponse])
def get_stock_transactions(
    limit: int = 100,
    offset: int = 0,
    politician_id: Optional[int] = None,
    stock_name: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get stock transactions with optional filtering
    """
    try:
        from sqlalchemy import select
        from shared.schema import stockTransactions
        
        query = select(stockTransactions)
        
        # Apply filters
        if politician_id:
            query = query.where(stockTransactions.c.politicianId == politician_id)
        
        if stock_name:
            query = query.where(stockTransactions.c.stockName.ilike(f"%{stock_name}%"))
        
        # Apply pagination
        query = query.limit(limit).offset(offset)
        
        result = db.execute(query).fetchall()
        
        return [
            {
                "id": row.id,
                "politicianId": row.politicianId,
                "stockName": row.stockName,
                "tradeDate": str(row.tradeDate),
                "tradeType": row.tradeType,
                "amount": float(row.amount),
                "relatedBill": row.relatedBill,
                "potentialConflict": row.potentialConflict
            } 
            for row in result
        ]
    except Exception as e:
        logger.error(f"Error fetching stock transactions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Run the FastAPI app
    uvicorn.run(app, host="0.0.0.0", port=8000)