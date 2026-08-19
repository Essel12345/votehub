# Super Admin System Documentation

## Overview

The Super Admin system is a comprehensive platform management interface that allows Super Admins to oversee and manage the entire VoteHub platform. This includes organization management, user administration, security monitoring, audit logging, and system health checks.

## Architecture

### Authorization Model

The Super Admin system uses a role-based authorization model with the following hierarchy:

```
SUPER_ADMIN (Platform-level access)
├─ Full platform access
├─ Can manage organizations
├─ Can manage all users
├─ Can view all audit logs
└─ Can access security center

ORGANIZATION_ADMIN (Organization-level access)
├─ Limited to own organization
├─ Can manage org members
├─ Can create/edit elections
└─ Cannot access platform-level admin

ELECTION_OFFICER, CANDIDATE, VOTER
└─ No admin access
```

### Database Schema

**organizations table**
- `id` (UUID) - Primary key
- `name` (string) - Organization name
- `description` (string) - Description
- `status` (enum) - ACTIVE, PENDING, SUSPENDED
- `created_at` (timestamp)
- `updated_at` (timestamp)

**profiles table**
- `id` (UUID) - User ID from auth
- `role` (string) - SUPER_ADMIN, ORGANIZATION_ADMIN, etc
- `organization_id` (UUID, nullable) - For org-scoped roles
- `full_name` (string)
- `email` (string)
- `is_active` (boolean)

**audit_logs table**
- `id` (UUID)
- `actor_id` (UUID) - Who performed the action
- `action` (string) - What action was taken
- `entity_type` (string) - What was affected
- `entity_id` (string) - Which entity
- `metadata` (JSONB) - Additional details
- `created_at` (timestamp)

**organization_suspension_audit table**
- Tracks organization suspensions/reactivations
- Records actor, reason, timestamp

**user_role_audit table**
- Tracks role changes for audit trail
- Records old/new role, reason, changed_by

### Security Policies

All admin operations enforce the following security principles:

1. **Server-Side Authorization**
   - All APIs call `requireSuperAdmin()` at entry point
   - Authorization validated from database, never client-provided
   - Returns 401 Unauthorized or 403 Forbidden on failure

2. **Multi-Tenant Isolation**
   - RLS (Row Level Security) policies prevent cross-org access
   - Even compromised token cannot access another org's data
   - All queries filtered by `auth.uid()` at database level

3. **Audit Trail**
   - ALL sensitive operations logged to audit_logs
   - Cannot be edited or deleted
   - Includes actor, action, entity, and metadata
   - Retained for compliance and investigation

4. **Secret Handling**
   - No API keys, passwords, or secrets ever returned
   - System health endpoint masks sensitive config
   - Only safe settings exposed in settings page

5. **Organization Suspension**
   - Prevents restricted operations:
     - Creating elections
     - Opening elections
     - Adding voters
     - Changing organization admins
   - Enforced at database and API level
   - Clear UI indication for suspended orgs

## Pages and Features

### Dashboard (/admin)
Main entry point showing:
- **Statistics**
  - Total organizations (active, pending, suspended)
  - Total users (by role)
  - Total elections (by status)
  - Voting activity (voters, ballots, turnout)
- **Recent Activity** - Last 3 platform events
- **Quick Actions** - Links to manage orgs, users, security, settings
- **System Status** - Database, auth, email, storage health

### Organizations (/admin/organizations)
List all organizations with:
- Organization name and description
- Current status (ACTIVE, SUSPENDED, PENDING)
- Member count
- Election count
- Search by name
- Filter by status
- View detailed organization page

**Organization Detail** (/admin/organizations/[id])
- Organization info and status
- Suspend/Reactivate with reason
- List of organization admins
- Full member roster by role
- Statistics: members, admins, elections

### Users (/admin/users)
List all platform users with:
- Email and full name
- Current role
- Organization (if org-scoped)
- Status (active/inactive)
- Search by email or name
- Filter by role
- Filter by organization
- View detailed user page

**User Detail** (/admin/users/[id])
- User profile information
- Current role and organization
- Change role with:
  - New role selection
  - Reason for change (required)
  - Organization selection (for ORGANIZATION_ADMIN)
- Role change history
- Recent activity log

### Elections (/admin/elections)
View all platform elections with:
- Election title
- Organization
- Status (DRAFT, PUBLISHED, OPEN, CLOSED)
- Voter count
- Ballot count
- Scheduled dates
- Search by title
- Filter by status
- Filter by organization

### Security Center (/admin/security)
Monitor security events including:
- Organization suspensions
- User role changes
- Suspicious access patterns
- Events classified by severity (CRITICAL, WARNING)
- Event details and actor information
- Real-time monitoring

