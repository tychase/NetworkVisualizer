import { Request, Response } from 'express';
import { db } from '../db';
import { politicians } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Build a reliable photo URL string with primary and fallback sources
 * 
 * @param bioguideId The bioguide ID for the politician
 * @returns A pipe-separated string containing primary and fallback photo URLs
 */
function buildPhotoUrl(bioguideId: string): string {
  if (!bioguideId) {
    return '';
  }
  
  // 1️⃣ primary: open-source unitedstates.io mirror
  const primaryUrl = `https://theunitedstates.io/images/congress/450x550/${bioguideId}.jpg`;
  
  // 2️⃣ fallback: official bioguide cloudfront
  const fallbackUrl = `https://bioguide-cloudfront.house.gov/bioguide/photo/${bioguideId[0].toUpperCase()}/${bioguideId}.jpg`;
  
  return `${primaryUrl}|${fallbackUrl}`;
}

/**
 * API endpoint to update politician photo URLs with more reliable sources
 */
export async function updatePhotoUrls(req: Request, res: Response) {
  try {
    // Get all politicians
    const allPoliticians = await db.select().from(politicians);
    console.log(`Found ${allPoliticians.length} politicians to update`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    const updatedPoliticians = [];
    
    for (const politician of allPoliticians) {
      if (politician.bioguideId) {
        // Build the reliable photo URLs
        const photoUrl = buildPhotoUrl(politician.bioguideId);
        
        // Update the politician record
        await db
          .update(politicians)
          .set({ photoUrl })
          .where(eq(politicians.id, politician.id));
        
        updatedCount++;
        updatedPoliticians.push({
          id: politician.id,
          name: `${politician.firstName} ${politician.lastName}`,
          bioguideId: politician.bioguideId,
          photoUrl
        });
      } else {
        skippedCount++;
      }
    }
    
    return res.json({
      success: true,
      message: `Updated ${updatedCount} politicians, skipped ${skippedCount} without bioguideId`,
      updated: updatedPoliticians
    });
  } catch (error) {
    console.error('Error updating photo URLs:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error updating photo URLs',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}