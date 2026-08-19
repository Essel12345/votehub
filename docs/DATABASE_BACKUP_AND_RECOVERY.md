# Database Backup and Recovery

**Complete guide for backing up and recovering VoteHub PostgreSQL database.**

---

## Overview

A robust backup strategy is critical for production voting systems. Data loss is unacceptable.

**Strategy:**
- Automated daily backups via Supabase
- Weekly manual backups exported to secure storage
- Monthly restore testing
- 30-day retention minimum
- Documented recovery procedures

---

## Supabase Automated Backups

### Backup Configuration

**Supabase Plans:**
- Free: 1-day retention
- Pro: 7-day retention
- Team: 30-day retention

### Enable Automated Backups

1. **Login to Supabase Console**
   - https://supabase.com/dashboard

2. **Navigate to:** Project Settings → Backups

3. **Configure:**
   - Backup frequency: Daily
   - Retention: Select your plan level (recommended: 30 days minimum)
   - Notifications: Enable backup completion alerts

4. **Verify:**
   - Backups tab shows recent backups
   - Retention policy is clear

### Automatic Backup Recovery

**If** database becomes corrupted:

1. **Go to:** Project Settings → Backups

2. **Select** the backup from before corruption occurred

3. **Click** "Restore" button

4. **Confirm** the restore operation

5. **Wait** for restoration to complete (5-30 minutes depending on size)

6. **Verify** data integrity after restore

**Impact:** All data after backup point is lost. This is why frequent backups are critical.

---

## Manual Backup Procedure

For additional backup redundancy and off-site storage.

### Daily Manual Backup

**Requirements:**
- PostgreSQL client tools (`pg_dump`)
- Secure cloud storage (AWS S3, Google Cloud Storage, etc.)
- Database credentials

### Step 1: Create Backup File

```bash
# Set environment variables
export PGPASSWORD="your-database-password"
export BACKUP_FILE="votehub-backup-$(date +%Y%m%d-%H%M%S).sql"

# Create backup
pg_dump \
  --host db.project-id.supabase.co \
  --port 5432 \
  --username postgres \
  --database postgres \
  --verbose \
  > "/tmp/$BACKUP_FILE"

# Verify backup
ls -lh "/tmp/$BACKUP_FILE"
```

### Step 2: Compress Backup

```bash
# Compress for storage efficiency
gzip "/tmp/$BACKUP_FILE"

# Verify compression
ls -lh "/tmp/$BACKUP_FILE.gz"
```

### Step 3: Encrypt Backup

```bash
# Encrypt with GPG (recommended)
gpg --symmetric --cipher-algo AES256 "/tmp/$BACKUP_FILE.gz"

# Verify encryption
ls -lh "/tmp/$BACKUP_FILE.gz.gpg"
```

### Step 4: Upload to Secure Storage

**Option A: AWS S3**
```bash
# Configure AWS credentials
aws configure

# Upload to S3
aws s3 cp "/tmp/$BACKUP_FILE.gz.gpg" \
  s3://your-backup-bucket/votehub/$(date +%Y/%m/%d)/

# Set retention policy
aws s3api put-object-retention \
  --bucket your-backup-bucket \
  --key votehub/$(date +%Y/%m/%d)/$BACKUP_FILE.gz.gpg \
  --retention "Mode"="COMPLIANCE","RetainUntilDate"="$(date -d '+30 days' -u +'%Y-%m-%dT%H:%M:%SZ')"
```

**Option B: Google Cloud Storage**
```bash
# Upload to GCS
gsutil cp "/tmp/$BACKUP_FILE.gz.gpg" \
  gs://your-backup-bucket/votehub/$(date +%Y/%m/%d)/

# Verify upload
gsutil ls -lh gs://your-backup-bucket/votehub/
```

### Step 5: Clean Up Local Files

```bash
# Remove temporary files
rm -f "/tmp/$BACKUP_FILE"
rm -f "/tmp/$BACKUP_FILE.gz"
rm -f "/tmp/$BACKUP_FILE.gz.gpg"
```

### Automated Daily Backup Script

Create a cron job for daily backups:

```bash
#!/bin/bash
# File: /opt/votehub/backup.sh

set -e

BACKUP_DIR="/backup/votehub"
RETENTION_DAYS=30
LOG_FILE="/var/log/votehub-backup.log"

{
  echo "[$(date)] Starting VoteHub backup..."
  
  # Create backup
  BACKUP_FILE="$BACKUP_DIR/votehub-$(date +%Y%m%d-%H%M%S).sql"
  
  pg_dump \
    --host db.project-id.supabase.co \
    --username postgres \
    --database postgres \
    > "$BACKUP_FILE"
  
  # Compress
  gzip "$BACKUP_FILE"
  
  # Encrypt
  gpg --symmetric --cipher-algo AES256 "$BACKUP_FILE.gz"
  
  # Upload to S3
  aws s3 cp "$BACKUP_FILE.gz.gpg" \
    "s3://backup-bucket/votehub/$(date +%Y/%m/%d)/"
  
  # Clean up local files
  rm -f "$BACKUP_FILE.gz"
  rm -f "$BACKUP_FILE.gz.gpg"
  
  # Remove old local backups
  find "$BACKUP_DIR" -name "*.gpg" -mtime +$RETENTION_DAYS -delete
  
  echo "[$(date)] Backup completed successfully"
  
} >> "$LOG_FILE" 2>&1
```

