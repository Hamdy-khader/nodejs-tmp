# API Reference — Treatly Online

**Base URL:** `https://backend.treatlyonline.de/api`  
**Source:** `src/lib/admin/api.ts`

---

## Authentication & Auth Guard

### Token Storage
| Store key | Where | Scope |
|-----------|-------|-------|
| `bp_clinic_token` | `localStorage` | All `/clinic/*` requests |
| `bp_admin_token` | `localStorage` | All `/admin/*` requests |

### Auth Guard (Frontend — `src/routes/__root.tsx`)
- Every route (except `/login`, `/clinic/login`, `/admin/login`) requires a valid token.
- If no token → **automatic redirect** to `/login` (clinic) or `/admin/login` (admin).
- Token state is **reactive**: clearing the token dispatches `auth:changed` event and triggers an immediate re-render + redirect.

### 401 Auto-Redirect (`src/lib/admin/api.ts`)
Any API response with **HTTP 401** will:
1. Clear the appropriate token from localStorage.
2. Redirect `window.location.href` → `/login` or `/admin/login`.
3. Full page reload (clears all in-memory store state).

### Logout
- Clinic: `POST /clinic/logout` → clears `bp_clinic_token` → `window.location.href = '/login'`
- Admin: `POST /admin/logout` → clears `bp_admin_token` → `window.location.href = '/admin/login'`
- Full page reload on logout ensures no data leakage between sessions.

### All protected requests require:
```
Authorization: Bearer {token}
Accept: application/json
```

Login endpoints use `Content-Type: application/x-www-form-urlencoded`.

---

## 1. Admin Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/admin/login` | Admin login → returns `{ token, admin }` |
| POST | `/admin/logout` | Invalidate admin session |
| GET | `/admin/me` | Get current admin user |

### POST `/admin/login`
**Body (form-encoded):**
```
email=...&password=...
```
**Response:**
```json
{
  "token": "string",
  "admin": {
    "id": 1,
    "name": "string",
    "email": "string",
    "status": "string",
    "created_at": "ISO8601"
  }
}
```

---

## 2. Clinic Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/clinic/login` | Clinic user login → returns `{ token, clinic_user, clinic }` |
| POST | `/clinic/logout` | Invalidate clinic session |
| GET | `/clinic/me` | Get current clinic user + clinic info |

### POST `/clinic/login`
**Body (form-encoded):**
```
email=...&password=...
```
**Response:**
```json
{
  "token": "string",
  "clinic_user": { ...ClinicUser },
  "clinic": { ...Clinic }
}
```

---

## 3. Clinics (Admin)

