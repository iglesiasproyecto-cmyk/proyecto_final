# User Authentication Linkage Recovery Scripts

## link_usuarios_to_auth.sql

This script links usuario records to auth.users accounts after the deletion incident.

### ⚠️ CRITICAL WARNINGS

- **MUST be run in Supabase SQL Editor only**
- **MUST be run in a transaction (BEGIN...COMMIT)**
- **MUST verify each step before proceeding**
- **DO NOT modify the SQL** - every verification step is required

### EXECUTION STEPS

1. Open Supabase Dashboard: https://supabase.com/dashboard/project/heibyjbvfiokmduwwawm/sql/new
2. Copy the entire content from `link_usuarios_to_auth.sql`
3. Paste into SQL Editor
4. Execute ONE SECTION AT A TIME:
   - Copy "STEP 1" queries and run them
   - Review results for any issues
   - If no issues, copy "STEP 2" and run
   - Continue through all steps
5. After STEP 6 (all verifications pass), uncomment the COMMIT line
6. Run COMMIT
7. Document results in /home/juanda/Proyectofinal/RECOVERY.txt

### EXPECTED RESULTS

- **STEP 1**: 0 rows (no conflicts)
- **STEP 2**: N > 0 (number of users to link)
- **STEP 3**: List of emails to be linked (verify correctness!)
- **STEP 4**: UPDATE statement executes without error
- **STEP 5**: 0 rows (all users successfully linked)
- **STEP 6**: All users should show status = LINKED ✓
- **FINAL**: linked_usuarios = total_usuarios

### IF SOMETHING GOES WRONG

Before STEP 4 (the UPDATE): The transaction hasn't modified anything yet, safe to ROLLBACK

After STEP 4 but before COMMIT: You can still ROLLBACK to undo the UPDATE

If errors occur:
1. ROLLBACK the transaction
2. Review the error carefully
3. Check if there are conflicting email addresses
4. Resolve the conflict
5. Run the script again