Add to crontab:
```bash
# Backup daily at 2 AM UTC
0 2 * * * /opt/votehub/backup.sh
```

---

## Backup Verification

### Weekly Backup Test

**Test that backups are valid and recoverable:**

```bash
# 1. Download backup from S3
aws s3 cp s3://backup-bucket/votehub/latest.sql.gz.gpg ./

# 2. Decrypt
gpg --output latest.sql.gz latest.sql.gz.gpg

# 3. Decompress
gunzip latest.sql.gz

# 4. Verify file integrity
head -20 latest.sql  # Should contain SQL statements

# 5. Test restore to temporary database
PGPASSWORD="temp-password" pg_restore \
  --host localhost \
  --username postgres \
  --database votehub_test \
  latest.sql

# 6. Verify data restored
psql -U postgres -d votehub_test -c "SELECT COUNT(*) FROM organizations;"

# 7. Clean up test database
dropdb -U postgres votehub_test
```

### Automated Backup Verification

```bash
# Add to weekly cron job
# Verify backup can be restored
check_backup() {
  local backup_file=$1
  
  # Download
  aws s3 cp "$backup_file" /tmp/
  
  # Decrypt
  gpg --batch --yes --output /tmp/test.sql.gz \
    --passphrase "$GPG_PASSPHRASE" /tmp/$(basename $backup_file)
  
  # Decompress
  gunzip /tmp/test.sql.gz
  
  # Verify SQL syntax
  head -100 /tmp/test.sql | grep -q "CREATE TABLE"
  
  # Clean up
  rm -f /tmp/test.sql*
  
  return $?
}

# Check latest 5 backups
for backup in $(aws s3 ls s3://backup-bucket/votehub/ --recursive | head -5 | awk '{print $NF}'); do
  check_backup "s3://backup-bucket/$backup"
  echo "[$(date)] Verified $backup"
done
```

---

## Disaster Recovery Procedures

### Scenario 1: Data Corruption

**Detection:**
- Application errors on data retrieval
- Duplicate key violations
- Foreign key constraint failures

**Recovery:**

1. **Assess Damage**
   ```sql
   -- Check for corruption
   SELECT COUNT(*) FROM organizations WHERE id IS NULL;
   SELECT * FROM pg_stat_user_tables WHERE last_vacuum IS NULL;
   ```

2. **Stop Application**
   - Prevent further writes
   - Notify admins

3. **Restore from Latest Good Backup**
   - Use Supabase console OR
   - Manually restore from S3 backup
   - Follow "Restore from Backup" section below

4. **Verify Recovery**
   ```bash
   # Test database queries
   npm run test  # Run test suite
   
   # Check key metrics
   SELECT COUNT(*) FROM organizations;
   SELECT COUNT(*) FROM elections;
   SELECT COUNT(*) FROM ballots;
   ```

5. **Resume Application**
   - Restart application
   - Monitor logs closely
   - Verify voting system working

---

### Scenario 2: Accidental Data Deletion

**Example:** Admin accidentally deletes all voters for an election

**Recovery:**

1. **Stop Application** (if ongoing election)
   - Prevent further changes
   - Notify users

2. **Restore Point-in-Time**
   - Get timestamp of deletion: `2026-08-18 14:30:00 UTC`
   - Restore backup taken before that time
   - Use Supabase: Settings → Backups → Restore

3. **Partial Recovery** (if full restore not acceptable)
   ```bash
   # Restore to test database
   # Run selectively needed data
   # Insert back into production
   
   # Get affected voters from backup
   SELECT * FROM voters 
   WHERE election_id = 'election-123'
   AND updated_at > '2026-08-18 14:00:00'
   AND updated_at < '2026-08-18 14:45:00'
   
   # Re-insert into production
   ```

4. **Verify Election Integrity**
   - Confirm voter list restored
   - Verify email invitations if needed
   - Resume election if appropriate

---

### Scenario 3: Complete Database Loss

**Example:** Database server failure, no Supabase backups available

**Recovery:**

1. **Provision New Database**
   - Create new Supabase project OR
   - Spin up new PostgreSQL instance

2. **Restore Schema from Git**
   ```bash
   # Schema is version-controlled
   git checkout prisma/schema.prisma
   
   # Apply migrations
   npx prisma migrate deploy
   ```

3. **Restore Data from Offline Backup**
   ```bash
   # Decrypt and decompress
   gpg --decrypt votehub-backup.sql.gpg | gunzip > votehub-backup.sql
   
   # Restore to new database
   psql -U postgres -d postgres < votehub-backup.sql
   ```

4. **Verify Restored Data**
   - Run test suite
   - Check key records
   - Verify audit logs

5. **Update Connection Strings**
   - Update DATABASE_URL
   - Restart application

---

## Restore from Backup

### Supabase Web Console (Easiest)

