# Phase 15 Registration Payload

## 1. Required Fields

The `POST /api/auth/register` endpoint requires:

- `organizationName`
- `country`
- `timezone`
- `adminName`
- `email`
- `password`

`organizationType` has a default value of `NONPROFIT` when omitted. It is optional in the request schema.

## 2. Optional Fields

The endpoint accepts these optional fields:

- `organizationType`
- `currency`
- `locale`
- `contactEmail`
- `contactPhone`
- `website`
- `firstName`
- `lastName`

`confirmPassword` is used by the registration form's client-side schema, but it is not part of the API schema and is not required by `POST /api/auth/register`.

## 3. Expected Data Types

All accepted fields are JSON strings:

- `organizationName`: string
- `organizationType`: string
- `country`: string
- `timezone`: string
- `currency`: string
- `locale`: string
- `contactEmail`: string
- `contactPhone`: string
- `website`: string
- `adminName`: string
- `firstName`: string
- `lastName`: string
- `email`: string
- `password`: string

The request must be sent as JSON with `Content-Type: application/json`.

## 4. Validation Requirements

The API uses `registerSchema` from `src/lib/validation/auth.ts`:

- `organizationName`: trimmed string, at least 2 characters.
- `organizationType`: trimmed string, at least 2 characters when provided; defaults to `NONPROFIT`.
- `country`: trimmed string, at least 2 characters.
- `timezone`: trimmed string, at least 2 characters.
- `currency`: trimmed string, at least 2 characters when provided.
- `locale`: trimmed string, at least 2 characters when provided.
- `contactEmail`: valid email when provided; an empty string is also accepted.
- `contactPhone`: trimmed string, maximum 32 characters; an empty string is also accepted.
- `website`: trimmed string, maximum 255 characters; an empty string is also accepted. The API schema does not require URL format validation.
- `adminName`: trimmed string, at least 2 characters.
- `firstName`: trimmed string, at least 2 characters when provided.
- `lastName`: trimmed string, at least 2 characters when provided.
- `email`: trimmed, valid email address.
- `password`: at least 8 characters and must contain at least one uppercase letter, one lowercase letter, and one number.

The route returns HTTP 400 for an invalid payload and HTTP 201 when registration succeeds. Registration is rate-limited to 5 attempts per hour per IP according to the route configuration.

The form schema in `src/lib/validation/register.ts` additionally requires `confirmPassword` and checks that it matches `password`, but that client-side field is not required by the API schema. The form also performs stricter website URL validation than the API schema.

## 5. Safe Example Payload

This example uses entirely fake test information. Do not reuse the email or password for a real account:

```json
{
  "organizationName": "Phase 15 Test Organization",
  "organizationType": "NONPROFIT",
  "country": "GH",
  "timezone": "Africa/Accra",
  "currency": "GHS",
  "locale": "en-GH",
  "contactEmail": "phase15-contact@example.test",
  "contactPhone": "+233 20 000 0000",
  "website": "https://phase15.example.test",
  "adminName": "Test Administrator",
  "firstName": "Test",
  "lastName": "Administrator",
  "email": "phase15-admin@example.test",
  "password": "Phase15Test1"
}
```
