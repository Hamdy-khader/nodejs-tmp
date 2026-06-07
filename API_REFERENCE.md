# API Reference — Treatly Online (BrightPlans)

**Base URL:** `https://backend.treatlyonline.de/api`  
**Client source:** `src/lib/admin/api.ts`

---

## Auth & Security

### Token storage
| Key | Storage | Used for |
|-----|---------|----------|
| `bp_clinic_token` | `localStorage` | All `/clinic/*` requests |
| `bp_admin_token` | `localStorage` | All `/admin/*` requests |

### Protected request headers
```
Authorization: Bearer {token}
Accept: application/json
Content-Type: application/json
```
Login endpoints use `Content-Type: application/x-www-form-urlencoded`.

### Auth guard (frontend)
- Every route except `/login`, `/clinic/login`, `/admin/login` requires a valid token.
- No token → automatic redirect to `/login` or `/admin/login`.
- **401 response** from any endpoint → token cleared → `window.location.href` redirect → full page reload.
- **Logout** → `window.location.href` redirect → full page reload (clears all in-memory store state).

---

## Response format

### Single resource
```json
{ "data": { ...object } }
```

### Paginated list
```json
{
  "data": [ ...items ],
  "meta": { "total": 55, "per_page": 20, "current_page": 1, "last_page": 3 }
}
```

### Error
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable message",
    "errors": { "field": ["detail"] }
  }
}
```

| HTTP | Code | Meaning |
|------|------|---------|
| 400 | `VALIDATION_ERROR` | Invalid input |
| 401 | `UNAUTHENTICATED` | Missing or expired token |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Duplicate resource |
| 422 | `UNPROCESSABLE` | Business rule violation |
| 429 | `TOO_MANY_ATTEMPTS` | Rate limited |
| 500 | `SERVER_ERROR` | Internal server error |

---

## 1. Admin — Authentication

| Method | Path | Description |
|--------|------|-------------|
| POST | `/admin/login` | Login → `{ token, admin }` |
| POST | `/admin/logout` | Invalidate session |
| GET | `/admin/me` | Current admin user |

### POST `/admin/login`
**Body (form-encoded):** `email=...&password=...`

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

## 2. Clinic — Authentication

| Method | Path | Description |
|--------|------|-------------|
| POST | `/clinic/login` | Login → `{ token, clinic_user, clinic }` |
| POST | `/clinic/logout` | Invalidate session |
| GET | `/clinic/me` | Current clinic user + clinic info |

### POST `/clinic/login`
**Body (form-encoded):** `email=...&password=...`

**Response:**
```json
{
  "token": "string",
  "clinic_user": { ...ClinicUser },
  "clinic": { ...Clinic }
}
```

**Error codes:** `CLINIC_SUSPENDED` · `ACCOUNT_INACTIVE` · `TOO_MANY_ATTEMPTS`

---

## 3. Clinics (Admin)

> Requires Admin token.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/clinics` | List clinics (paginated) |
| POST | `/admin/clinics` | Create clinic |
| GET | `/admin/clinics/{id}` | Get clinic |
| PUT | `/admin/clinics/{id}` | Update clinic |
| DELETE | `/admin/clinics/{id}` | Delete clinic |
| PATCH | `/admin/clinics/{id}/suspend` | Suspend clinic |
| PATCH | `/admin/clinics/{id}/activate` | Activate clinic |

### GET `/admin/clinics` — query params
| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Search by name / email |
| `status` | `active` \| `suspended` | Filter |
| `page` | number | Default: 1 |
| `limit` | number | Items per page |

### Clinic object
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

## 4. Clinic Users (Admin view)

