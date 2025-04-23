"""
FastAPI backend for data pipelines
This is a simplified version that provides the necessary API endpoints
to work with the frontend
"""
import os
import sys
import uvicorn
from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, List, Optional
import random
import time
from datetime import datetime

# Set up logging to file
import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    filename='pipeline_api.log',
    filemode='a'
)

# Create FastAPI app
app = FastAPI(title="Data Pipeline API")

# In-memory storage for pipeline runs
pipeline_runs = {}

class PipelineRequest(BaseModel):
    """Request model for pipeline triggers"""
    congress_number: Optional[int] = 117
    session: Optional[int] = 1
    force_download: Optional[bool] = False
    skip_candidates: Optional[bool] = False
    skip_contributions: Optional[bool] = False

class PipelineResponse(BaseModel):
    """Response model for pipeline triggers"""
    pipelineId: str
    status: str
    message: str

class StatusResponse(BaseModel):
    """Response model for status endpoints"""
    status: str
    message: str
    pipeline: Optional[str] = None
    progress: Optional[float] = None
    startTime: Optional[str] = None
    completionTime: Optional[str] = None
    details: Optional[Dict] = None

# Background task to simulate pipeline processing
def run_pipeline_task(pipeline_id: str, pipeline_type: str):
    """Simulate running a pipeline in the background"""
    # Set initial status
    pipeline_runs[pipeline_id] = {
        "status": "running",
        "progress": 0.0,
        "start_time": datetime.now().isoformat(),
        "completion_time": None,
        "pipeline": pipeline_type,
        "details": {}
    }
    
    # Simulate processing time (5-10 seconds)
    total_time = random.uniform(5, 10)
    steps = 10
    for i in range(steps):
        # Update progress
        progress = (i + 1) / steps
        pipeline_runs[pipeline_id]["progress"] = progress
        
        # Simulate work
        time.sleep(total_time / steps)
    
    # Complete the task
    pipeline_runs[pipeline_id].update({
        "status": "completed",
        "progress": 1.0,
        "completion_time": datetime.now().isoformat(),
        "details": {
            "rows_processed": random.randint(100, 1000),
            "rows_inserted": random.randint(50, 500)
        }
    })

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "message": "Service is healthy"}

# FEC pipeline endpoint
@app.post("/api/pipelines/fec", response_model=PipelineResponse)
async def trigger_fec_pipeline(
    background_tasks: BackgroundTasks,
    request: Optional[PipelineRequest] = None
):
    """Trigger the FEC data pipeline"""
    # Generate a unique ID for this pipeline run
    pipeline_id = f"fec_{int(time.time())}_{random.randint(1000, 9999)}"
    
    # Start the pipeline in the background
    background_tasks.add_task(run_pipeline_task, pipeline_id, "fec")
    
    return {
        "pipelineId": pipeline_id,
        "status": "started",
        "message": "FEC data pipeline started successfully"
    }

# Congress pipeline endpoint
@app.post("/api/pipelines/congress", response_model=PipelineResponse)
async def trigger_congress_pipeline(
    background_tasks: BackgroundTasks,
    request: Optional[PipelineRequest] = None
):
    """Trigger the Congress data pipeline"""
    # Generate a unique ID for this pipeline run
    pipeline_id = f"congress_{int(time.time())}_{random.randint(1000, 9999)}"
    
    # Start the pipeline in the background
    background_tasks.add_task(run_pipeline_task, pipeline_id, "congress")
    
    return {
        "pipelineId": pipeline_id,
        "status": "started",
        "message": "Congress data pipeline started successfully"
    }

# Stock pipeline endpoint
@app.post("/api/pipelines/stock", response_model=PipelineResponse)
async def trigger_stock_pipeline(
    background_tasks: BackgroundTasks,
    request: Optional[PipelineRequest] = None
):
    """Trigger the Stock data pipeline"""
    # Generate a unique ID for this pipeline run
    pipeline_id = f"stock_{int(time.time())}_{random.randint(1000, 9999)}"
    
    # Start the pipeline in the background
    background_tasks.add_task(run_pipeline_task, pipeline_id, "stock")
    
    return {
        "pipelineId": pipeline_id,
        "status": "started",
        "message": "Stock data pipeline started successfully"
    }

# Pipeline status endpoint
@app.get("/api/pipelines/{pipeline_id}/status", response_model=StatusResponse)
async def get_pipeline_status(pipeline_id: str):
    """Get the status of a specific pipeline run"""
    if pipeline_id not in pipeline_runs:
        return {
            "status": "error",
            "message": f"Pipeline run with ID {pipeline_id} not found"
        }
    
    run = pipeline_runs[pipeline_id]
    return {
        "status": run["status"],
        "message": f"Pipeline {run['pipeline']} is {run['status']}",
        "pipeline": run["pipeline"],
        "progress": run["progress"],
        "startTime": run["start_time"],
        "completionTime": run["completion_time"],
        "details": run["details"]
    }

if __name__ == "__main__":
    # Get port from environment or use default
    port = int(os.environ.get("PORT", "8000"))
    
    print(f"Starting FastAPI data pipeline server on port {port}")
    # Use host 0.0.0.0 to make it accessible from outside
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")