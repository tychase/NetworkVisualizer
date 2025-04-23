/**
 * API controller for data pipeline operations 
 * This module communicates with the Python FastAPI backend that runs the data pipelines
 * If the backend is not available, it falls back to a simplified mock implementation
 */
import axios from 'axios';
import { Request, Response } from 'express';
import { 
  mockTriggerFecPipeline, 
  mockTriggerCongressPipeline,
  mockTriggerStockPipeline, 
  mockGetPipelineStatus 
} from './mock-pipeline.js';

// Get backend URL from environment variables
const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:8000';

// Cache the status to avoid repeated calls
let backendStatusCache = {
  isUp: false,
  lastChecked: 0,
  ttlMs: 5000 // Cache for 5 seconds
};

// Check if the FastAPI backend is running
export async function checkBackendStatus() {
  const now = Date.now();
  
  // Use cached value if it's not expired
  if (now - backendStatusCache.lastChecked < backendStatusCache.ttlMs) {
    return backendStatusCache.isUp;
  }
  
  try {
    const response = await axios.get(`${BACKEND_API_URL}/health`);
    backendStatusCache = {
      isUp: response.data.status === 'ok',
      lastChecked: now,
      ttlMs: 5000
    };
    return backendStatusCache.isUp;
  } catch (error) {
    console.error('Error checking backend status:', error);
    backendStatusCache = {
      isUp: false,
      lastChecked: now,
      ttlMs: 5000
    };
    return false;
  }
}

/**
 * Trigger the FEC data pipeline
 */
export async function triggerFecPipeline(req: Request, res: Response) {
  try {
    const backendIsUp = await checkBackendStatus();
    
    if (backendIsUp) {
      // If backend is available, use it
      try {
        const response = await axios.post(`${BACKEND_API_URL}/api/pipelines/fec`);
        
        return res.status(200).json({
          status: 'success',
          message: 'FEC data pipeline triggered successfully',
          pipelineId: response.data.pipelineId
        });
      } catch (apiError) {
        console.error('Error calling backend FEC pipeline API:', apiError);
        // Fall through to mock implementation
      }
    }
    
    // If backend is not available or API call failed, use mock implementation
    console.log('Using mock FEC pipeline implementation');
    const mockResult = mockTriggerFecPipeline();
    
    return res.status(200).json({
      status: 'success',
      message: 'FEC data pipeline triggered successfully (mock)',
      pipelineId: mockResult.pipelineId,
      mock: true
    });
  } catch (error) {
    console.error('Error triggering FEC pipeline:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to trigger FEC data pipeline'
    });
  }
}

/**
 * Trigger the Congress data pipeline
 */
export async function triggerCongressPipeline(req: Request, res: Response) {
  try {
    const backendIsUp = await checkBackendStatus();
    const congressNumber = Number(req.query.congressNumber) || 117;
    const session = Number(req.query.session) || 1;
    
    if (backendIsUp) {
      // If backend is available, use it
      try {
        const response = await axios.post(
          `${BACKEND_API_URL}/api/pipelines/congress`, 
          { congress_number: congressNumber, session }
        );
        
        return res.status(200).json({
          status: 'success',
          message: 'Congress data pipeline triggered successfully',
          pipelineId: response.data.pipelineId
        });
      } catch (apiError) {
        console.error('Error calling backend Congress pipeline API:', apiError);
        // Fall through to mock implementation
      }
    }
    
    // If backend is not available or API call failed, use mock implementation
    console.log('Using mock Congress pipeline implementation');
    const mockResult = mockTriggerCongressPipeline(congressNumber, session);
    
    return res.status(200).json({
      status: 'success',
      message: 'Congress data pipeline triggered successfully (mock)',
      pipelineId: mockResult.pipelineId,
      mock: true
    });
  } catch (error) {
    console.error('Error triggering Congress pipeline:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to trigger Congress data pipeline'
    });
  }
}

/**
 * Trigger the Stock transactions data pipeline
 */
export async function triggerStockPipeline(req: Request, res: Response) {
  try {
    const backendIsUp = await checkBackendStatus();
    
    if (backendIsUp) {
      // If backend is available, use it
      try {
        const response = await axios.post(`${BACKEND_API_URL}/api/pipelines/stock`);
        
        return res.status(200).json({
          status: 'success',
          message: 'Stock transaction data pipeline triggered successfully',
          pipelineId: response.data.pipelineId
        });
      } catch (apiError) {
        console.error('Error calling backend Stock pipeline API:', apiError);
        // Fall through to mock implementation
      }
    }
    
    // If backend is not available or API call failed, use mock implementation
    console.log('Using mock Stock pipeline implementation');
    const mockResult = mockTriggerStockPipeline();
    
    return res.status(200).json({
      status: 'success',
      message: 'Stock transaction data pipeline triggered successfully (mock)',
      pipelineId: mockResult.pipelineId,
      mock: true
    });
  } catch (error) {
    console.error('Error triggering Stock pipeline:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to trigger Stock transaction data pipeline'
    });
  }
}

/**
 * Get pipeline status for a specific pipeline run
 */
export async function getPipelineStatus(req: Request, res: Response) {
  try {
    const pipelineId = req.params.id;
    
    // Check if this is a mock pipeline ID (starts with fec_, congress_, or stock_)
    const isMockPipeline = /^(fec|congress|stock)_\d+_/.test(pipelineId);
    
    if (isMockPipeline) {
      // Use mock implementation for mock pipeline IDs
      const mockStatus = mockGetPipelineStatus(pipelineId);
      return res.status(200).json(mockStatus);
    }
    
    // Try to get status from backend
    try {
      const response = await axios.get(`${BACKEND_API_URL}/api/pipelines/${pipelineId}/status`);
      return res.status(200).json(response.data);
    } catch (apiError) {
      console.error(`Error getting pipeline status from backend for ${pipelineId}:`, apiError);
      
      // Check if this might be a mock pipeline that wasn't detected
      const mockStatus = mockGetPipelineStatus(pipelineId);
      if (mockStatus.status !== 'error') {
        return res.status(200).json({...mockStatus, mock: true});
      }
      
      throw apiError; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error(`Error getting pipeline status for ${req.params.id}:`, error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to get pipeline status'
    });
  }
}

/**
 * Check overall backend status
 */
export async function checkPipelineBackendStatus(req: Request, res: Response) {
  try {
    const backendIsUp = await checkBackendStatus();
    
    // Even if the backend is not available, we return a positive status
    // since we have the mock implementation as a fallback
    return res.status(200).json({
      status: 'ok',
      message: backendIsUp 
        ? 'Pipeline backend is running' 
        : 'Pipeline backend is available (mock mode)',
      mock: !backendIsUp
    });
  } catch (error) {
    console.error('Error checking pipeline backend status:', error);
    // Still return OK since we have mock implementation
    return res.status(200).json({
      status: 'ok',
      message: 'Pipeline backend is available (mock mode)',
      mock: true
    });
  }
}