> Requires Admin token.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/clinics/{clinicId}/users` | List users of a clinic |
| POST | `/admin/clinics/{clinicId}/users` | Create user in clinic |
| GET | `/admin/clinic-users/{id}` | Get user |
| PUT | `/admin/clinic-users/{id}` | Update user |
| DELETE | `/admin/clinic-users/{id}` | Delete user |
| PATCH | `/admin/clinic-users/{id}/activate` | Activate user |
| PATCH | `/admin/clinic-users/{id}/deactivate` | Deactivate user |

### GET `/admin/clinics/{clinicId}/users` — query params
| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Search |
| `status` | `active` \| `inactive` | Filter |
| `role` | string | Filter by role |
| `page` | number | Default: 1 |
| `limit` | number | Items per page |

### POST/PUT body
```json
{
  "full_name": "string",
  "email": "string",
  "phone": "string",
  "password": "string",
  "confirm_password": "string",
  "role": "clinic_staff|...",
  "status": "active|inactive"
}
```

---

## 5. Admin Dashboard

> Requires Admin token.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/stats` | Dashboard statistics |

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
> Backend may return snake_case (`total_clinics`) — client normalises both variants.

---

## 6. Patients

> Requires Clinic token.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/clinic/patients` | List patients (paginated) |
| POST | `/clinic/patients` | Create patient |
| GET | `/clinic/patients/{id}` | Get patient |
| PUT | `/clinic/patients/{id}` | Update patient |
| DELETE | `/clinic/patients/{id}` | Delete patient |

### GET `/clinic/patients` — query params
| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Name / email / phone |
| `page` | number | Default: 1 |
| `limit` | number | Items per page (store uses 200) |
| `sort` | `created_at` \| `name` | Sort field |
| `order` | `asc` \| `desc` | Sort direction |

### Patient object
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

### POST/PUT body
```json
{
  "name": "string",
  "email": "string|null",
  "phone": "string|null",
  "date_of_birth": "YYYY-MM-DD|null"
}
```

---

## 7. Treatment Plans

> Requires Clinic token. Plans are scoped under a patient.

### 7.1 Plan CRUD

| Method | Path | Description |
|--------|------|-------------|
| GET | `/clinic/patients/{patientId}/plans` | List all plans for patient |
| POST | `/clinic/patients/{patientId}/plans` | Create plan |
| GET | `/clinic/patients/{patientId}/plans/{planId}` | Get full plan |
| PUT | `/clinic/patients/{patientId}/plans/{planId}` | Update plan metadata |
| DELETE | `/clinic/patients/{patientId}/plans/{planId}` | Delete plan |

### POST body (create)
```json
{ "name": "string", "notes": "" }
```

### PUT body (update)
```json
{
  "name": "string",
  "notes": "string",
  "billing_mode": "insurance|payment|null",
  "insurance": { "unused_max": 0, "deductible": 0 },
  "payment_plan": { "amount": 0, "term": 0, "interest": 0 },
  "treatment_note": "string|null"
}
```

### Plan object
```json
{
  "id": "string",
  "patient_id": "string",
  "name": "string",
  "notes": "string",
  "billing_mode": "insurance|payment|null",
  "insurance": { "unused_max": 0, "deductible": 0 },
  "payment_plan": { "amount": 0, "term": 0, "interest": 0 },
  "treatment_note": "string|null",
  "teeth": [...],
  "xrays": [...],
  "general_statuses": [...],
  "treatment_rows": [...],
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

---

### 7.2 Teeth

| Method | Path | Description |
|--------|------|-------------|
| PUT | `/clinic/plans/{planId}/teeth` | Batch save all teeth |
| PATCH | `/clinic/plans/{planId}/teeth/{toothNumber}` | Update single tooth |

**PUT body:**
```json
{
  "teeth": [
    { "tooth_number": 18, "status": "intact", "note": "string|null", "diagnosis": [] }
  ]
}
```

**PATCH body:**
```json
{ "tooth_number": 18, "status": "caries", "note": "string|null", "diagnosis": [] }
```

**Tooth status values:** `intact` · `missing` · `caries` · `filled` · `crown` · `root-treated` · `implant` · `bridge`

**FDI tooth numbers (upper):** 18–11, 21–28  
**FDI tooth numbers (lower):** 48–41, 31–38

---

### 7.3 X-Rays

| Method | Path | Description |
|--------|------|-------------|
| GET | `/clinic/plans/{planId}/xrays` | List X-rays (sorted by `sort_order`) |
| POST | `/clinic/plans/{planId}/xrays` | Upload X-ray (`multipart/form-data`) |
| DELETE | `/clinic/plans/{planId}/xrays/{xrayId}` | Delete X-ray |

**POST request:** `multipart/form-data` — fields: `file` (binary, required, `image/*`), `sort_order` (int, optional)

**Response item shape:**
```json
{ "id": "string", "file_url": "string", "sort_order": 1, "created_at": "ISO8601", "updated_at": "ISO8601" }
```

---

### 7.4 General Statuses

| Method | Path | Description |
|--------|------|-------------|
| PUT | `/clinic/plans/{planId}/general-statuses` | Replace all statuses |

**Body:**
```json
{ "items": [{ "label": "Bruxism signs" }, { "label": "Gingivitis" }] }
```

---

### 7.5 Treatment Rows

| Method | Path | Description |
|--------|------|-------------|
| PUT | `/clinic/plans/{planId}/rows` | Batch replace all rows |
| POST | `/clinic/plans/{planId}/rows` | Create row |
| PATCH | `/clinic/plans/{planId}/rows/{rowId}` | Update row |
| DELETE | `/clinic/plans/{planId}/rows/{rowId}` | Delete row |

**Row kinds and their fields:**

```json
{ "kind": "visit",    "label": "string|null", "note": "string|null", "sort_order": 1, "items": [] }
{ "kind": "healing",  "label": "string|null", "note": "string|null", "sort_order": 2, "days": 7 }
{ "kind": "discount", "note": "string|null",  "sort_order": 3, "mode": "amount|percent", "value": 100 }
```

---

### 7.6 Treatment Items (inside rows)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/clinic/plans/{planId}/rows/{rowId}/items` | Create item |
| PATCH | `/clinic/plans/{planId}/rows/{rowId}/items/{itemId}` | Update item |
| DELETE | `/clinic/plans/{planId}/rows/{rowId}/items/{itemId}` | Delete item |

**POST/PATCH body:**
```json
{
  "name": "string",
  "tooth_number": 18,
  "amount": 1,
  "unit_price": 150.00,
  "sort_order": 1
}
```

---

## 8. Documents (Presets)

> Requires Clinic token. One config per clinic.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/clinic/document-presets` | Get document preset config |
| PUT | `/clinic/document-presets` | Save preset config |
| POST | `/clinic/document-presets/reset` | Reset to factory defaults |

**GET response / PUT body:**
```json
{
  "selected_ids": ["fixed:clinic:demo", "fixed:diagnosis:note"],
  "order": {
    "clinic":     ["id1", "id2"],
    "opg":        [],
    "diagnosis":  ["id3"],
    "treatments": [],
    "other":      ["id4", "id5"]
  }
}
```

**Section IDs:** `clinic` · `opg` · `diagnosis` · `treatments` · `other`

---

## 9. Users (Clinic internal)

> Requires Clinic token.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/clinic/users` | List users (paginated) |
| POST | `/clinic/users` | Create user |
| GET | `/clinic/users/{id}` | Get user |
| PUT | `/clinic/users/{id}` | Update user |
| DELETE | `/clinic/users/{id}` | Delete user |
| POST | `/clinic/users/bulk-status` | Bulk update status |
| POST | `/clinic/users/bulk-role` | Bulk update role |
| POST | `/clinic/users/{id}/reset-password` | Send password reset |

### GET `/clinic/users` — query params
| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Name / email |
| `role` | string | Role key filter |
| `status` | `active` \| `inactive` \| `suspended` | Status filter |
| `branch` | string | Branch filter |
| `page` | number | Default: 1 |
| `limit` | number | Store uses 200 |

### POST body (create — password required)
```json
{
  "first_name": "string",
  "last_name": "string",
  "email": "string",
  "phone": "string",
  "password": "string",
  "password_confirmation": "string",
  "role": "dentist",
  "status": "active",
  "branch": "string",
  "avatar_url": "string|null",
  "department": "string|null",
  "specialty": "string|null",
  "license_number": "string|null",
  "experience_years": 5,
  "gender": "male|female|other|null",
  "dob": "YYYY-MM-DD|null",
  "working_hours": "string|null",
  "calendar_color": "#hex|null",
  "notes": "string|null",
  "tags": [],
  "two_factor": false
}
```

### PUT body (update — no password field)
Same as above minus `password` / `password_confirmation`.

### POST `/clinic/users/bulk-status`
```json
{ "user_ids": ["id1", "id2"], "status": "active|inactive|suspended" }
```

### POST `/clinic/users/bulk-role`
```json
{ "user_ids": ["id1", "id2"], "role": "dentist" }
```

### User object (response)
```json
{
  "id": "string",
  "first_name": "string",
  "last_name": "string",
  "email": "string",
  "phone": "string",
  "avatar_url": "string|null",
  "role": "dentist",
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
  "tags": [],
  "two_factor": false,
  "online": false
}
```

### Built-in role keys
`super_admin` · `admin` · `dentist` · `assistant` · `receptionist` · `accountant` · `lab_technician` · `viewer`

---

## 10. Roles

> Requires Clinic token.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/clinic/roles` | List all roles |
| POST | `/clinic/roles` | Create custom role |
| PUT | `/clinic/roles/{roleKey}` | Update role |
| DELETE | `/clinic/roles/{roleKey}` | Delete role |

### Role object
```json
{
  "key": "string",
  "name": "string",
  "description": "string",
  "color": "from-slate-400 to-slate-500",
  "built_in": false,
  "permissions": ["permission_key_1", "permission_key_2"]
}
```

---

## 11. Permissions

> Requires Clinic token.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/clinic/permissions` | List all available permissions |

### Permission object
```json
{ "key": "string", "group": "string", "label": "string" }
```

---

## 12. Audit Logs

> Requires Clinic token.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/clinic/audit-logs` | List audit log entries (paginated) |

### GET query params
| Param | Type | Description |
|-------|------|-------------|
| `actor` | string | Filter by actor name |
| `action` | string | Filter by action type |
| `from` | ISO8601 | Start date |
| `to` | ISO8601 | End date |
| `page` | number | Default: 1 |
| `limit` | number | Store uses 200 |

### AuditLog object
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
| GET | `/clinic/plan-settings` | Get plan settings |
| PUT | `/clinic/plan-settings` | Update plan settings |

### PUT body
```json
{
  "language": "English (EN)",
  "page_size": "A4|Letter|Legal",
  "price_list_design": "compact|detailed|minimal",
  "price_page": {
    "show_prices": true,
    "show_subtotal": true,
    "show_discount": true,
    "show_tax": false,
    "show_total": true,
    "show_insurance": true,
    "currency": "EUR"
  },
  "plan_sections": {
    "show_diagnosis": true,
    "show_treatments": true,
    "show_animation": true,
    "show_documents": true,
    "show_overview": true
  },
  "page_design": {
    "front_cover": {
      "cover_image": "url|null",
      "title": "TREATMENT PLAN",
      "subtitle": "[PATIENT NAME]|null"
    },
    "inner_pages": { "header_text": "TITLE", "show_footer": true },
    "animation_page": { "mode": "default|custom", "custom_note": "string|null" },
    "back_cover": { "back_image": "url|null", "note": "string|null" }
  }
}
```

---

## 14. Pricelist

> Requires Clinic token.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/clinic/pricelist` | Get full pricelist |
| PUT | `/clinic/pricelist` | Batch save entire pricelist |
| POST | `/clinic/pricelist/items` | Add item to a group |
| PATCH | `/clinic/pricelist/items/{id}` | Update item |
| DELETE | `/clinic/pricelist/items/{id}` | Delete item |

### Full pricelist structure
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
            { "id": "string", "name": "string", "price": 150.00, "note": "string" }
          ]
        }
      ]
    }
  ]
}
```

### POST `/clinic/pricelist/items` body
```json
{ "group_id": "string", "name": "string", "price": 150.00, "note": "string" }
```

### PATCH `/clinic/pricelist/items/{id}` body
```json
{ "name": "string", "price": 150.00, "note": "string" }
```

---

## 15. Templates

> Requires Clinic token.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/clinic/templates` | List templates |
| POST | `/clinic/templates` | Create template |
| GET | `/clinic/templates/{id}` | Get template |
| PUT | `/clinic/templates/{id}` | Update template |
| DELETE | `/clinic/templates/{id}` | Delete template |
| PUT | `/clinic/templates/reorder` | Reorder within a category |

