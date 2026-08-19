# VoteHub Final Production Checklist

This checklist is a sign-off record. An unchecked critical item blocks deployment.

## Release Gates

- [ ] Build passes: `npm run build`
- [ ] Typecheck passes: `npm run typecheck`
- [ ] Lint passes: `npm run lint`
- [ ] Automated tests pass: `npm test`
- [ ] No secrets are tracked or present in source
- [ ] Production branch and release commit are approved

## Production Configuration

- [ ] Production domain and HTTPS certificate verified
- [ ] Exact application environment variables configured in the platform
- [ ] Server-only variables are not exposed to browser code
- [ ] Supabase Auth site URL and redirect URLs use the production domain
- [ ] Email provider, sender, templates, and links verified without contacting real users
- [ ] Storage buckets and policies verified for organization isolation

## Database and Security

- [ ] Production backup exists and its availability is verified
- [ ] Pending migrations reviewed and tested
- [ ] `npx prisma migrate status` verified against the production database
- [ ] RLS enabled and cross-organization access denied
- [ ] Voter, candidate, ballot, and administration access boundaries tested
- [ ] Duplicate-vote database protection verified
- [ ] Rate limiting verified for login, ballot, voter lookup, admin, invitation, and Super Admin flows
- [ ] `429` responses and `Retry-After` headers verified
- [ ] CSP, HSTS, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy verified
- [ ] `/api/health` returns safe operational information

## Deployment and Smoke Test

- [ ] Platform build/install/start settings verified
- [ ] Application deployed only after all critical gates pass
- [ ] Homepage and login verified
- [ ] Registration and organization creation verified
- [ ] Election, position, candidate, and voter workflows verified
- [ ] Voting, duplicate-vote prevention, closing, results, notifications, and audit logs verified
- [ ] Super Admin access verified
- [ ] Two-organization isolation smoke test passed
- [ ] Desktop, tablet, and mobile ballot checks passed
- [ ] Logs and monitoring contain no passwords, tokens, keys, ballot selections, or unnecessary voter data
- [ ] Rollback procedure approved: `docs/PRODUCTION_ROLLBACK.md`

## Current Sign-Off

- Deployment status: **BLOCKED**
- Blocking evidence: see `docs/PHASE_15_DEPLOYMENT_REPORT.md`
- Production URL: not configured
- Deployment platform: Vercel is referenced by the repository, but no project is configured locally