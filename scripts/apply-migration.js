#!/usr/bin/env node

/**
 * Script to apply migration via Supabase Management API
 * Usage: node scripts/apply-migration.js <migration-file-path>
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const SUPABASE_PROJECT_REF = 'heibyjbvfiokmduwwawm';
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || 'sbp_fd926362e8d7400e10f11d75f5f24cf55ee69b1a';

async function applyMigration(migrationPath) {
  try {
    // Read migration SQL
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log(`Applying migration: ${path.basename(migrationPath)}`);
    console.log(`Project: ${SUPABASE_PROJECT_REF}`);
    
    // Apply migration via Supabase Management API
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: sql })
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Migration failed: ${response.status} ${error}`);
    }
    
    const result = await response.json();
    console.log('✅ Migration applied successfully');
    console.log('Result:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    process.exit(1);
  }
}

// Main
const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('Usage: node scripts/apply-migration.js <migration-file-path>');
  process.exit(1);
}

if (!fs.existsSync(migrationFile)) {
  console.error(`Migration file not found: ${migrationFile}`);
  process.exit(1);
}

applyMigration(migrationFile);
