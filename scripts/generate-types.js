#!/usr/bin/env node

/**
 * Script to generate TypeScript types from Supabase schema
 * Usage: node scripts/generate-types.js
 */

const SUPABASE_PROJECT_REF = 'heibyjbvfiokmduwwawm';
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || 'sbp_fd926362e8d7400e10f11d75f5f24cf55ee69b1a';

async function generateTypes() {
  try {
    console.log('Generating TypeScript types from Supabase schema...');
    console.log(`Project: ${SUPABASE_PROJECT_REF}`);
    
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/types/typescript`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        }
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Type generation failed: ${response.status} ${error}`);
    }
    
    const responseText = await response.text();
    
    // Try to parse as JSON first (API may return {types: "..."})
    let types = responseText;
    try {
      const json = JSON.parse(responseText);
      if (json.types) types = json.types;
    } catch (e) {
      // Not JSON, use as-is
    }
    
    // Write to file
    const fs = await import('fs');
    fs.writeFileSync('src/types/database.types.ts', types, 'utf8');
    
    console.log('✅ Types generated successfully');
    console.log(`   Written to: src/types/database.types.ts`);
    
  } catch (error) {
    console.error('❌ Type generation error:', error.message);
    process.exit(1);
  }
}

generateTypes();