### Audit Logs (/admin/audit-logs)
Complete platform audit trail:
- Timestamp of every action
- Actor (who performed it)
- Action type
- Entity affected
- Detailed metadata
- Filter by action type
- Append-only (cannot be modified)
- Full compliance trail

### System Health (/admin/system-health)
Monitor critical services:
- **Database** - Connection status
- **Auth** - Supabase auth connectivity
- **Email** - Provider configuration status
- **Overall Status** - Healthy, degraded, or down
- Service uptime tracking
- System information (version, environment, uptime)

### Settings (/admin/settings)
Configure platform settings:
- Platform name
- Support email address
- Maintenance mode toggle
- Platform limits (max orgs, max users per org)
- All changes logged to audit trail

## API Endpoints

### Dashboard
- `GET /api/admin/dashboard/stats` - Platform statistics

### Organizations
- `GET /api/admin/organizations` - List organizations
- `GET /api/admin/organizations/[id]` - Organization details
- `POST /api/admin/organizations/[id]/suspend` - Suspend organization
- `POST /api/admin/organizations/[id]/reactivate` - Reactivate organization

### Users
- `GET /api/admin/users` - List users
- `GET /api/admin/users/[id]` - User details
- `POST /api/admin/users/[id]/role` - Change user role

### Audit & Monitoring
- `GET /api/admin/audit-logs` - Platform audit logs
- `GET /api/admin/security/events` - Security events
- `GET /api/admin/system-health` - System health status

## Implementation Patterns

### Authorization Service Usage

```typescript
import { requireSuperAdmin } from "@/lib/security/super-admin.service";

// In any API endpoint or server component:
const superAdmin = await requireSuperAdmin();
// superAdmin: { userId, email, role, profile }

// If not Super Admin, throws "Unauthorized" or "Forbidden"
// Return 401 or 403 status respectively
```

### Audit Logging

```typescript
const supabase = await createClient();

await supabase.from("audit_logs").insert({
  actor_id: superAdmin.userId,
  action: "ADMIN_ACTION_NAME",
  entity_type: "entity_type",
  entity_id: entity.id,
  user_role: "SUPER_ADMIN",
  metadata: { /* additional details */ },
});
```

### Organization Suspension

```typescript
// Suspend
await supabase
  .from("organizations")
  .update({ status: "SUSPENDED" })
  .eq("id", organizationId);

// RLS policies automatically prevent:
// - Creating new elections
// - Opening elections
// - Adding voters
// - Changing admins
```

## Security Limitations

### What Super Admins Cannot Do
- **Cannot modify ballot selections** - Voting integrity protected
- **Cannot view user passwords** - Not stored in plaintext
- **Cannot export PII bulk data** - Data protection compliance
- **Cannot bypass election rules** - Business logic enforced at app level

### What Is Protected
- **Audit logs** - Append-only, cannot be deleted
- **Ballot data** - Cannot be retroactively modified
- **Voter privacy** - Voter-ballot linkage encrypted
- **Cryptographic proofs** - Cannot be forged

## Monitoring and Alerts

### Key Metrics to Monitor
1. **Failed Login Attempts** - More than 5 in 5 minutes
2. **Role Changes** - Especially to SUPER_ADMIN
3. **Organization Suspensions** - Unusual activity
4. **System Health** - Database, auth, email availability

### Audit Log Review
- Review security events daily
- Investigate unusual role changes
- Track organization suspensions
- Monitor failed access attempts

## Troubleshooting

### Organization Cannot Suspend
- Check organization exists: `SELECT * FROM organizations WHERE id = ?`
- Verify Super Admin role: Check profiles table
- Check RLS policies are enabled: `SELECT * FROM pg_policies`

### User Role Change Not Working
- Verify reason is provided (required field)
- For ORGANIZATION_ADMIN, verify organization_id provided
- Check audit_logs for error details
- Verify user exists: `SELECT * FROM profiles WHERE id = ?`

### Audit Logs Empty
- Check logs are being written in APIs
- Verify actor_id is not null
- Check for database errors in server logs

## Best Practices

1. **Regular Audits** - Review audit logs weekly for suspicious activity
2. **Role Minimization** - Only assign Super Admin when necessary
3. **Reason Documentation** - Always provide reason for sensitive actions
4. **Incident Response** - Suspend organizations immediately if compromised
5. **Backup & Recovery** - Maintain database backups for data recovery
6. **Monitoring** - Set up alerts for failed logins and role changes
7. **Logging** - Retain audit logs for at least 2 years

## Compliance Notes

This implementation supports:
- **SOC 2 Type II** - Full audit trail
- **GDPR** - User data management and deletion
- **HIPAA** - Access controls and logging
- **PCI DSS** - No sensitive data exposure

All sensitive operations are logged with:
- Timestamp
- Actor identification
- Action performed
- Entity affected
- Reason provided
- Change details (before/after)
