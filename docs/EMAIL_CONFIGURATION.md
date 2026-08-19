# Email Configuration

**Complete guide for configuring email notifications in VoteHub production.**

---

## Overview

VoteHub supports multiple email providers:
- **SendGrid** - Premium email delivery service
- **Resend** - Modern email API
- **SMTP** - Self-hosted email server
- **Console Logging** - Development/testing only

Email is used for:
- Invitation acceptance
- Election notifications
- Candidate approval/rejection
- Ballot submission confirmations
- Password reset
- Account notifications

---

## Email Configuration by Provider

### Option 1: SendGrid (Recommended for production)

**Best for:** Reliable email delivery, high volume, good deliverability

#### Setup Steps

1. **Create SendGrid Account**
   - Go to https://sendgrid.com
   - Sign up for free tier or paid plan
   - Verify your sender domain (optional but recommended)

2. **Create API Key**
   - Login to SendGrid dashboard
   - Navigate to: Settings → API Keys
   - Click "Create API Key"
   - Name it: `VoteHub Production`
   - Permissions: Select "Mail Send" only
   - Copy the API key

3. **Configure VoteHub**
   ```bash
   EMAIL_PROVIDER=sendgrid
   EMAIL_API_KEY=SG.your-actual-api-key-here
   EMAIL_FROM=noreply@your-production-domain.com
   ```

4. **Configure Sender Email**
   - In SendGrid: Settings → Sender Authentication
   - Verify your domain or use SendGrid's pre-verified sender
   - Update EMAIL_FROM to verified sender

#### Email Templates (SendGrid)

VoteHub uses dynamic templates. Configure in SendGrid dashboard:
- Invitations
- Election notifications
- Candidate approvals
- Ballot confirmations

---

### Option 2: Resend (Modern alternative)

**Best for:** Simple setup, good developer experience

#### Setup Steps

1. **Create Resend Account**
   - Go to https://resend.com
   - Sign up for free tier
   - Verify your domain

2. **Create API Key**
   - Login to Resend dashboard
   - Navigate to: API Keys
   - Copy your API key

3. **Configure VoteHub**
   ```bash
   EMAIL_PROVIDER=resend
   EMAIL_API_KEY=re_your-actual-api-key-here
   EMAIL_FROM=noreply@your-production-domain.com
   ```

---

### Option 3: SMTP (Self-hosted)

**Best for:** On-premises deployments, cost-conscious operations

#### Setup Steps

1. **Identify SMTP Server**
   - Use existing company mail server, OR
   - Deploy open-source mail server (Postfix, Dovecot), OR
   - Use cloud SMTP relay (AWS SES, Mailgun, etc.)

2. **Configure VoteHub**
   ```bash
   EMAIL_PROVIDER=smtp
   SMTP_HOST=smtp.your-mail-server.com
   SMTP_PORT=587
   SMTP_USER=votehub-user
   SMTP_PASSWORD=your-smtp-password
   EMAIL_FROM=noreply@your-production-domain.com
   ```

3. **Test Connection**
   - Verify firewall allows outbound SMTP
   - Test credentials work
   - Send test email

---

### Option 4: Development/Testing (No Provider)

**For:** Development and testing only

```bash
# Leave EMAIL_PROVIDER empty or unset
EMAIL_PROVIDER=

# Emails will be logged to console instead
```

Console output shows email details:
```
📧 [Email Logging Mode] {
  to: user@example.com,
  subject: Invitation to Election,
  timestamp: 2026-08-18T...
}
```

---

## Production Email Configuration Checklist

### Before Deployment

- [ ] Email provider account created
- [ ] API key generated and tested
- [ ] Sender domain verified
- [ ] EMAIL_PROVIDER set in environment
- [ ] EMAIL_API_KEY configured (secrets manager)
- [ ] EMAIL_FROM set to verified sender
- [ ] Test email sent successfully
- [ ] SPF/DKIM/DMARC configured for domain
- [ ] Backup email provider configured

### Testing

