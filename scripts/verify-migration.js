#!/usr/bin/env node

/**
 * Script to verify migration via Supabase Management API
 * Usage: node scripts/verify-migration.js
 */

import fs from 'fs';

const SUPABASE_PROJECT_REF = 'heibyjbvfiokmduwwawm';
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || 'sbp_fd926362e8d7400e10f11d75f5f24cf55ee69b1a';

async function verifyColumn() {
  try {
    const sql = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'usuario' AND column_name = 'auth_user_id';
    `;
    
    console.log('Verifying auth_user_id column in usuario table...');
    
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
      throw new Error(`Query failed: ${response.status} ${error}`);
    }
    
    const result = await response.json();
    
    if (result && result.length > 0) {
      console.log('✅ Column verified:');
      console.log(`  - column_name: ${result[0].column_name}`);
      console.log(`  - data_type: ${result[0].data_type}`);
    } else {
      console.log('❌ Column not found');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Verification error:', error.message);
    process.exit(1);
  }
}

verifyColumn();
