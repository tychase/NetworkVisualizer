/*
 * One-time script to update politician photo URLs in the database
 */

import { db } from './server/db.js';
import { politicians } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function updatePhotoUrls() {
  console.log('Starting photo URL update process...');
  
  try {
    // Get all politicians
    const allPoliticians = await db.select().from(politicians);
    console.log(`Found ${allPoliticians.length} politicians to update`);
    
    for (const politician of allPoliticians) {
      if (politician.bioguideId) {
        // Build the URLs with primary and fallback sources
        const bioguideId = politician.bioguideId;
        
        // Primary URL from theunitedstates.io
        const primaryUrl = `https://theunitedstates.io/images/congress/450x550/${bioguideId}.jpg`;
        
        // Fallback URL from bioguide-cloudfront
        const fallbackUrl = `https://bioguide-cloudfront.house.gov/bioguide/photo/${bioguideId[0].toUpperCase()}/${bioguideId}.jpg`;
        
        // Combine the URLs with a pipe separator
        const photoUrl = `${primaryUrl}|${fallbackUrl}`;
        
        // Update the politician record
        await db.update(politicians)
          .set({ photoUrl })
          .where(eq(politicians.id, politician.id));
        
        console.log(`✓ Updated photo URLs for ${politician.firstName} ${politician.lastName} (ID: ${politician.id})`);
      } else {
        console.log(`⚠ No bioguideId for ${politician.firstName} ${politician.lastName} (ID: ${politician.id})`);
      }
    }
    
    console.log('✅ Photo URL update process completed successfully');
  } catch (error) {
    console.error('❌ Error updating photo URLs:', error);
  } finally {
    process.exit(0);
  }
}

// Run the update function
updatePhotoUrls();