```bash
# Test SendGrid connection
curl -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer $EMAIL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "personalizations": [{
      "to": [{"email": "test@example.com"}]
    }],
    "from": {"email": "noreply@your-domain.com"},
    "subject": "Test",
    "content": [{"type": "text/html", "value": "Test"}]
  }'
```

---

## Email Sending Flow

### In-App Process

1. **Event Triggered**
   - User invites someone
   - Election created/published
   - Candidate approved/rejected

2. **Notification Created**
   - Stored in notifications table
   - User can disable via preferences

3. **Email Sent** (if enabled)
   - Email service called
   - Provider sends email
   - If fails: logged but doesn't block event

4. **Failure Handling**
   - Email failure doesn't break application
   - Event completes successfully
   - Error logged for investigation
   - Admin notified of delivery failures (optional)

---

## Email Templates

### Email Types

#### 1. Invitation Email
```
Subject: You're invited to [Organization Name]
From: noreply@votehub.company.com

Body:
You have been invited to join [Organization Name] in VoteHub.

To accept your invitation, click the link below:
[Invitation Link]

This link expires in 7 days.
```

#### 2. Election Notification
```
Subject: New election: [Election Title]
From: noreply@votehub.company.com

Body:
A new election has been created: [Election Title]

Organization: [Organization Name]
Voting opens: [Start Date/Time]

To view details or cast your ballot, visit:
[Election Link]
```

#### 3. Candidate Approval
```
Subject: Your candidacy was approved
From: noreply@votehub.company.com

Body:
Congratulations! Your candidacy for [Position Name] in [Election Name] has been approved.

View your candidacy:
[Candidate Link]
```

#### 4. Ballot Confirmation
```
Subject: Your ballot was submitted
From: noreply@votehub.company.com

Body:
Your ballot has been successfully submitted for [Election Name].

Your ballot reference: [Reference ID]

For questions, contact: [Support Email]
```

---

## Email Preferences

Users can configure email preferences via dashboard:

```
☑️ Email notifications enabled
├─ ☑️ Invitation notifications
├─ ☑️ Election created
├─ ☐ Election published
├─ ☐ Election opened
├─ ☐ Election closing soon
├─ ☑️ Candidate approved
├─ ☑️ Candidate rejected
└─ ☑️ Ballot submitted
```

---

## Troubleshooting

### "Emails not being sent"

**Check:**
1. EMAIL_PROVIDER is set
2. EMAIL_API_KEY is valid
3. EMAIL_FROM is verified
4. Provider account has credits/quota
5. SMTP server is accessible
6. Firewall allows outbound email

**Debug:**
```bash
# Check environment variables
echo $EMAIL_PROVIDER
echo $EMAIL_API_KEY  # Should show key
echo $EMAIL_FROM
```

### "Emails going to spam"

**Configure SPF/DKIM/DMARC:**
1. Add SPF record to DNS
   ```
   v=spf1 include:sendgrid.net ~all  # For SendGrid
   v=spf1 include:resend.com ~all    # For Resend
   ```

2. Configure DKIM
   - Provider generates DKIM records
   - Add to domain DNS
   - Verify DKIM in provider

3. Configure DMARC
   ```
   v=DMARC1; p=quarantine; rua=mailto:admin@your-domain.com
   ```

### "Email delivery is slow"

**Solutions:**
- Check provider queue
- Verify SMTP server isn't rate limited
- Review firewall logs
- Check network latency
- Consider upgrading email plan

### "Users not receiving emails"

**Check:**
1. Email address is correct
2. User hasn't unsubscribed
3. Email notification preferences enabled
4. Check email provider delivery logs
5. Check spam folder
6. Review provider bounces

---

## Email Rate Limits

### SendGrid
- Free: 100 emails/day
- Pro: 150,000+ emails/month
- Adjust plan based on election size

### Resend
- All plans: High limits
- Per-domain rate limiting: 100 emails/second

### SMTP
- Dependent on your mail server
- Typical: 50-100 emails/minute
- Configure queue for large elections

---

## Monitoring Email Delivery

### What to Monitor

1. **Delivery Rate**
   - Track % emails delivered vs sent
   - Alert if < 95% delivery rate

