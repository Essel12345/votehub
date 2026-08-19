# Disaster Recovery Plan

**Procedures for recovering VoteHub from various failure scenarios.**

---

## Overview

Disaster recovery ensures VoteHub remains operational during failures.

**Objectives:**
- RTO (Recovery Time Objective): < 1 hour
- RPO (Recovery Point Objective): < 1 day
- Automated failover where possible
- Manual recovery procedures documented

---

## Failure Scenarios and Recovery

### Scenario 1: Database Connection Loss

**Detection:**
```
- Application error: "Cannot connect to database"
- API endpoints returning 500 errors
- Users unable to log in
```

**Recovery Procedure:**

1. **Verify Connectivity**
```bash
psql -h db.project-id.supabase.co -U postgres -d postgres -c "SELECT 1;"
```

2. **If Connection Fails:**
   - Check Supabase status page: https://status.supabase.com
   - Verify firewall allows outbound connections
   - Check DATABASE_URL environment variable

3. **If Database is Down:**
   - Failover to standby database (if available)
   - Restore from latest backup
   - Follow "Complete Database Restore" procedure

4. **Resume Application**
   - Restart application servers
   - Verify connectivity
   - Run smoke tests

---

### Scenario 2: Data Corruption

**Detection:**
```
- Duplicate key errors
- Foreign key constraint violations
- Missing data in critical tables
- Application crashes on data retrieval
```

**Recovery Procedure:**

1. **Identify Corruption**
```sql
-- Check for NULL IDs
SELECT * FROM organizations WHERE id IS NULL;

-- Check foreign keys
SELECT b.* FROM ballots b
LEFT JOIN election_voters ev ON b.election_voter_id = ev.id
WHERE ev.id IS NULL;

-- Check constraints
SELECT constraint_name, table_name FROM information_schema.table_constraints WHERE constraint_type = 'CHECK';
```

2. **Isolate Issue**
   - Stop writes to affected tables (if possible)
   - Document extent of corruption
   - Identify root cause

3. **Restore from Backup**
   - Determine backup point (before corruption)
   - Restore to staging database first
   - Verify integrity
   - Restore to production

4. **Reconcile Data**
   - Identify any events after corruption
   - Re-apply legitimate changes
   - Notify affected users

---

### Scenario 3: Authentication Provider Failure

**Detection:**
```
- Supabase status page shows outage
- Login endpoints return authentication errors
- JWT token validation failing
```

**Recovery Procedure:**

1. **If Supabase is Down:**
   - Check https://status.supabase.com
   - Wait for Supabase to recover (typically < 30 min)
   - Or failover to backup authentication if configured

2. **Fallback Authentication** (if available):
   - Some systems implement backup LDAP/local auth
   - Switch application to fallback provider
   - Restart application servers

3. **Communicating with Users:**
   - Post status update on status page
   - Notify admins via email/SMS
   - Provide ETA for recovery

4. **Post-Recovery:**
   - Verify all users can log in
   - Check audit logs for failed logins
   - Monitor for unusual activity

---

### Scenario 4: Email Provider Failure

**Detection:**
```
- Emails not being sent
- Email provider API returning errors
- User reports missing notifications
```

**Recovery Procedure:**

1. **Check Provider Status**
   - SendGrid: https://status.sendgrid.com
   - Resend: https://status.resend.com
   - SMTP: Test connection manually

2. **If Provider is Down:**
   - Email service logs errors but doesn't crash
   - Emails queued for retry
   - Wait for provider recovery

3. **Fallback Email Provider:**
   - If configured, switch to backup email provider
   - Update `EMAIL_PROVIDER` environment variable
   - Restart application

4. **Catch-up:**
   - Once recovered, resend queued notifications
   - Verify all users received notifications
   - Check email logs for failures

5. **If Unrecoverable:**
   - Disable email temporarily
   - Switch to in-app notifications only
   - Notify users of email unavailability

---

### Scenario 5: Application Server Failure

**Detection:**
```
- Application not responding on HTTP
- All endpoints returning connection refused
- Server unable to start
```

**Recovery Procedure:**

1. **Restart Application**
```bash
systemctl restart votehub

# Verify
curl https://votehub.example.com/api/health
```

2. **If Restart Fails:**
   - Check logs: `journalctl -u votehub -n 50`
   - Verify environment variables set
   - Check database connectivity
   - Verify build artifacts present

3. **Rebuild Application:**
```bash
cd /opt/votehub
git pull origin main
npm install
npm run build
systemctl restart votehub
```

4. **If Still Failing:**
   - Rollback to previous version
   - Deploy hotfix
   - Notify ops team

5. **Load Balancer:**
   - If using load balancer, traffic automatically fails over
   - Bring up new application instances
   - Verify health checks passing

---

### Scenario 6: Disk Space Full

**Detection:**
```
- "No space left on device" errors
- Database writes failing
- Application logs error
```

**Recovery Procedure:**

