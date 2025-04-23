import { Request, Response, Router } from 'express';
import { z } from 'zod';
import axios from 'axios';

const router = Router();

// Constants
const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:8000';

// Validation schemas
const triggerCongressPipelineSchema = z.object({
  congressNumber: z.number().optional().default(117),
  session: z.number().optional().default(1)
});

const importPoliticianDataSchema = z.object({
  memberId: z.string().min(1),
});

/**
 * @route POST /api/pipelines/fec
 * @desc Trigger the FEC data pipeline
 */
router.post('/fec', async (req: Request, res: Response) => {
  try {
    console.log('Triggering FEC pipeline...');
    const response = await axios.post(`${BACKEND_API_URL}/pipelines/fec`);
    res.json(response.data);
  } catch (error) {
    console.error('Error triggering FEC pipeline:', error);
    res.status(500).json({ error: 'Failed to trigger FEC pipeline' });
  }
});

/**
 * @route POST /api/pipelines/congress
 * @desc Trigger the Congress.gov data pipeline
 */
router.post('/congress', async (req: Request, res: Response) => {
  try {
    const { congressNumber, session } = triggerCongressPipelineSchema.parse(req.body);
    console.log(`Triggering Congress pipeline for congress ${congressNumber}, session ${session}...`);
    
    const response = await axios.post(`${BACKEND_API_URL}/pipelines/congress`, {
      congress_number: congressNumber,
      session
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error triggering Congress pipeline:', error);
    res.status(500).json({ error: 'Failed to trigger Congress pipeline' });
  }
});

/**
 * @route POST /api/pipelines/stock
 * @desc Trigger the stock disclosure data pipeline
 */
router.post('/stock', async (req: Request, res: Response) => {
  try {
    console.log('Triggering Stock pipeline...');
    const response = await axios.post(`${BACKEND_API_URL}/pipelines/stock`);
    res.json(response.data);
  } catch (error) {
    console.error('Error triggering Stock pipeline:', error);
    res.status(500).json({ error: 'Failed to trigger Stock pipeline' });
  }
});

/**
 * @route POST /api/pipelines/politicians/:id/import
 * @desc Import data for a specific politician
 */
router.post('/politicians/:id/import', async (req: Request, res: Response) => {
  try {
    const politicianId = parseInt(req.params.id);
    const { memberId } = importPoliticianDataSchema.parse(req.body);
    
    console.log(`Importing data for politician ID ${politicianId} with member ID ${memberId}...`);
    
    // First, let's import their voting record
    const votesResponse = await axios.post(`${BACKEND_API_URL}/politicians/${politicianId}/votes/import`, {
      member_id: memberId
    });
    
    // Then import their stock transactions if available
    let stockResponse = null;
    try {
      stockResponse = await axios.post(`${BACKEND_API_URL}/politicians/${politicianId}/stocks/import`);
    } catch (stockError) {
      console.warn(`No stock data found for politician ${politicianId}`);
    }
    
    res.json({
      politicianId,
      votes: votesResponse.data,
      stocks: stockResponse ? stockResponse.data : { message: 'No stock data available' }
    });
  } catch (error) {
    console.error(`Error importing data for politician:`, error);
    res.status(500).json({ error: 'Failed to import politician data' });
  }
});

export default router;