1. **Login to Supabase Dashboard**
   - https://supabase.com/dashboard
   - Select your project

2. **Go to:** Project Settings → Backups

3. **Select** the backup to restore

4. **Click** the Restore button

5. **Confirm** you want to restore

6. **Wait** for completion (5-30 minutes)

7. **Verify** data restored correctly

### Manual Restore from Export

```bash
# 1. Download backup file
aws s3 cp s3://backup-bucket/votehub/2026-08-18/backup.sql.gz.gpg ./

# 2. Decrypt
gpg --output backup.sql.gz backup.sql.gz.gpg

# 3. Decompress
gunzip backup.sql.gz

# 4. Connect to target database
export PGPASSWORD="password"

# 5. Restore (this will OVERWRITE the database)
psql -h db.project-id.supabase.co -U postgres -d postgres < backup.sql

# 6. Verify
psql -h db.project-id.supabase.co -U postgres -d postgres -c "SELECT COUNT(*) FROM organizations;"
```

---

## Backup Retention Policy

**Recommended:**
- Daily backups: Keep 7 days (automatic via Supabase)
- Weekly exports: Keep 4 weeks (manual to S3)
- Monthly archives: Keep 1 year (cold storage)
- Annual archives: Keep indefinitely (legal compliance)

**Supabase Plan Costs:**
- Free: Included, 1-day retention
- Pro: $25/month, 7-day retention
- Team: $599/month, 30-day retention

**Manual Backup Costs (AWS S3):**
- Storage: ~$0.50 per SQL file per month (compressed)
- Transfer: ~$0.09 per GB egress

**Example Cost for 50 daily backups:**
- Supabase retention: Included in plan
- S3 storage: ~$25/month
- Annual archives: ~$100/year

---

## Monitoring and Alerts

### What to Monitor

```bash
# Set up alerts for:
1. Backup failures
2. Backup size anomalies (sudden spike = problem)
3. Restore test failures
4. Database corruption detection
5. Replication lag (if using read replicas)
```

### CloudWatch Alarms (AWS)

```bash
# Alert if backup is missing
aws cloudwatch put-metric-alarm \
  --alarm-name votehub-backup-missing \
  --alarm-description "Alert if daily backup not found" \
  --evaluation-periods 1 \
  --period 86400 \
  --statistic Maximum \
  --threshold 1 \
  --comparison-operator LessThanThreshold

# Alert if backup file is suspiciously small
aws cloudwatch put-metric-alarm \
  --alarm-name votehub-backup-size-low \
  --alarm-description "Alert if backup size < 1MB" \
  --evaluation-periods 1 \
  --period 3600 \
  --statistic Minimum \
  --threshold 1000000 \
  --comparison-operator LessThanThreshold
```

---

## Recovery Time and Recovery Point Objectives

### RTO (Recovery Time Objective)

**How long can you tolerate downtime?**

| Scenario | RTO | Method |
|----------|-----|--------|
| Minor corruption | 30 min | Supabase restore |
| Data deletion | 1 hour | Restore from S3 |
| Complete loss | 4 hours | Provision new DB + restore |

### RPO (Recovery Point Objective)

**How much data loss can you tolerate?**

| Scenario | RPO | Backup Frequency |
|----------|-----|------------------|
| Minor issue | 1 hour | Every hour |
| Corruption | 1 day | Daily |
| Complete loss | 1 week | Weekly export |

**For Elections:** RPO should be < 1 hour to minimize vote loss

---

## Backup Security

### Access Control
```bash
# Restrict backup bucket access
aws s3api put-bucket-policy \
  --bucket votehub-backups \
  --policy file://backup-policy.json
```

Backup policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::ACCOUNT-ID:root"
      },
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::votehub-backups",
        "arn:aws:s3:::votehub-backups/*"
      ]
    }
  ]
}
```

### Encryption
- ✅ Encrypt backups in transit (TLS)
- ✅ Encrypt backups at rest (S3 encryption)
- ✅ Encrypt with GPG before upload
- ✅ Rotate encryption keys yearly

### Audit Logging
```bash
# Enable S3 access logging
aws s3api put-bucket-logging \
  --bucket votehub-backups \
  --bucket-logging-status file://logging.json
```

---

## Backup Testing Schedule

```
Weekly (Every Monday):
- Download latest backup
- Decrypt and decompress
- Verify SQL syntax
- Test restore to staging database

Monthly (First of month):
- Full restore test in production-like environment
- Run complete test suite
- Verify data integrity
- Document any issues

Quarterly (Jan, Apr, Jul, Oct):
- Comprehensive DR drill
- Restore to completely new database
- Test all application functions
- Document recovery time
```

---

## References

- [Supabase Backups Documentation](https://supabase.com/docs/guides/database/backups)
- [PostgreSQL pg_dump Documentation](https://www.postgresql.org/docs/current/app-pgdump.html)
- [AWS S3 Security Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html)
- [GPG Encryption Guide](https://www.gnupg.org/gph/en/manual/r1023.html)

---

**Last Updated:** 2026-08-18  
**Next Backup Review:** 2026-09-18  
**Backup Status:** ✅ Configured and tested
