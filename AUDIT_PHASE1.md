# PHASE 1: ROOT CAUSE INVESTIGATION - EVIDENCE GATHERING

## Timeline
- Accidental deletion of tables and data
- Partial restoration from local migrations
- Login issues partially fixed
- Multiple inconsistencies detected

## Critical Errors to Investigate

### Error 1: Super Admin Cannot Create Churches
```
POST /rest/v1/iglesia -> 400 Bad Request
```

### Error 2: Super Admin Cannot Create Departments  
```
POST /rest/v1/departamento -> 403 Forbidden
```

### Error 3: Multiple 404 Errors
- aula_certificado (missing)
- aula_inscripcion (missing)
- get_hoja_de_vida_completa() RPC (missing)

### Error 4: Auth State Looping
- Excessive SIGNED_IN events
- Duplicated listeners suspected
- Session management issues

### Error 5: RLS Issues
- Need to audit EVERY table
- Validate role inheritance
- Check church/ministry isolation

## Investigation Categories

1. **Database Schema**
   - [ ] List all tables
   - [ ] Check iglesia table structure
   - [ ] Check departamento table structure
   - [ ] Check missing tables (aula_certificado, aula_inscripcion)
   - [ ] Verify foreign keys
   - [ ] Verify indexes

2. **Migrations**
   - [ ] List all migrations
   - [ ] Check migration order
   - [ ] Verify restore completeness
   - [ ] Detect broken references

3. **RLS Policies**
   - [ ] Audit INSERT policies for iglesia
   - [ ] Audit INSERT policies for departamento
   - [ ] Check role functions
   - [ ] Validate super_admin access

4. **RPC Functions**
   - [ ] List all RPC functions
   - [ ] Check get_hoja_de_vida_completa() signature
   - [ ] Verify function integrity

5. **Frontend Services**
   - [ ] Trace iglesia creation flow
   - [ ] Trace departamento creation flow
   - [ ] Check AppContext integration
   - [ ] Verify payload types

6. **Auth Flow**
   - [ ] Inspect auth listener setup
   - [ ] Check for duplicate subscriptions
   - [ ] Verify session state management

