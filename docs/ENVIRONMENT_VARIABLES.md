# Environment Variables Configuration

**This document describes all environment variables required for VoteHub production deployment.**

---

## Overview

Environment variables are organized into three categories:
1. **PUBLIC** - Safe to expose in browser (NEXT_PUBLIC_* prefix)
2. **SERVER_ONLY** - Never sent to browser
3. **THIRD_PARTY** - Optional external service configuration

---

## PUBLIC VARIABLES (NEXT_PUBLIC_*)

These variables are compiled into the browser bundle. Use only for non-sensitive data.

### NEXT_PUBLIC_SUPABASE_URL
**Type:** String (URL)  
**Required:** Yes  
**Scope:** Browser + Server  
**Example:** `https://my-project.supabase.co`

The public URL of your Supabase project. Used for:
- Client-side authentication
- Direct database queries from browser (filtered by RLS)
- API endpoint for Supabase services

**How to find:**
1. Login to Supabase console (https://supabase.com/dashboard)
2. Select your project
3. Project Settings → API → Project URL

---

### NEXT_PUBLIC_SUPABASE_ANON_KEY
**Type:** String (API Key)  
**Required:** Yes  
**Scope:** Browser + Server  
**Example:** `eyJhbGc...` (long JWT-like string)

The anonymous/public key for Supabase. This key has limited permissions:
- Authentication operations
- Row Level Security policies control data access
- Cannot perform service-role operations

**IMPORTANT:** This key is published in client code. It's intentionally limited in scope.

**How to find:**
1. Supabase console → Project Settings → API
2. Under "Project API keys" section
3. Copy the "anon public" key

---

### NEXT_PUBLIC_APP_URL
**Type:** String (URL)  
**Required:** Yes  
**Scope:** Server-side (used in email links, invitations, etc.)  
**Production Example:** `https://votehub.company.com`  
**Development Example:** `http://localhost:3000`

The public URL of your application. Used in:
- Email notification links
- Invitation acceptance links
- Election participation links
- Password reset links

**Must match:** Your deployment domain and NextAuth callback URLs

---

## SERVER-ONLY VARIABLES

These variables are ONLY available on the server. They are never sent to the browser.

### DATABASE_URL
**Type:** String (PostgreSQL Connection String)  
**Required:** Yes  
**Scope:** Server only  
**Format:** `postgresql://[user]:[password]@[host]:[port]/[database]`

Connection string for PostgreSQL database.

**Example for Supabase:**
```
postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres
```

**How to find (Supabase):**
1. Project Settings → Database → Connection string
2. Select "Postgres" tab
3. Copy the connection string
4. Replace `[YOUR-PASSWORD]` with your actual database password

**Security Note:**
- Never commit this to version control
- Use environment variable management in production
- Database passwords must be strong and unique

---

### SUPABASE_URL
**Type:** String (URL)  
**Required:** Yes  
**Scope:** Server only  
**Example:** `https://my-project.supabase.co`

Server-side Supabase project URL. Usually same as NEXT_PUBLIC_SUPABASE_URL.

---

### SUPABASE_ANON_KEY
**Type:** String (API Key)  
**Required:** Yes  
**Scope:** Server only  
**Example:** `eyJhbGc...`

Server-side anonymous key. Usually same as NEXT_PUBLIC_SUPABASE_ANON_KEY.

---

### SUPABASE_SERVICE_ROLE_KEY
**Type:** String (API Key)  
**Required:** Yes  
**Scope:** Server only ONLY  
**Example:** `eyJhbGc...` (different from anon key)

**🔒 CRITICAL SECURITY:**
- This key has FULL permissions to database
- Bypasses Row Level Security policies
- Must NEVER be exposed to client
- Use only for trusted server-side operations

**How to find:**
1. Supabase console → Project Settings → API
2. Under "Project API keys" section
3. Copy the "service_role" key (has red warning icon)

**Use Cases:**
- Creating users during registration
- Batch operations
- System maintenance operations
- Auth system operations

---

### NEXTAUTH_URL
**Type:** String (URL)  
**Required:** Yes  
**Scope:** Server only  
**Production Example:** `https://votehub.company.com`  
**Development Example:** `http://localhost:3000`

The URL where your NextAuth instance is running. Used for:
- OAuth redirect URIs
- Session callback validation
- JWT verification

**MUST match** your deployment URL and auth provider callback URLs.

---

### NEXTAUTH_SECRET
**Type:** String (Random)  
**Required:** Yes  
**Scope:** Server only  
**Example:** `n8j9k0l1m2n3o4p5q6r7s8t9u0v1w2x3y4z5a6b`

Secret key for signing NextAuth tokens and encrypting sessions.

**Generation (run in terminal):**
```bash
openssl rand -base64 32
```

**Security Requirements:**
- Minimum 32 characters
- Should be cryptographically random
- Must be unique per environment
- If compromised, regenerate and all sessions invalidate

---

## THIRD-PARTY VARIABLES (Optional)

These variables configure optional external services.

### RATE_LIMIT_BACKEND
**Type:** String (`memory` or `upstash`)  
**Required:** Yes in production  
**Scope:** Server only

Selects the rate-limit storage backend. Use `memory` only for local development. Production must use `upstash`; the application does not silently fall back to process-local memory in production.

### UPSTASH_REDIS_REST_URL
**Type:** String (HTTPS URL)  
**Required:** When `RATE_LIMIT_BACKEND=upstash`  
**Scope:** Server only

The Upstash Redis REST endpoint used for shared atomic rate-limit counters.

### UPSTASH_REDIS_REST_TOKEN
**Type:** String (secret token)  
**Required:** When `RATE_LIMIT_BACKEND=upstash`  
**Scope:** Server only

The server-only Upstash REST token. Never expose it through a `NEXT_PUBLIC_*` variable or client bundle.

### EMAIL_PROVIDER
**Type:** String (enum)  
**Required:** No (defaults to console logging)  
**Scope:** Server only  
**Valid Values:** `sendgrid`, `resend`, `smtp`, or leave empty

Email provider to use for notifications, invitations, and password resets.

**Options:**
- `sendgrid` - SendGrid email service
- `resend` - Resend email service
- `smtp` - Self-hosted SMTP server
- Empty/undefined - Console logging (development only)

---

### EMAIL_API_KEY
**Type:** String (API Key)  
**Required:** If EMAIL_PROVIDER is `sendgrid` or `resend`  
**Scope:** Server only

API key for email provider.

**For SendGrid:**
1. Login to SendGrid dashboard
2. Settings → API Keys
3. Create new API Key with "Mail Send" permission
4. Copy key

**For Resend:**
1. Login to Resend dashboard
2. API Keys section
3. Copy your API key

---

### EMAIL_FROM
**Type:** String (Email Address)  
**Required:** If EMAIL_PROVIDER is configured  
**Scope:** Server only  
**Example:** `noreply@votehub.company.com`

The "From" email address for notifications and automated emails.

**Requirements:**
- Must be a valid email address
- Should match your domain
- For SendGrid/Resend: must be verified sender
- For SMTP: must be allowed by SMTP server

**Best Practices:**
- Use `noreply@your-domain.com`
- Configure DKIM/SPF for domain authentication
- Set Reply-To address if different

---

### SMTP_HOST
**Type:** String (Hostname)  
**Required:** If EMAIL_PROVIDER is `smtp`  
**Scope:** Server only  
**Example:** `smtp.gmail.com` or `mail.company.com`

SMTP server hostname.

---

### SMTP_PORT
**Type:** Number  
**Required:** If EMAIL_PROVIDER is `smtp`  
**Scope:** Server only  
**Valid Values:** `25`, `465` (SSL), `587` (TLS)  
**Recommended:** `587` (TLS)

SMTP server port.

---

### SMTP_USER
**Type:** String  
**Required:** If EMAIL_PROVIDER is `smtp`  
**Scope:** Server only

SMTP authentication username.

---

### SMTP_PASSWORD
**Type:** String  
**Required:** If EMAIL_PROVIDER is `smtp`  
**Scope:** Server only  

SMTP authentication password.

**Security:** Never commit to version control

---

## APPLICATION VARIABLES

### NODE_ENV
**Type:** String (enum)  
**Required:** Yes  
**Scope:** Server + Build time  
**Valid Values:** `development`, `production`

Sets Node.js environment mode.

**Effects:**
- `production`: Optimizations enabled, error details hidden
- `development`: Full logging, development features enabled

---

### APP_VERSION
**Type:** String (Semantic Version)  
**Required:** No  
**Scope:** Server only  
**Example:** `1.0.0`

Application version number. Used in:
- System health endpoint
- Logging
- Release identification

---

## Environment Variable Categories Summary

| Variable | Category | Required | Scope | Purpose |
|----------|----------|----------|-------|---------|
| NEXT_PUBLIC_SUPABASE_URL | Auth | Yes | Both | Supabase project URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Auth | Yes | Both | Public API key |
| NEXT_PUBLIC_APP_URL | App | Yes | Server-side use | Application domain |
| DATABASE_URL | Database | Yes | Server | DB connection |
| SUPABASE_URL | Auth | Yes | Server | Supabase URL (server) |
| SUPABASE_ANON_KEY | Auth | Yes | Server | Anon key (server) |
| SUPABASE_SERVICE_ROLE_KEY | Auth | Yes | Server | Service role key 🔒 |
| NEXTAUTH_URL | Auth | Yes | Server | NextAuth domain |
| NEXTAUTH_SECRET | Auth | Yes | Server | Session encryption 🔒 |
| EMAIL_PROVIDER | Optional | No | Server | Email service |
| EMAIL_API_KEY | Optional | No | Server | Email provider key 🔒 |
| EMAIL_FROM | Optional | No | Server | Sender email |
| SMTP_* | Optional | No | Server | SMTP config 🔒 |
| NODE_ENV | App | Yes | Server | Environment mode |
| APP_VERSION | App | No | Server | Version number |

---

## Configuration Checklist

### Development Environment
```bash
# .env.local (development only, not committed)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=development-secret-key
EMAIL_PROVIDER=  # Empty for console logging
NODE_ENV=development
```

### Staging Environment
```bash
# .env.staging (staging server)
NEXT_PUBLIC_SUPABASE_URL=https://staging-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[staging-anon-key]
NEXT_PUBLIC_APP_URL=https://staging.votehub.company.com
DATABASE_URL=postgresql://...@db.staging.supabase.co:5432/postgres
SUPABASE_URL=https://staging-project.supabase.co
SUPABASE_ANON_KEY=[staging-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[staging-service-role]
NEXTAUTH_URL=https://staging.votehub.company.com
NEXTAUTH_SECRET=[random-staging-secret]
EMAIL_PROVIDER=sendgrid  # or test provider
EMAIL_API_KEY=[test-key]
EMAIL_FROM=noreply@staging.votehub.company.com
NODE_ENV=production
```

### Production Environment
```bash
# Production variables (managed by deployment platform)
NEXT_PUBLIC_SUPABASE_URL=https://production-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[production-anon-key]
NEXT_PUBLIC_APP_URL=https://votehub.company.com
DATABASE_URL=postgresql://...@db.production.supabase.co:5432/postgres
SUPABASE_URL=https://production-project.supabase.co
SUPABASE_ANON_KEY=[production-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[production-service-role-key]
NEXTAUTH_URL=https://votehub.company.com
NEXTAUTH_SECRET=[random-production-secret]
EMAIL_PROVIDER=sendgrid  # or resend/smtp
EMAIL_API_KEY=[production-email-key]
EMAIL_FROM=noreply@votehub.company.com
NODE_ENV=production
APP_VERSION=1.0.0
```

---

## Security Best Practices

1. **Never commit secrets to Git**
   - Use .env files (ignored by .gitignore)
   - Use deployment platform environment variables
   - Use secret management services (AWS Secrets Manager, etc.)

2. **Rotate secrets regularly**
   - API keys every 90 days
   - Database passwords annually or on access
   - NEXTAUTH_SECRET if potentially compromised

3. **Use separate values per environment**
   - Development: relaxed, can use test values
   - Staging: separate credentials, monitor closely
   - Production: strict access control, highly secured

4. **Audit secret access**
   - Monitor who can read variables
   - Log access to sensitive variables
   - Alert on unauthorized access attempts

5. **Public variables are SAFE**
   - NEXT_PUBLIC_* variables appear in browser
   - Supabase anon key is intentionally public
   - Security comes from Row Level Security policies, not key secrecy

---

## Troubleshooting

### "Missing environment variable X"
- Check .env file exists
- Verify variable name spelling
- Ensure NEXT_PUBLIC_* prefix for public variables
- Restart Next.js dev server after .env changes

### "Cannot connect to database"
- Verify DATABASE_URL format
- Confirm database is running
- Check credentials
- Verify firewall allows connections

### "Emails not sending"
- Verify EMAIL_PROVIDER is set
- Confirm EMAIL_API_KEY is valid
- Check EMAIL_FROM is verified
- Review email service rate limits

### "NextAuth not working"
- Ensure NEXTAUTH_SECRET is set
- Verify NEXTAUTH_URL matches deployment domain
- Check auth provider callback URLs
- Confirm SUPABASE_* variables configured

---

## References

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Supabase API Keys](https://supabase.com/docs/guides/api/rest/auth)
- [NextAuth Configuration](https://next-auth.js.org/configuration/initialization)
- [.env.example](../.env.example) - Reference file
