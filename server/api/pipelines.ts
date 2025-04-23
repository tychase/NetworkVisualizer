import axios from 'axios';
import { Politician } from '@shared/schema';

const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:8000';

// Interface for pipeline response
interface PipelineResponse {
  pipeline: string;
  status: string;
  message: string;
}

/**
 * Trigger the FEC pipeline to import politician data
 */
export async function triggerFecPipeline(): Promise<PipelineResponse> {
  try {
    const response = await axios.post(`${BACKEND_API_URL}/pipelines/fec`);
    return response.data;
  } catch (error) {
    console.error('Error triggering FEC pipeline:', error);
    throw new Error('Failed to trigger FEC data pipeline');
  }
}

/**
 * Trigger the Congress pipeline to import voting data
 */
export async function triggerCongressPipeline(congressNumber: number = 117, session: number = 1): Promise<PipelineResponse> {
  try {
    const response = await axios.post(`${BACKEND_API_URL}/pipelines/congress`, {
      congress_number: congressNumber,
      session: session
    });
    return response.data;
  } catch (error) {
    console.error('Error triggering Congress pipeline:', error);
    throw new Error('Failed to trigger Congress data pipeline');
  }
}

/**
 * Trigger the Stock pipeline to import stock transactions
 */
export async function triggerStockPipeline(): Promise<PipelineResponse> {
  try {
    const response = await axios.post(`${BACKEND_API_URL}/pipelines/stock`);
    return response.data;
  } catch (error) {
    console.error('Error triggering Stock pipeline:', error);
    throw new Error('Failed to trigger Stock data pipeline');
  }
}

/**
 * Import all data for a specific politician
 */
export async function importPoliticianData(politicianId: number, memberId: string): Promise<any> {
  try {
    const response = await axios.post(`${BACKEND_API_URL}/politicians/${politicianId}/import`, {
      member_id: memberId
    });
    return response.data;
  } catch (error) {
    console.error(`Error importing data for politician ${politicianId}:`, error);
    throw new Error('Failed to import politician data');
  }
}