2. **Bounce Rate**
   - Hard bounces: address doesn't exist
   - Soft bounces: temporary failure
   - Alert if > 2% bounce rate

3. **Complaint Rate**
   - Spam complaints
   - Alert if > 0.1%

4. **Response Time**
   - Email send latency
   - Alert if > 5 seconds

### SendGrid Dashboard
- Provides delivery metrics
- Shows bounces and complaints
- Integration with monitoring tools

### Custom Monitoring
```sql
-- Check email delivery stats
SELECT
  COUNT(*) as total_sent,
  COUNT(CASE WHEN status = 'SENT' THEN 1 END) as delivered,
  COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed
FROM notifications
WHERE channel = 'EMAIL'
  AND created_at > NOW() - INTERVAL '24 hours';
```

---

## Backup Email Provider

For production, configure backup provider:

```javascript
// Pseudocode - implement in email service
if (primaryProvider.failed) {
  try {
    backupProvider.send(email);
  } catch {
    logError("Both providers failed");
  }
}
```

---

## Email Privacy & Compliance

### GDPR Compliance
- [ ] Obtain consent before sending emails
- [ ] Provide easy unsubscribe option
- [ ] Respect user preferences
- [ ] Don't send to deleted accounts

### Email Content
- [ ] Never include passwords in emails
- [ ] Never include voting selections in emails
- [ ] Never include authentication tokens (except in links)
- [ ] Include privacy policy link

### Retention
- Email delivery logs: 30 days minimum
- Bounces/complaints: 1 year minimum
- User preferences: Until account deleted

---

## Security Best Practices

1. **API Key Security**
   - Store in environment variables only
   - Never commit to version control
   - Rotate keys every 90 days
   - Use different keys per environment

2. **SMTP Password Security**
   - Use secrets manager
   - Create user with minimal permissions
   - Rotate password every 90 days

3. **Email Content Security**
   - Validate all variables in templates
   - Escape user input
   - Use HTML encoding
   - Never trust user-provided email addresses

4. **Domain Security**
   - Use SPF/DKIM/DMARC
   - Monitor for domain spoofing
   - Only send from verified domains
   - Implement BIMI (Brand Indicators for Message Identification)

---

## Performance Optimization

### Batch Sending
- Send emails in batches for elections
- Reduces API calls
- Improves throughput

### Template Compilation
- Pre-compile email templates
- Cache template variables
- Reduce template rendering time

### Queue Management
- Use job queue (e.g., Bull, Resque) for email sending
- Allows retries
- Prevents blocking main application
- Handles backpressure

---

## Testing Email in Development

### Development Setup
```bash
# .env.local
EMAIL_PROVIDER=  # Leave empty
```

Emails will log to console:
```
📧 [Email Logging Mode] {
  to: "user@example.com",
  subject: "Invitation",
  timestamp: "2026-08-18T..."
}
```

### Staging Setup
```bash
# Test with real provider
EMAIL_PROVIDER=sendgrid
EMAIL_API_KEY=test-key
EMAIL_FROM=test@staging.domain.com
```

Send test emails to `admin@your-domain.com` to verify formatting.

---

## Disaster Recovery

### Email Provider Outage
- Configure backup provider
- Implement retry logic
- Queue failed emails
- Alert operations team
- Use manual email server if available

### Email Delivery Failure During Election
- Fallback to in-app notifications
- Log error for investigation
- Retry delivery after election ends
- Notify admins of issue
- Send batch emails once provider recovers

---

## Configuration Summary

| Setting | Development | Staging | Production |
|---------|-------------|---------|------------|
| EMAIL_PROVIDER | (empty) | sendgrid | sendgrid |
| EMAIL_API_KEY | N/A | test-key | production-key |
| EMAIL_FROM | N/A | noreply@staging... | noreply@company... |
| Backup Provider | N/A | None | resend |

---

## Support & Troubleshooting

- **SendGrid Docs:** https://docs.sendgrid.com
- **Resend Docs:** https://resend.com/docs
- **SMTP Protocol:** RFC 5321, RFC 5322
- **Email Security:** SPF, DKIM, DMARC
