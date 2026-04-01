#!/usr/bin/env node

/**
 * Script to verify seed data counts via Supabase Management API
 * Usage: node scripts/verify-seed.js
 */

const SUPABASE_PROJECT_REF = 'heibyjbvfiokmduwwawm';
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || 'sbp_fd926362e8d7400e10f11d75f5f24cf55ee69b1a';

async function verifySeedData() {
  try {
    const sql = `
      SELECT
        (SELECT COUNT(*) FROM public.pais)             AS paises,
        (SELECT COUNT(*) FROM public.departamento)     AS departamentos,
        (SELECT COUNT(*) FROM public.ciudad)           AS ciudades,
        (SELECT COUNT(*) FROM public.rol)              AS roles,
        (SELECT COUNT(*) FROM public.tipo_evento)      AS tipos_evento,
        (SELECT COUNT(*) FROM public.iglesia)          AS iglesias,
        (SELECT COUNT(*) FROM public.sede)             AS sedes,
        (SELECT COUNT(*) FROM public.ministerio)       AS ministerios,
        (SELECT COUNT(*) FROM public.evento)           AS eventos;
    `;
    
    console.log('Verifying seed data counts...');
    
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
      console.log('✅ Seed data counts:');
      console.table(result[0]);
      
      const expected = {
        paises: 1,
        departamentos: 6,
        ciudades: 12,
        roles: 4,
        tipos_evento: 6,
        iglesias: 1,
        sedes: 1,
        ministerios: 1,
        eventos: 1
      };
      
      const actual = result[0];
      let allMatch = true;
      
      for (const [key, expectedVal] of Object.entries(expected)) {
        if (Number(actual[key]) !== expectedVal) {
          console.log(`⚠️  ${key}: expected ${expectedVal}, got ${actual[key]}`);
          allMatch = false;
        }
      }
      
      if (allMatch) {
        console.log('✅ All counts match expected values!');
      }
      
    } else {
      console.log('❌ No data returned');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Verification error:', error.message);
    process.exit(1);
  }
}

verifySeedData();
