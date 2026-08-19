# Production Deployment Checklist

**Final verification before production deployment.**

---

## Pre-Deployment: Environment Setup (2-4 hours)

### Domain & SSL Configuration
- [ ] Production domain registered and configured
- [ ] SSL certificate installed and valid
- [ ] HSTS header configured
- [ ] DNS records pointing to production servers
- [ ] SSL/TLS test passing (https://www.ssllabs.com)

### Supabase Project
- [ ] Production Supabase project created
- [ ] Database provisioned and accessible
- [ ] Backups configured (7-30 day retention)
- [ ] API keys generated (anon + service role)
- [ ] URL and keys verified working

### Environment Variables
- [ ] NEXT_PUBLIC_SUPABASE_URL set
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY set
- [ ] NEXT_PUBLIC_APP_URL set to production domain
- [ ] SUPABASE_URL set (server-side)
- [ ] SUPABASE_ANON_KEY set (server-side)
- [ ] SUPABASE_SERVICE_ROLE_KEY set (server-only, secrets manager)
- [ ] NEXTAUTH_URL set to production domain
- [ ] NEXTAUTH_SECRET set to strong random value
- [ ] DATABASE_URL configured
- [ ] EMAIL_PROVIDER configured (sendgrid/resend/smtp)
- [ ] EMAIL_API_KEY configured (secrets manager)
- [ ] EMAIL_FROM configured and verified
- [ ] NODE_ENV=production
- [ ] All secrets in environment variables, not in code

### Email Configuration
- [ ] Email provider account created
- [ ] API keys generated and tested
- [ ] Sender domain verified
- [ ] Test email sent successfully
- [ ] SPF/DKIM/DMARC records configured
- [ ] Backup email provider configured (optional)

---

## Pre-Deployment: Code Verification (1-2 hours)

### Code Quality
- [ ] Run `npm run lint` - all warnings addressed
- [ ] Run `npm run build` - build successful
- [ ] Run `npm test` - all 402 tests passing
- [ ] No console.log statements left in production code
- [ ] No hardcoded secrets in code
- [ ] No localhost URLs in production code
- [ ] Security headers configured in next.config.js

### Database
- [ ] All 9 migrations tested locally
- [ ] Database schema verified in staging
- [ ] RLS policies enabled on all 13 tables
- [ ] Foreign keys and constraints in place
- [ ] Indexes created on critical fields
- [ ] No orphaned or corrupt data

### Dependencies
- [ ] All dependencies up to date
- [ ] Security audit passing (npm audit)
- [ ] No critical vulnerabilities
- [ ] Prisma version compatible

### Testing Coverage
- [ ] RBAC tests passing (40 tests)
- [ ] Multi-tenant isolation verified (30 tests)
- [ ] Ballot privacy verified (20 tests)
- [ ] Election workflow tested (25 tests)
- [ ] Voting system tested (59 tests)
- [ ] Performance targets met
- [ ] E2E tests passing (44 tests)

---

## Pre-Deployment: Infrastructure Setup (2-4 hours)

### Application Servers
- [ ] Server(s) provisioned (minimum 2 for HA)
- [ ] Node.js 18+ installed
- [ ] PostgreSQL client tools installed
- [ ] SSL certificates installed
- [ ] Firewall rules configured
- [ ] Security groups/network ACLs set

### Load Balancer
- [ ] Load balancer configured
- [ ] Health checks enabled
- [ ] SSL termination configured
- [ ] HTTP → HTTPS redirect configured
- [ ] Session affinity configured (if needed)

### Monitoring & Logging
- [ ] Error tracking configured (e.g., Sentry)
- [ ] Log aggregation configured (e.g., CloudWatch)
- [ ] Monitoring dashboards created
- [ ] Alerting rules configured
- [ ] On-call rotation set up
- [ ] Incident response procedures documented

### Backups
- [ ] Automated daily backups enabled
- [ ] Backup retention policy configured (30+ days)
- [ ] Backup verification scheduled (weekly)
- [ ] Restore procedures tested
- [ ] Off-site backup storage configured

### Disaster Recovery
- [ ] RTO (Recovery Time Objective) defined (< 1 hour)
- [ ] RPO (Recovery Point Objective) defined (< 1 day)
- [ ] Failover procedures documented
- [ ] Rollback procedures documented
- [ ] Communication plan in place

---

## Pre-Deployment: Security Verification (1-2 hours)

### Authentication
- [ ] Login page loads over HTTPS
- [ ] Registration works and creates profiles
- [ ] Password reset flow functional
- [ ] Session timeouts working
- [ ] JWT token validation working
- [ ] Tokens not exposed in logs

### Authorization
- [ ] Super admin routes protected
- [ ] Organization admin routes protected
- [ ] Election officer routes protected
- [ ] Candidate routes protected
- [ ] Voter routes accessible only to voters
- [ ] No privilege escalation paths

### Data Protection
- [ ] RLS policies blocking direct table access
- [ ] Multi-tenant isolation enforced
- [ ] Ballot selections not accessible directly
- [ ] Voter identity not linkable to selections
- [ ] No sensitive data in error messages
- [ ] No secrets in logs

### API Security
- [ ] All endpoints require authentication
- [ ] Authorization checked before data access
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (via Prisma ORM)
- [ ] XSS prevention (React auto-escapes)
- [ ] CSRF protection (NextAuth configured)

### Security Headers
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] X-XSS-Protection: 1; mode=block
- [ ] Referrer-Policy: strict-origin-when-cross-origin
- [ ] CSP header configured
- [ ] Permissions-Policy configured
- [ ] Strict-Transport-Security (HSTS) configured

