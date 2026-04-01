#!/usr/bin/env node

/**
 * Script to verify RLS policies via Supabase Management API
 * Usage: node scripts/verify-policies.js
 */

const SUPABASE_PROJECT_REF = 'heibyjbvfiokmduwwawm';
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || 'sbp_fd926362e8d7400e10f11d75f5f24cf55ee69b1a';

async function verifyPolicies() {
  try {
    const sql = `
      SELECT tablename, policyname, cmd
      FROM pg_policies
      WHERE schemaname = 'public'
        AND roles::text LIKE '%authenticated%'
      ORDER BY tablename;
    `;
    
    console.log('Verifying RLS policies for authenticated role...');
    
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
      console.log(`✅ Found ${result.length} RLS policies:`);
      console.table(result);
    } else {
      console.log('❌ No policies found');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Verification error:', error.message);
    process.exit(1);
  }
}

verifyPolicies();
