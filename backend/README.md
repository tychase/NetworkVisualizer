# Political Data Pipelines

This directory contains automated data pipelines that collect and process data from official U.S. government sources for the political transparency web application.

## Overview

These pipelines fetch data directly from official government sources, eliminating the need for third-party APIs that may have usage restrictions. The data is processed and stored in a PostgreSQL database, which is then accessible through FastAPI endpoints.

## Data Sources

1. **FEC Campaign Finance Data**
   - Source: https://www.fec.gov/data/browse-data/?tab=bulk-data
   - Data Format: Bulk CSV files
   - Pipeline: `backend/pipelines/fec_pipeline.py`

2. **Congressional Votes and Bill Data**
   - Source: https://www.congress.gov/developers & https://www.govinfo.gov/bulkdata
   - Data Format: XML/JSON
   - Pipeline: `backend/pipelines/congress_pipeline.py`

3. **Congressional STOCK Act Disclosures**
   - Source: 
     - House: https://disclosures-clerk.house.gov/PublicDisclosure/FinancialDisclosure
     - Senate: https://efdsearch.senate.gov
   - Data Format: PDF files requiring extraction
   - Pipeline: `backend/pipelines/stock_pipeline.py`

## Setup

### Prerequisites

- Python 3.11+
- PostgreSQL database
- Required Python packages (install with `pip install -r requirements.txt`):
  - pandas
  - requests
  - beautifulsoup4
  - lxml
  - pymupdf
  - pdfplumber
  - sqlalchemy
  - psycopg2-binary
  - fastapi
  - uvicorn

### Environment Variables

Set the following environment variable:

```
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
```

## Running the Pipelines

### Start the API Server

```bash
python -m backend.main
```

This starts the FastAPI server on port 8000 (or the port specified in the PORT environment variable).

### Trigger Pipelines via API

The pipelines can be triggered via API endpoints:

- **FEC Pipeline**: `POST /pipelines/fec`
- **Congress Pipeline**: `POST /pipelines/congress?congress_number=117&session=1`
- **Stock Pipeline**: `POST /pipelines/stock`

Example with curl:

```bash
# Trigger FEC pipeline
curl -X POST http://localhost:8000/pipelines/fec

# Trigger Congress pipeline for the 117th Congress, session 1
curl -X POST "http://localhost:8000/pipelines/congress?congress_number=117&session=1"

# Trigger Stock pipeline
curl -X POST http://localhost:8000/pipelines/stock
```

### Running Pipelines Directly

You can also run the pipelines directly from Python:

```bash
# Run FEC pipeline
python -c "from backend.pipelines.fec_pipeline import run_fec_pipeline; run_fec_pipeline()"

# Run Congress pipeline
python -c "from backend.pipelines.congress_pipeline import run_congress_pipeline; run_congress_pipeline()"

# Run Stock pipeline
python -c "from backend.pipelines.stock_pipeline import run_stock_pipeline; run_stock_pipeline()"
```

## Automation & Scheduling

### Replit Scheduler

These pipelines can be scheduled to run daily using Replit's cron jobs. Create a `.replit` file with:

```
[nix]
channel = "stable-23_05"

[crons]
# Run FEC pipeline at midnight UTC
fec_pipeline = "0 0 * * * python -c \"from backend.pipelines.fec_pipeline import run_fec_pipeline; run_fec_pipeline()\""

# Run Congress pipeline at 1 AM UTC
congress_pipeline = "0 1 * * * python -c \"from backend.pipelines.congress_pipeline import run_congress_pipeline; run_congress_pipeline()\""

# Run Stock pipeline at 2 AM UTC
stock_pipeline = "0 2 * * * python -c \"from backend.pipelines.stock_pipeline import run_stock_pipeline; run_stock_pipeline()\""
```

## API Endpoints

The following endpoints are available for accessing the data:

- `GET /politicians` - Get all politicians
- `GET /politicians/{politician_id}` - Get a politician by ID
- `GET /politicians/{politician_id}/votes` - Get all votes for a politician
- `GET /politicians/{politician_id}/contributions` - Get all contributions for a politician
- `GET /politicians/{politician_id}/stock-transactions` - Get all stock transactions for a politician
- `GET /stock-transactions` - Get all stock transactions with filtering options

## Database Schema

The data is stored in the following tables:

- `politicians` - Information about politicians
- `votes` - Voting records for politicians
- `contributions` - Campaign finance contributions to politicians
- `stock_transactions` - Stock transactions reported by politicians

See `shared/schema.ts` for the complete schema definition.

## Error Handling

All pipelines include comprehensive error handling and logging. Check the logs for detailed information about any issues encountered during data processing.

## Data Integrity

These pipelines fetch data directly from official government sources, ensuring data integrity and accuracy. No third-party APIs or data sources are used.