1. **Check Disk Usage**
```bash
df -h
du -sh /var/log/*
du -sh /data/*
```

2. **Free Space:**
   - Delete old log files: `rm -f /var/log/votehub*.gz`
   - Clear temp files: `rm -rf /tmp/*`
   - Archive old backups

3. **Prevent Recurrence:**
   - Configure log rotation
   - Set up disk usage alerts
   - Clean up job scheduled nightly

---

### Scenario 7: Memory Exhaustion

**Detection:**
```
- Out of memory errors
- Application process killed by system
- Response times extremely slow
```

**Recovery Procedure:**

1. **Check Memory Usage**
```bash
free -h
ps aux --sort=-%mem | head
```

2. **Restart Application**
```bash
systemctl restart votehub
```

3. **Identify Memory Leak:**
   - Review recent code changes
   - Monitor memory usage over time
   - Profile application
   - Fix memory leak in new release

4. **Temporary Mitigation:**
   - Increase server memory
   - Scale up to larger instance type
   - Implement auto-restart on memory limit

---

### Scenario 8: Network Connectivity Loss

**Detection:**
```
- Cannot reach external services (Supabase)
- Email provider unavailable
- DNS resolution failing
```

**Recovery Procedure:**

1. **Check Network Connectivity**
```bash
ping 8.8.8.8
nslookup db.project-id.supabase.co
curl -I https://api.sendgrid.com
```

2. **If Internal Network Down:**
   - Check firewall rules
   - Verify routing configuration
   - Check DNS servers
   - Switch to backup network if available

3. **If External Connectivity Down:**
   - Failover to backup ISP if available
   - Use mobile hotspot as temporary solution
   - Wait for ISP recovery

4. **Application Impact:**
   - Database: Connection pooling retries
   - Email: Delivery queued
   - APIs: Timeouts and graceful degradation

---

## Regular Testing

### Monthly Disaster Recovery Drill

```bash
# 1. Simulate database failure
# - Stop application
# - Restore from backup to staging
# - Verify data integrity
# - Resume application

# 2. Test failover procedures
# - Switch to backup database
# - Verify no data loss
# - Resume production

# 3. Document any issues
# - Update recovery procedures
# - Address any gaps
# - Train team on changes

# 4. Measure recovery metrics
# - Document RTO (time to recovery)
# - Document RPO (data loss)
# - Compare against objectives
```

---

## Communication During Disaster

### Incident Communication Plan

1. **Immediate (Within 5 minutes)**
   - Alert ops team via Slack/SMS
   - Create incident in PagerDuty
   - Begin investigation

2. **Initial Update (Within 15 minutes)**
   - Post status update: "Investigating issue"
   - Notify major users if voting affected
   - Assign incident commander

3. **Regular Updates (Every 30 minutes)**
   - Post status update with findings
   - ETA for recovery
   - What users should do

4. **Resolution**
   - Post: "Issue resolved, monitoring"
   - Verify systems working
   - Conduct post-mortem

---

## Recovery Priorities

**During major disaster, recover in this order:**

1. **Authentication System** - Users must be able to log in
2. **Database** - Core data must be accessible
3. **Elections** - Voting system must be operational
4. **Notifications** - Users must be informed
5. **Admin Panel** - Admins must manage situation
6. **Email** - Communication with users
7. **Analytics** - Non-critical features

---

## Backup and Recovery Testing

### Weekly Backup Verification

```bash
# Download latest backup
# Decrypt and decompress
# Verify SQL integrity
# Test restore to staging
# Verify data completeness
```

### Monthly Full Restore Test

```bash
# Restore production data to test environment
# Run full application test suite
# Verify all functions working
# Document any issues
```

---

## Post-Disaster Procedures

### After Recovery

1. **Immediate Actions:**
   - Verify all systems operational
   - Check for data integrity issues
   - Review audit logs
   - Notify users situation resolved

2. **Investigation (Within 24 hours):**
   - Root cause analysis
   - Document what happened
   - Identify preventive measures

3. **Implementation (Within 1 week):**
   - Fix root cause
   - Deploy preventive measures
   - Update runbooks and procedures
   - Train team on lessons learned

4. **Post-Mortem Meeting:**
   - Review incident timeline
   - Discuss what went well
   - Discuss what could improve
   - Assign action items

---

## Contact Information

**Emergency Escalation:**
- On-call Engineer: [Phone/Slack]
- Engineering Manager: [Phone/Slack]
- VP of Operations: [Phone/Slack]

**Service Providers:**
- Supabase Support: https://supabase.com/support
- SendGrid Support: https://support.sendgrid.com
- AWS Support: https://console.aws.amazon.com/support/

**Status Pages:**
- Supabase: https://status.supabase.com
- SendGrid: https://status.sendgrid.com
- AWS: https://status.aws.amazon.com

---

**Last Updated:** 2026-08-18  
**Next DR Drill:** [Date]  
**Last Successful Recovery Test:** [Date]