> Requires Admin token.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/clinics` | List clinics (paginated) |
| POST | `/admin/clinics` | Create clinic |
| GET | `/admin/clinics/{id}` | Get clinic by ID |
| PUT | `/admin/clinics/{id}` | Update clinic |
| DELETE | `/admin/clinics/{id}` | Delete clinic |
| PATCH | `/admin/clinics/{id}/suspend` | Suspend clinic |
| PATCH | `/admin/clinics/{id}/activate` | Activate clinic |

### GET `/admin/clinics`
**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Search by name / email |
| `status` | `active` \| `suspended` | Filter by status |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page |

**Response:** `PaginatedResponse<Clinic>`

### Clinic Object
```json
{
  "id": 1,
  "name": "string",
  "email": "string",
  "phone": "string|null",
  "country": "string|null",
  "city": "string|null",
  "address": "string|null",
  "website_url": "string|null",
  "logo": "string|null",
  "contact_person_name": "string|null",
  "contact_person_phone": "string|null",
  "status": "active|suspended",
  "notes": "string|null",
  "users_count": 0,
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

---

## 4. Clinic Users (Admin View)

> Requires Admin token.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/clinics/{clinicId}/users` | List users of a clinic |
| POST | `/admin/clinics/{clinicId}/users` | Create user in a clinic |
| GET | `/admin/clinic-users/{id}` | Get user by ID |
| PUT | `/admin/clinic-users/{id}` | Update user |
| DELETE | `/admin/clinic-users/{id}` | Delete user |
| PATCH | `/admin/clinic-users/{id}/activate` | Activate user |
| PATCH | `/admin/clinic-users/{id}/deactivate` | Deactivate user |

### GET `/admin/clinics/{clinicId}/users`
**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Search |
| `status` | `active` \| `inactive` | Filter by status |
| `role` | string | Filter by role |
| `page` | number | Page number |
| `limit` | number | Items per page |

---

## 5. Admin Dashboard

> Requires Admin token.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/stats` | Get dashboard statistics |

**Response:**
```json
{
  "totalClinics": 0,
  "activeClinics": 0,
  "suspendedClinics": 0,
  "totalClinicUsers": 0,
  "newClinicsThisMonth": 0
}
```
> Backend may return snake_case (`total_clinics`) — client normalizes both.

---

## 6. Patients

> Requires Clinic token.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/clinic/patients` | List patients (paginated) |
| POST | `/clinic/patients` | Create patient |
| GET | `/clinic/patients/{id}` | Get patient by ID |
| PUT | `/clinic/patients/{id}` | Update patient |
| DELETE | `/clinic/patients/{id}` | Delete patient |

### GET `/clinic/patients`
**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Search by name / email / phone |
| `page` | number | Page number |
| `limit` | number | Items per page |
| `sort` | `created_at` \| `name` | Sort field |
| `order` | `asc` \| `desc` | Sort direction |

### Patient Object
```json
{
  "id": "string",
  "name": "string",
  "email": "string|null",
  "phone": "string|null",
  "date_of_birth": "YYYY-MM-DD|null",
  "language": "string|null",
  "currency": "string|null",
  "created_at": "ISO8601"
}
```

### POST/PUT Body
```json
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "date_of_birth": "YYYY-MM-DD"
}
```

---

## 7. Treatment Plans

> Requires Clinic token. Plans are scoped to a patient.

### Plan CRUD

| Method | Path | Description |
|--------|------|-------------|
| GET | `/clinic/patients/{patientId}/plans` | List all plans for patient |
| POST | `/clinic/patients/{patientId}/plans` | Create plan |
| GET | `/clinic/patients/{patientId}/plans/{planId}` | Get full plan |
| PUT | `/clinic/patients/{patientId}/plans/{planId}` | Update plan metadata |
| DELETE | `/clinic/patients/{patientId}/plans/{planId}` | Delete plan |

### Plan Object
```json
{
  "id": "string",
  "patient_id": "string",
  "name": "string",
  "notes": "string",
  "teeth": { "18": { "number": 18, "status": "intact", "note": "...", "diagnosis": [] } },
  "xrays": ["base64 or url"],
  "general_statuses": ["string"],
  "billing_mode": "insurance|payment",
  "insurance": { "unused_max": 0, "deductible": 0 },
  "payment_plan": { "amount": 0, "term": 0, "interest": 0 },
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

### Tooth Status Values
`intact` | `missing` | `caries` | `filled` | `crown` | `root-treated` | `implant` | `bridge`

---

### Teeth Management

| Method | Path | Description |
|--------|------|-------------|
| PUT | `/clinic/plans/{planId}/teeth` | Save all teeth states (batch) |
| PATCH | `/clinic/plans/{planId}/teeth/{toothNumber}` | Update single tooth |

**PUT body:**
```json
{
  "teeth": [
    { "number": 18, "status": "intact", "note": "string", "diagnosis": [] }
  ]
}
```

---

### X-Ray Management

| Method | Path | Description |
|--------|------|-------------|
| POST | `/clinic/plans/{planId}/xrays` | Add X-ray |
| DELETE | `/clinic/plans/{planId}/xrays/{xrayId}` | Delete X-ray |

---

### General Statuses

| Method | Path | Description |
|--------|------|-------------|
| PUT | `/clinic/plans/{planId}/general-statuses` | Set general statuses (replaces all) |

**Body:**
```json
{
  "items": [{ "label": "string" }]
}
```

---

### Treatment Rows

| Method | Path | Description |
|--------|------|-------------|
| PUT | `/clinic/plans/{planId}/rows` | Save all rows (batch replace) |
| POST | `/clinic/plans/{planId}/rows` | Create a row |
| PATCH | `/clinic/plans/{planId}/rows/{rowId}` | Update a row |
| DELETE | `/clinic/plans/{planId}/rows/{rowId}` | Delete a row |

**Row types:**
```json
{ "kind": "visit",   "label": "string", "note": "string", "items": [] }
{ "kind": "healing", "label": "string", "note": "string", "days": 7 }
{ "kind": "discount","note": "string",  "mode": "amount|percent", "value": 100 }
```

---

### Treatment Items (inside Rows)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/clinic/plans/{planId}/rows/{rowId}/items` | Create item in row |
| PATCH | `/clinic/plans/{planId}/rows/{rowId}/items/{itemId}` | Update item |
| DELETE | `/clinic/plans/{planId}/rows/{rowId}/items/{itemId}` | Delete item |

**Item Object:**
```json
{
  "id": "string",
  "name": "string",
  "tooth_number": 18,
  "amount": 1,
  "unit_price": 150.00
}
```

---

## 8. Documents (Document Presets)

> Requires Clinic token. One preset config per clinic.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/clinic/document-presets` | Get clinic document presets |
| PUT | `/clinic/document-presets` | Save document presets |
| POST | `/clinic/document-presets/reset` | Reset to factory defaults |

### Document Sections
`clinic` | `opg` | `diagnosis` | `treatments` | `other`

### GET/PUT Body Shape
```json
{
  "selected_ids": ["fixed:clinic:demo", "fixed:diagnosis:note"],
  "order": {
    "clinic":     ["id1", "id2"],
    "opg":        [],
    "diagnosis":  ["id3"],
    "treatments": [],
    "other":      ["id4"]
  }
}
```

---

## 9. Users (Clinic Internal)

> Requires Clinic token.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/clinic/users` | List clinic users |
| POST | `/clinic/users` | Create user |
| GET | `/clinic/users/{id}` | Get user by ID |
| PUT | `/clinic/users/{id}` | Update user |
| DELETE | `/clinic/users/{id}` | Delete user |
| POST | `/clinic/users/bulk-status` | Bulk update status |
| POST | `/clinic/users/bulk-role` | Bulk update role |
| POST | `/clinic/users/{id}/reset-password` | Send reset password email |

### GET `/clinic/users`
**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Search by name / email |
| `role` | string | Filter by role key |
| `status` | `active` \| `inactive` \| `suspended` | Filter by status |
| `branch` | string | Filter by branch name |
| `page` | number | Page number |
| `limit` | number | Items per page |

### User Object
```json
{
  "id": "string",
  "first_name": "string",
  "last_name": "string",
  "email": "string",
  "phone": "string",
  "avatar_url": "string|null",
  "role": "dentist|admin|receptionist|...",
  "status": "active|inactive|suspended",
  "branch": "string",
  "department": "string|null",
  "specialty": "string|null",
  "license_number": "string|null",
  "experience_years": 0,
  "gender": "male|female|other|null",
  "dob": "YYYY-MM-DD|null",
  "working_hours": "string|null",
  "calendar_color": "#hex|null",
  "last_login": "ISO8601|null",
  "created_at": "ISO8601",
  "notes": "string|null",
  "tags": ["string"],
  "two_factor": false,
  "online": false
}
```

### Role Keys
`super_admin` | `admin` | `dentist` | `assistant` | `receptionist` | `accountant` | `lab_technician` | `viewer`

### POST `/clinic/users/bulk-status`
```json
{ "user_ids": ["id1", "id2"], "status": "active|inactive|suspended" }
```

### POST `/clinic/users/bulk-role`
```json
{ "user_ids": ["id1", "id2"], "role": "dentist" }
```

---

## 10. Roles

> Requires Clinic token.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/clinic/roles` | List all roles |
| POST | `/clinic/roles` | Create custom role |
| PUT | `/clinic/roles/{roleKey}` | Update role |
| DELETE | `/clinic/roles/{roleKey}` | Delete role |

### Role Object
```json
{
  "key": "string",
  "name": "string",
  "description": "string",
  "color": "#hex",
  "built_in": false,
  "permissions": ["permission_key"]
}
```

---

## 11. Permissions

> Requires Clinic token.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/clinic/permissions` | List all available permissions |

### Permission Object
```json
{
  "key": "string",
  "group": "string",
  "label": "string"
}
```

---

## 12. Audit Logs

> Requires Clinic token.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/clinic/audit-logs` | List audit log entries |

### GET `/clinic/audit-logs`
**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `actor` | string | Filter by actor name |
| `action` | string | Filter by action type |
| `from` | ISO8601 | Start date |
| `to` | ISO8601 | End date |
| `page` | number | Page number |
| `limit` | number | Items per page |

### AuditLog Object
```json
{
  "id": "string",
  "at": "ISO8601",
  "actor": "string",
  "action": "string",
  "target": "string|null",
  "details": "string|null"
}
```

---

## 13. Plan Settings

> Requires Clinic token. One config per clinic.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/clinic/plan-settings` | Get plan print/display settings |
| PUT | `/clinic/plan-settings` | Update plan settings |

---

## 14. Pricelist

> Requires Clinic token.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/clinic/pricelist` | Get full pricelist with sections |
| PUT | `/clinic/pricelist` | Save entire pricelist (batch replace) |
| POST | `/clinic/pricelist/items` | Add new price item |
| PATCH | `/clinic/pricelist/items/{id}` | Update price item |
| DELETE | `/clinic/pricelist/items/{id}` | Delete price item |

### Pricelist Structure
```json
{
  "settings": {
    "language": "de",
    "currency_code": "EUR",
    "currency_label": "Euro",
    "currency_symbol": "€"
  },
  "sections": [
    {
      "id": "string",
      "n": 1,
      "label": "string",
      "icon": "string",
      "groups": [
        {
          "id": "string",
          "title": "string",
          "price_label": "string|null",
          "items": [
            { "id": "string", "name": "string", "price": 100.00, "note": "string" }
          ]
        }
      ]
    }
  ]
}
```

### POST `/clinic/pricelist/items`
```json
{
  "group_id": "string",
  "name": "string",
  "price": 150.00,
  "note": "string"
}
```

---

## 15. Templates

> Requires Clinic token.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/clinic/templates` | List templates |
| POST | `/clinic/templates` | Create template |
| GET | `/clinic/templates/{id}` | Get template by ID |
| PUT | `/clinic/templates/{id}` | Update template |
| DELETE | `/clinic/templates/{id}` | Delete template |
| PUT | `/clinic/templates/reorder` | Reorder templates within category |

### GET `/clinic/templates`
**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `category` | `diagnosis` \| `treatments` \| `dentists` \| `other` | Filter by category |
| `language` | string | Filter by language code |

### PUT `/clinic/templates/reorder`
```json
{
  "category": "diagnosis",
  "ordered_ids": ["id1", "id2", "id3"]
}
```

---

## 16. Overview / Analytics

> Requires Clinic token.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/clinic/overview/stats` | Clinic summary statistics |
| GET | `/clinic/overview/revenue` | Revenue chart data |

### GET `/clinic/overview/revenue`
**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `from` | ISO8601 | Start date |
| `to` | ISO8601 | End date |
| `group` | `day` \| `week` \| `month` | Grouping interval |

---

## Response Envelopes

### Single item
```json
{ "data": { ...entity } }
```

### Paginated list
```json
{
  "data": [ ...items ],
  "meta": {
    "total": 55,
    "per_page": 20,
    "current_page": 1,
    "last_page": 3
  }
}
```

### Error
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "errors": {
      "field_name": ["error detail"]
    }
  }
}
```

### Common Error Codes
| HTTP | Code | Meaning |
|------|------|---------|
| 400 | `VALIDATION_ERROR` | Invalid input fields |
| 401 | `UNAUTHENTICATED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Duplicate resource |
| 422 | `UNPROCESSABLE` | Business rule violation |
| 500 | `SERVER_ERROR` | Internal server error |

---

## Endpoint Summary

| # | Entity | Endpoints | Auth |
|---|--------|-----------|------|
| 1 | Admin Auth | 3 | — |
| 2 | Clinic Auth | 3 | — |
| 3 | Clinics | 7 | Admin |
| 4 | Clinic Users (Admin) | 7 | Admin |
| 5 | Admin Dashboard | 1 | Admin |
| 6 | Patients | 5 | Clinic |
| 7 | Treatment Plans | 5 + 2 + 2 + 1 + 4 + 3 = **17** | Clinic |
| 8 | Documents | 3 | Clinic |
| 9 | Users (Clinic) | 8 | Clinic |
| 10 | Roles | 4 | Clinic |
| 11 | Permissions | 1 | Clinic |
| 12 | Audit Logs | 1 | Clinic |
| 13 | Plan Settings | 2 | Clinic |
| 14 | Pricelist | 5 | Clinic |
| 15 | Templates | 6 | Clinic |
| 16 | Overview / Analytics | 2 | Clinic |
| **Total** | | **76 endpoints** | |