### GET `/clinic/templates` — query params
| Param | Type | Description |
|-------|------|-------------|
| `category` | `diagnosis` \| `treatments` \| `dentists` \| `other` | Filter |
| `language` | string | Filter by language |

### POST/PUT body
```json
{
  "title": "string",
  "category": "diagnosis|treatments|dentists|other",
  "language": "English",
  "body": "<p>HTML content</p>",
  "order": 1
}
```

### PUT `/clinic/templates/reorder` body
```json
{ "category": "diagnosis", "ordered_ids": ["id1", "id2", "id3"] }
```

### Template object
```json
{
  "id": "string",
  "title": "string",
  "category": "diagnosis",
  "language": "English",
  "body": "<p>...</p>",
  "order": 1,
  "updated_at": "ISO8601"
}
```

---

## 16. Overview / Analytics

> Requires Clinic token.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/clinic/overview/stats` | Clinic summary stats |
| GET | `/clinic/overview/revenue` | Revenue chart data |

### GET `/clinic/overview/revenue` — query params
| Param | Type | Description |
|-------|------|-------------|
| `from` | ISO8601 | Start date |
| `to` | ISO8601 | End date |
| `group` | `day` \| `week` \| `month` | Grouping interval |

---

## Endpoint index

| # | Scope | Entity | Count | Auth |
|---|-------|--------|-------|------|
| 1 | Admin | Auth | 3 | — |
| 2 | Clinic | Auth | 3 | — |
| 3 | Admin | Clinics | 7 | Admin |
| 4 | Admin | Clinic Users | 7 | Admin |
| 5 | Admin | Dashboard Stats | 1 | Admin |
| 6 | Clinic | Patients | 5 | Clinic |
| 7 | Clinic | Treatment Plans | 5 | Clinic |
| 8 | Clinic | Teeth | 2 | Clinic |
| 9 | Clinic | X-Rays | 2 | Clinic |
| 10 | Clinic | General Statuses | 1 | Clinic |
| 11 | Clinic | Treatment Rows | 4 | Clinic |
| 12 | Clinic | Treatment Items | 3 | Clinic |
| 13 | Clinic | Documents | 3 | Clinic |
| 14 | Clinic | Users | 8 | Clinic |
| 15 | Clinic | Roles | 4 | Clinic |
| 16 | Clinic | Permissions | 1 | Clinic |
| 17 | Clinic | Audit Logs | 1 | Clinic |
| 18 | Clinic | Plan Settings | 2 | Clinic |
| 19 | Clinic | Pricelist | 5 | Clinic |
| 20 | Clinic | Templates | 6 | Clinic |
| 21 | Clinic | Overview / Analytics | 2 | Clinic |
| **Total** | | | **76** | |

---

## Page → API mapping

| Route | Endpoints used |
|-------|---------------|
| `/login` | POST `/clinic/login` |
| `/admin/login` | POST `/admin/login` |
| `/` (Dashboard) | GET `/clinic/me` · GET/PUT `/clinic/plan-settings` |
| `/patients/` | GET `/clinic/patients` · POST · PUT · DELETE |
| `/patients/{id}/` | GET `/clinic/patients/{id}` · GET `/clinic/patients/{id}/plans` |
| `/patients/{id}/plans/{planId}` | Full plan CRUD + teeth + xrays + statuses + rows + items |
| `/documents` | GET/PUT/POST `/clinic/document-presets` |
| `/templates` | Full `/clinic/templates` CRUD |
| `/clinic-fees` | Full `/clinic/pricelist` CRUD |
| `/plan-settings` | GET/PUT `/clinic/plan-settings` |
| `/overview` | `/clinic/document-presets` · `/clinic/templates` · `/clinic/plan-settings` (read-only preview) |
| `/users` | `/clinic/users` · `/clinic/roles` · `/clinic/permissions` · `/clinic/audit-logs` |
| `/admin/dashboard` | GET `/admin/stats` |
| `/admin/clinics/` | GET/PATCH(suspend/activate)/DELETE `/admin/clinics` |
| `/admin/clinics/create` | POST `/admin/clinics` |
| `/admin/clinics/{id}` | GET/PUT `/admin/clinics/{id}` |
| `/admin/clinics/{id}/users` | Full `/admin/clinics/{id}/users` · `/admin/clinic-users/{id}` CRUD |
