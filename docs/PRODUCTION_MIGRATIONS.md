# Production Migrations

**Safe procedures for running database schema migrations in production.**

---

## Overview

Database migrations require careful planning to prevent data loss or downtime during voting operations.

**Key Principles:**
- Always backup before migration
- Test migrations in staging first
- Use gradual rollout if possible
- Never run destructive migrations on live voting
- Have rollback plan ready

---

## Migration Process

### Step 1: Backup Database

**Before any migration:**

```bash
# Create backup
pg_dump postgresql://user:pass@host:5432/db > backup-pre-migration.sql

# Verify backup
ls -lh backup-pre-migration.sql

# Upload to S3
aws s3 cp backup-pre-migration.sql s3://backups/votehub/pre-migration/
```

### Step 2: Test in Staging

**Never run untested migrations in production:**

```bash
# Restore staging database from production backup
psql staging_db < production-backup.sql

# Apply migration to staging
npx prisma migrate deploy

# Run tests
npm test

# Verify data integrity
npx prisma db execute --stdin < verify-migration.sql
```

### Step 3: Execute Migration

**On production database:**

```bash
# 1. Take final backup
npm run backup

# 2. Run migration
npx prisma migrate deploy --skip-generate

# 3. Verify schema
npx prisma db execute --stdin < check-schema.sql

# 4. Run tests
npm test
```

### Step 4: Verify Migration

**Confirm migration succeeded:**

```bash
# Check migration status
npx prisma migrate status

# Verify schema
psql -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public';"

# Check row counts
SELECT COUNT(*) FROM organizations;
SELECT COUNT(*) FROM elections;
SELECT COUNT(*) FROM ballots;
```

---

## VoteHub Migration History

### Current Migrations (9 total)

```
Timestamp           Name                    Status
2026-07-12 08:17:21 init                    ✅ Applied
2026-08-16          election_voters         ✅ Applied
2026-08-16          results_engine          ✅ Applied
2026-08-16          voting_engine           ✅ Applied
2026-08-16          voting_engine_rls       ✅ Applied
2026-08-17          audit_logs_security     ✅ Applied
2026-08-17          invitations             ✅ Applied
2026-08-17          notifications           ✅ Applied
2026-08-18          super_admin_setup       ✅ Applied
```

**To check in production:**

```bash
npx prisma migrate status
```

---

## Creating New Migrations

### When to Create a Migration

- Adding a new table
- Adding columns to existing table
- Modifying column types
- Adding indexes
- Adding constraints
- Adding RLS policies

### Creating Migration

```bash
# 1. Update Prisma schema
nano prisma/schema.prisma

# 2. Create migration
npx prisma migrate dev --name describe_change

# 3. Review generated SQL
nano prisma/migrations/TIMESTAMP_describe_change/migration.sql

# 4. Test locally
npm test

# 5. Add to git
git add prisma/migrations/

# 6. Test in staging
# 7. Deploy to production with backup
```

---

## Rollback Procedures

### If Migration Fails

**Restore from backup:**

```bash
# 1. Stop application
systemctl stop votehub

# 2. Restore backup
psql postgresql://user:pass@host:5432/db < backup-pre-migration.sql

# 3. Restart application
systemctl start votehub

# 4. Verify
curl https://votehub.example.com/api/health
```

### If Data is Corrupted

**Restore specific records from backup:**

```bash
# Identify corrupted records
SELECT * FROM corrupted_table WHERE condition;

# Restore from backup using psql restore tools
# Verify restoration
SELECT COUNT(*) FROM corrupted_table;
```

---

## Data Integrity Verification

### Key Verification Queries

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema='public';

-- Verify row counts (should not decrease unexpectedly)
SELECT 'organizations' as table_name, COUNT(*) as rows FROM organizations
UNION ALL SELECT 'elections', COUNT(*) FROM elections
UNION ALL SELECT 'ballots', COUNT(*) FROM ballots
UNION ALL SELECT 'voters', COUNT(*) FROM voters;

-- Check foreign key integrity
SELECT constraint_name, table_name
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY';

-- Verify indexes exist
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public';

-- Validate no NULL values in required columns
SELECT * FROM organizations WHERE id IS NULL;
SELECT * FROM elections WHERE id IS NULL;
SELECT * FROM ballots WHERE id IS NULL;

-- Check for orphaned records
SELECT b.* FROM ballots b
LEFT JOIN election_voters ev ON b.election_voter_id = ev.id
WHERE ev.id IS NULL;
```

---

## Migration Testing Checklist

Before deploying to production:

```
[ ] Backup created and verified
[ ] Migration tested in staging
[ ] Data integrity verified
[ ] All tests passing (npm test)
[ ] Application starts normally
[ ] Login works
[ ] Elections can be created
[ ] Voting works
[ ] Results calculate correctly
[ ] No error logs
[ ] Performance acceptable
[ ] Rollback procedure documented
[ ] Stakeholders notified
[ ] Monitoring configured
```

---

## Common Migration Issues

### "Relation does not exist"

**Solution:**
```bash
npx prisma migrate deploy --skip-generate
```

### "Foreign key constraint violation"

**Solution:**
```bash
# Find orphaned records
SELECT * FROM table_a 
LEFT JOIN table_b ON table_a.id = table_b.table_a_id
WHERE table_b.id IS NULL;

# Delete orphaned records
DELETE FROM table_a WHERE id NOT IN (SELECT DISTINCT table_a_id FROM table_b);

# Re-run migration
npx prisma migrate deploy
```

### "Timeout" on large migration

**Solution:**
```bash
npx prisma migrate deploy --timeout=600
```

### "Application won't start"

**Solution:**
```bash
# Regenerate Prisma client
npx prisma generate
npm run dev
```

---

## Migration Safety Guidelines

### NEVER in Production

```
❌ Run untested migrations
❌ Run migrations during elections
❌ Drop tables or columns destructively
❌ Run large data transformations without backup
❌ Change RLS policies without testing
```

### ALWAYS in Production

```
✅ Backup before migration
✅ Test in staging first
✅ Plan maintenance window
✅ Document rollback procedure
✅ Configure monitoring
✅ Notify stakeholders
✅ Verify data after migration
✅ Monitor for 24 hours
```

---

## References

- [Prisma Migration Guide](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)

**Last Updated:** 2026-08-18
