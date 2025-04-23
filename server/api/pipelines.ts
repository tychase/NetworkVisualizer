/**
 * API controller for data pipeline operations 
 * This module communicates with the Python FastAPI backend that runs the data pipelines
 */
import axios from 'axios';
import { Request, Response } from 'express';

// Get backend URL from environment variables
const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:8000';

// Check if the FastAPI backend is running
export async function checkBackendStatus() {
  try {
    const response = await axios.get(`${BACKEND_API_URL}/health`);
    return response.data.status === 'ok';
  } catch (error) {
    console.error('Error checking backend status:', error);
    return false;
  }
}

/**
 * Trigger the FEC data pipeline
 */
export async function triggerFecPipeline(req: Request, res: Response) {
  try {
    const backendIsUp = await checkBackendStatus();
    if (!backendIsUp) {
      return res.status(503).json({
        status: 'error',
        message: 'The data pipeline backend service is not available.'
      });
    }

    const response = await axios.post(`${BACKEND_API_URL}/api/pipelines/fec`);
    
    return res.status(200).json({
      status: 'success',
      message: 'FEC data pipeline triggered successfully',
      pipelineId: response.data.pipelineId
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
    if (!backendIsUp) {
      return res.status(503).json({
        status: 'error',
        message: 'The data pipeline backend service is not available.'
      });
    }

    const congressNumber = req.query.congressNumber || 117;
    const session = req.query.session || 1;
    
    const response = await axios.post(
      `${BACKEND_API_URL}/api/pipelines/congress`, 
      { congress_number: congressNumber, session }
    );
    
    return res.status(200).json({
      status: 'success',
      message: 'Congress data pipeline triggered successfully',
      pipelineId: response.data.pipelineId
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
    if (!backendIsUp) {
      return res.status(503).json({
        status: 'error',
        message: 'The data pipeline backend service is not available.'
      });
    }

    const response = await axios.post(`${BACKEND_API_URL}/api/pipelines/stock`);
    
    return res.status(200).json({
      status: 'success',
      message: 'Stock transaction data pipeline triggered successfully',
      pipelineId: response.data.pipelineId
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
    
    const response = await axios.get(`${BACKEND_API_URL}/api/pipelines/${pipelineId}/status`);
    
    return res.status(200).json(response.data);
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
    
    return res.status(200).json({
      status: backendIsUp ? 'ok' : 'error',
      message: backendIsUp ? 'Pipeline backend is running' : 'Pipeline backend is not available'
    });
  } catch (error) {
    console.error('Error checking pipeline backend status:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to check pipeline backend status'
    });
  }
}