### Secrets Management
- [ ] No secrets in .env file (in git)
- [ ] No API keys in code
- [ ] No database passwords in code
- [ ] Service role key only on server
- [ ] Secrets stored in environment variables
- [ ] Secrets rotated before production
- [ ] Secrets access controlled/audited

---

## Deployment Day (4-8 hours)

### Pre-Deployment Verification
- [ ] Final backup taken
- [ ] All team members notified
- [ ] Status page created
- [ ] Incident response team on standby
- [ ] Monitoring dashboards open
- [ ] Communication channels ready

### Database Migrations
- [ ] Database backup verified
- [ ] All migrations tested in staging
- [ ] Run: `npx prisma migrate deploy`
- [ ] Verify: All migrations applied
- [ ] Verify: Schema matches expectations
- [ ] Run: Data integrity checks

### Application Deployment
- [ ] Build production bundle: `npm run build`
- [ ] Verify build successful
- [ ] Deploy to application servers
- [ ] Verify health checks passing
- [ ] Verify all instances starting
- [ ] Verify load balancer routing

### Smoke Tests
- [ ] Application responds on HTTPS
- [ ] Login page loads
- [ ] Login works with test account
- [ ] Dashboard loads
- [ ] Create election works
- [ ] Create voter works
- [ ] Voting works (test ballot)
- [ ] Results calculate correctly
- [ ] Admin dashboard loads
- [ ] Audit logs recorded

### Monitoring Verification
- [ ] Error tracking initialized
- [ ] Logs flowing to aggregation service
- [ ] Alerts firing correctly
- [ ] Dashboards showing metrics
- [ ] No critical alerts yet

### Cutover to Production
- [ ] Traffic switched to production
- [ ] Monitor error rate closely
- [ ] Monitor response times
- [ ] Monitor vote submissions
- [ ] Monitor user reports

---

## Post-Deployment: First 24 Hours

### Hourly Checks
- [ ] Error rate < 1%
- [ ] Response time < 1 second
- [ ] Vote submission success > 99%
- [ ] Email delivery working
- [ ] Database performing well
- [ ] No unusual database queries
- [ ] No unusual API access patterns
- [ ] Audit logs recording events

### Support Monitoring
- [ ] No critical user reports
- [ ] No authentication issues
- [ ] No voting issues
- [ ] No performance issues
- [ ] Quick response to any issues

### Verification Tasks
- [ ] Test creating election
- [ ] Test sending invitations
- [ ] Test voter registration
- [ ] Test ballot submission
- [ ] Test vote counting
- [ ] Test results publication
- [ ] Test audit log access

### 24-Hour Checkpoint
- [ ] All systems stable
- [ ] No critical issues found
- [ ] Performance within targets
- [ ] User feedback positive
- [ ] Team ready to normalize operations

---

## Post-Deployment: First Week

### Daily Monitoring
- [ ] Review error logs
- [ ] Check performance metrics
- [ ] Verify backup completion
- [ ] Monitor disk usage
- [ ] Review security events
- [ ] Check for data anomalies

### Weekly Tasks
- [ ] Full test suite run
- [ ] Database consistency check
- [ ] Security audit review
- [ ] User feedback analysis
- [ ] Performance trend review
- [ ] Backup restore test

### Incident Response
- [ ] On-call team on standby
- [ ] Incident procedures accessible
- [ ] Communication channels ready
- [ ] Escalation path clear

---

## Post-Deployment: Ongoing

### Daily
- [ ] Monitor error rates
- [ ] Monitor performance
- [ ] Review support tickets
- [ ] Quick incident response if needed

### Weekly
- [ ] Review metrics and trends
- [ ] Database maintenance
- [ ] Backup verification
- [ ] Security event review
- [ ] Team sync on any issues

### Monthly
- [ ] Full database integrity check
- [ ] Disaster recovery drill
- [ ] Security audit
- [ ] Performance optimization review
- [ ] Dependency updates review

### Quarterly
- [ ] Penetration testing
- [ ] Security review
- [ ] Architecture review
- [ ] Capacity planning
- [ ] Incident analysis and prevention

---

## Critical Path: Must Complete Before Going Live

1. ✅ Environment variables all configured
2. ✅ SSL certificate installed
3. ✅ Database migrations applied
4. ✅ RLS policies enabled
5. ✅ All tests passing
6. ✅ Build successful
7. ✅ Monitoring configured
8. ✅ Backups enabled
9. ✅ Security headers configured
10. ✅ Email provider configured

**If ANY of above incomplete: DO NOT DEPLOY**

---

## Sign-Off

### Required Sign-Off Before Production

- [ ] **CTO/Tech Lead:** Code quality, architecture, testing
- [ ] **Database Administrator:** Database setup, backups, RLS
- [ ] **Security Lead:** Security verification, headers, secrets
- [ ] **Operations:** Infrastructure, monitoring, incident response
- [ ] **Product Manager:** Feature completeness, business requirements

**All signatures obtained:** Date ___________

---

## Deployment Success Criteria

Deployment is considered successful when:

1. ✅ Application responding to requests
2. ✅ Authentication working
3. ✅ Elections can be created and managed
4. ✅ Voters can submit ballots
5. ✅ Results calculate correctly
6. ✅ Audit logs recording all actions
7. ✅ Email notifications sending
8. ✅ Performance within targets
9. ✅ No security alerts
10. ✅ All users functioning normally

**Deployment Date:** ______________  
**Deployed Version:** ______________  
**Deployed By:** ______________  
**Verified By:** ______________  

---

**Last Updated:** 2026-08-18
