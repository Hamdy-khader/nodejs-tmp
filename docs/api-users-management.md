# Users Management API Contract

This contract covers the current `/users` clinic page: team users, roles, permissions, and audit logs.

## Base URL

```txt
/api
```

All endpoints below are clinic-scoped and require:

```http
Authorization: Bearer <clinic_token>
Accept: application/json
Content-Type: application/json
```

The authenticated clinic is derived from the token. Do not accept `clinic_id` from the client for these endpoints.

## Response Envelope

Success:

```json
{
  "success": true,
  "data": {}
}
```

Paginated success:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "total": 120,
    "per_page": 20,
    "current_page": 1,
    "last_page": 6
  }
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The given data was invalid.",
    "errors": {
      "email": ["The email has already been taken."]
    }
  }
}
```

## Frontend Page Behavior

On load, the page calls these requests in parallel:

```txt
GET /clinic/users?limit=200
GET /clinic/roles
GET /clinic/permissions
GET /clinic/audit-logs?limit=200
```

The UI has four tabs:

```txt
Users
Roles
Permissions
Audit Logs
```

The frontend currently performs user table filtering locally after loading users. The API should still support filters and pagination because the table may become server-driven later.

## Enums

```txt
UserStatus:
active
inactive
suspended

Gender:
male
female
other

Built-in role keys:
super_admin
admin
dentist
assistant
receptionist
accountant
lab_technician
viewer
```

Custom role keys are allowed. Recommended format: lowercase snake case, for example `senior_dentist`.

## Data Objects

### ClinicUser

The frontend accepts both snake_case and some legacy camelCase fields, but the backend should return snake_case.

```json
{
  "id": "usr_001",
  "first_name": "Ahmed",
  "last_name": "Mohamed",
  "email": "doctor@clinic.com",
  "phone": "+201111111111",
  "avatar_url": "https://cdn.example.com/avatar.png",
  "role": "dentist",
  "status": "active",
  "branch": "Main Branch",
  "department": "Dental",
  "specialty": "Orthodontics",
  "license_number": "DM12345",
  "experience_years": 10,
  "gender": "male",
  "dob": "1985-03-20",
  "working_hours": "9:00-18:00",
  "calendar_color": "#10b981",
  "last_login": "2026-06-06T10:30:00Z",
  "created_at": "2026-06-01T09:00:00Z",
  "notes": "Senior orthodontist",
  "tags": ["senior"],
  "two_factor": false,
  "online": true
}
```

Field notes:

| Field | Type | Required | Notes |
|---|---:|---:|---|
| `id` | string | response | Server-generated UUID/ULID/integer string. |
| `first_name` | string | yes | Required by UI. |
| `last_name` | string | yes | Required by UI. |
| `email` | string | yes | Unique within active clinic users. |
| `phone` | string/null | no | UI displays empty string safely. |
| `avatar_url` | string/null | no | Direct image URL. |
| `role` | string | yes | Must match an existing role key. |
| `status` | enum | yes | `active`, `inactive`, `suspended`. |
| `branch` | string | yes | UI default examples: `Main Branch`, `Downtown`, `North Clinic`, `Marina`. |
| `department` | string/null | no | Professional info. |
| `specialty` | string/null | no | Professional info. |
| `license_number` | string/null | no | Professional license. |
| `experience_years` | number/null | no | Integer >= 0. |
| `gender` | enum/null | no | `male`, `female`, `other`. |
| `dob` | date/null | no | `YYYY-MM-DD`. |
| `working_hours` | string/null | no | Free text, for example `9:00-18:00`. |
| `calendar_color` | string/null | no | Hex color. |
| `last_login` | ISO datetime/null | response | Last successful login. |
| `created_at` | ISO datetime | response | Creation timestamp. |
| `notes` | string/null | no | Internal notes. |
| `tags` | array<string> | no | Store as JSON. |
| `two_factor` | boolean | no | Whether 2FA is required/enabled. |
| `online` | boolean | response | Optional presence flag. |

### Role

```json
{
  "key": "dentist",
  "name": "Dentist",
  "description": "Can manage patients and treatment plans.",
  "color": "from-emerald-500 to-teal-500",
  "built_in": true,
  "permissions": ["patients.read", "patients.write", "plans.read", "plans.write"]
}
```

Field notes:

| Field | Type | Required | Notes |
|---|---:|---:|---|
| `key` | string | yes | Stable role key. |
| `name` | string | yes | Display label. |
| `description` | string/null | no | Used on role cards. |
| `color` | string | yes | Tailwind gradient class string used by the current UI. |
| `built_in` | boolean | response | Built-in roles cannot be deleted. |
| `permissions` | array<string> | yes | Permission keys. |

### Permission

```json
{
  "key": "users.write",
  "group": "Users",
  "label": "Create and edit users"
}
```

The frontend also accepts `group_name`, but return `group` for consistency.

### AuditLog

```json
{
  "id": "log_001",
  "at": "2026-06-06T11:00:00Z",
  "actor": "Ahmed Mohamed",
  "action": "clinic_user.created",
  "target": "Sara Ali",
  "details": "Created user sara@clinic.com"
}
```

## Users Endpoints

### List Users

```http
GET /clinic/users
```

Query params:

| Param | Type | Notes |
|---|---:|---|
| `role` | string | Optional role key. |
| `status` | enum | `active`, `inactive`, `suspended`. |
| `branch` | string | Exact branch filter. |
| `search` | string | Match first name, last name, email, phone. |
| `page` | number | Default `1`. |
| `limit` | number | Default `20`, max recommended `200`. |

Response `200 OK`:

```json
{
  "success": true,
  "data": [
    {
      "id": "usr_001",
      "first_name": "Ahmed",
      "last_name": "Mohamed",
      "email": "doctor@clinic.com",
      "phone": "+201111111111",
      "avatar_url": null,
      "role": "dentist",
      "status": "active",
      "branch": "Main Branch",
      "department": "Dental",
      "specialty": "Orthodontics",
      "license_number": "DM12345",
      "experience_years": 10,
      "gender": "male",
      "dob": "1985-03-20",
      "working_hours": "9:00-18:00",
      "calendar_color": "#10b981",
      "last_login": null,
      "created_at": "2026-06-01T09:00:00Z",
      "notes": null,
      "tags": [],
      "two_factor": false,
      "online": false
    }
  ],
  "meta": {
    "total": 1,
    "per_page": 200,
    "current_page": 1,
    "last_page": 1
  }
}
```

### Create User

```http
POST /clinic/users
```

Request:

```json
{
  "first_name": "Sara",
  "last_name": "Ali",
  "email": "sara@clinic.com",
  "phone": "+201222222222",
  "password": "secret12345",
  "password_confirmation": "secret12345",
  "avatar_url": null,
  "role": "assistant",
  "status": "active",
  "branch": "Main Branch",
  "department": "Dental",
  "specialty": null,
  "license_number": null,
  "experience_years": 0,
  "gender": "female",
  "dob": "1994-01-20",
  "working_hours": "9:00-18:00",
  "calendar_color": "#10b981",
  "notes": "",
  "tags": [],
  "two_factor": false
}
```

Validation:

```txt
first_name: required string max 100
last_name: required string max 100
email: required email max 255 unique within clinic users
phone: nullable string max 50
password: required string min 8 confirmed
avatar_url: nullable url max 2048
role: required exists in roles.key and visible to clinic
status: required active | inactive | suspended
branch: required string max 100
department: nullable string max 100
specialty: nullable string max 100
license_number: nullable string max 100
experience_years: nullable integer min 0 max 80
gender: nullable male | female | other
dob: nullable date before today
working_hours: nullable string max 100
calendar_color: nullable hex color
notes: nullable string max 2000
tags: array<string> max 30 items
two_factor: boolean
```

Response `201 Created`: return the created `ClinicUser`.

Important behavior:

```txt
Create must always return the final persisted user.
The server owns id, created_at, last_login, and online.
Create must write audit log action clinic_user.created.
If status is inactive or suspended, the user should not be able to login.
```

### Get User

```http
GET /clinic/users/{userId}
```

Response `200 OK`: return one `ClinicUser`.

### Update User

```http
PUT /clinic/users/{userId}
```

Request body is the same profile/access payload as Create, except `password` is not required and should be ignored unless you explicitly support password updates here.

Response `200 OK`: return the updated `ClinicUser`.

Important behavior:

```txt
Only update users belonging to the authenticated clinic.
Do not allow deleting or demoting the last clinic owner/super_admin unless another active super_admin remains.
Write audit log action clinic_user.updated.
```

### Delete User

```http
DELETE /clinic/users/{userId}
```

Response `204 No Content`.

Recommended behavior:

```txt
Soft delete is preferred.
Delete/revoke active sessions and tokens for that user.
Reject deleting super_admin from the clinic users page.
Write audit log action clinic_user.deleted.
```

Errors:

| Status | Code | When |
|---:|---|---|
| 403 | `CANNOT_DELETE_SUPER_ADMIN` | Attempt to delete protected super admin. |
| 404 | `NOT_FOUND` | User not found in authenticated clinic. |

### Bulk Status

```http
POST /clinic/users/bulk-status
```

Request:

```json
{
  "user_ids": ["usr_001", "usr_002"],
  "status": "inactive"
}
```

Validation:

```txt
user_ids: required array min 1
user_ids.*: required exists in authenticated clinic
status: required active | inactive | suspended
```

Response `200 OK`:

```json
{
  "success": true,
  "data": {
    "updated": 2
  }
}
```

Important behavior:

```txt
When status becomes inactive or suspended, revoke current sessions for those users.
Write audit log action clinic_user.bulk_status_updated.
```

### Bulk Role

```http
POST /clinic/users/bulk-role
```

Request:

```json
{
  "user_ids": ["usr_001", "usr_002"],
  "role": "assistant"
}
```

Response `200 OK`:

```json
{
  "success": true,
  "data": {
    "updated": 2
  }
}
```

Validation:

```txt
user_ids: required array min 1
user_ids.*: required exists in authenticated clinic
role: required exists in roles.key and visible to clinic
```

Write audit log action `clinic_user.bulk_role_updated`.

### Reset Password

```http
POST /clinic/users/{userId}/reset-password
```

Response `200 OK`:

```json
{
  "success": true,
  "data": {
    "sent": true,
    "delivery": "email"
  }
}
```

Behavior:

```txt
Generate a password reset token.
Send reset link to the user's email.
Do not return the token in production.
Write audit log action clinic_user.password_reset_requested.
```

## Roles Endpoints

### List Roles

```http
GET /clinic/roles
```

Response `200 OK`:

```json
{
  "success": true,
  "data": [
    {
      "key": "assistant",
      "name": "Assistant",
      "description": "Can assist with patient workflow.",
      "color": "from-sky-500 to-cyan-500",
      "built_in": true,
      "permissions": ["patients.read", "plans.read"]
    }
  ]
}
```

Return both system built-in roles and clinic custom roles.

### Create Role

```http
POST /clinic/roles
```

Request:

```json
{
  "key": "senior_dentist",
  "name": "Senior Dentist",
  "description": "Advanced dentist role",
  "color": "from-violet-500 to-purple-500",
  "permissions": ["patients.read", "patients.write", "plans.read", "plans.write"]
}
```

Validation:

```txt
key: required string regex ^[a-z][a-z0-9_]*$ unique per clinic/system
name: required string max 100
description: nullable string max 255
color: required string max 100
permissions: required array
permissions.*: exists in permissions.key
```

Response `201 Created`: return `Role`.

### Update Role

```http
PUT /clinic/roles/{roleKey}
```

Request: same as Create.

Response `200 OK`: return updated `Role`.

Important behavior:

```txt
The permissions matrix toggles permissions by calling this endpoint with the full permissions array.
Built-in roles may be editable except super_admin.
super_admin permissions must not be modified.
Write audit log action role.updated.
```

If super admin modification is attempted:

```json
{
  "success": false,
  "error": {
    "code": "SUPER_ADMIN_LOCKED",
    "message": "Super Admin permissions cannot be modified."
  }
}
```

### Delete Role

```http
DELETE /clinic/roles/{roleKey}
```

Response `204 No Content`.

Rules:

```txt
Reject deleting built-in roles.
Reject deleting a custom role if users are assigned to it, unless backend supports reassignment.
Write audit log action role.deleted.
```

Errors:

| Status | Code | When |
|---:|---|---|
| 403 | `BUILT_IN_ROLE_LOCKED` | Attempt to delete a built-in role. |
| 409 | `ROLE_IN_USE` | Role is assigned to one or more users. |

## Permissions Endpoint

### List Permissions

```http
GET /clinic/permissions
```

Response `200 OK`:

```json
{
  "success": true,
  "data": [
    {
      "key": "patients.read",
      "group": "Patients",
      "label": "View patients"
    },
    {
      "key": "users.write",
      "group": "Users",
      "label": "Create and edit users"
    }
  ]
}
```

Recommended permission keys:

```txt
patients.read
patients.write
patients.delete
plans.read
plans.write
plans.delete
templates.read
templates.write
documents.read
documents.write
pricelist.read
pricelist.write
overview.read
users.read
users.write
users.delete
roles.read
roles.write
audit.read
settings.read
settings.write
```

## Audit Logs Endpoint

### List Audit Logs

```http
GET /clinic/audit-logs
```

Query params:

| Param | Type | Notes |
|---|---:|---|
| `actor` | string | Search actor name/email. |
| `action` | string | Exact action key. |
| `from` | date/datetime | Inclusive. |
| `to` | date/datetime | Inclusive. |
| `page` | number | Default `1`. |
| `limit` | number | Default `20`, max recommended `200`. |

Response `200 OK`:

```json
{
  "success": true,
  "data": [
    {
      "id": "log_001",
      "at": "2026-06-06T11:00:00Z",
      "actor": "Ahmed Mohamed",
      "action": "clinic_user.created",
      "target": "Sara Ali",
      "details": "Created user sara@clinic.com"
    }
  ],
  "meta": {
    "total": 1,
    "per_page": 200,
    "current_page": 1,
    "last_page": 1
  }
}
```

Recommended action keys:

```txt
clinic_user.created
clinic_user.updated
clinic_user.deleted
clinic_user.bulk_status_updated
clinic_user.bulk_role_updated
clinic_user.password_reset_requested
role.created
role.updated
role.deleted
```

## Authorization Rules

Minimum permissions recommended for page access:

| UI Action | Required Permission |
|---|---|
| Open Users tab | `users.read` |
| Create/edit users | `users.write` |
| Delete users | `users.delete` |
| Activate/deactivate/suspend users | `users.write` |
| Reset password | `users.write` |
| View roles | `roles.read` |
| Create/edit/delete roles | `roles.write` |
| Toggle role permissions | `roles.write` |
| View permissions matrix | `roles.read` |
| View audit logs | `audit.read` |

The backend must enforce these rules. The frontend currently renders the controls optimistically and expects protected API responses if the user is not allowed.

## Database Schema Recommendation

If `clinic_users` is already the authentication table, extend it instead of creating a duplicate staff table.

```txt
clinic_users
- id
- clinic_id
- first_name
- last_name
- email
- phone
- password_hash
- avatar_url
- role_key
- status
- branch
- department
- specialty
- license_number
- experience_years
- gender
- dob
- working_hours
- calendar_color
- last_login_at
- notes
- tags_json
- two_factor
- deleted_at
- created_at
- updated_at

roles
- id
- clinic_id nullable
- key
- name
- description
- color
- built_in
- created_at
- updated_at

permissions
- id
- key
- group_name
- label
- created_at
- updated_at

role_permissions
- id
- role_id
- permission_id

audit_logs
- id
- clinic_id
- actor_user_id nullable
- actor_name
- action
- target_type
- target_id
- target_label
- details
- ip_address
- user_agent
- created_at
```

Recommended constraints:

```txt
clinic_users: unique(clinic_id, email) where deleted_at is null
roles: unique(clinic_id, key), and system built-ins use clinic_id = null
permissions: unique(key)
role_permissions: unique(role_id, permission_id)
```

## Frontend Integration Map

| UI Event | API Call |
|---|---|
| Page load | `GET /clinic/users?limit=200`, `GET /clinic/roles`, `GET /clinic/permissions`, `GET /clinic/audit-logs?limit=200` |
| New user save | `POST /clinic/users` |
| Edit user save | `PUT /clinic/users/{userId}` |
| Delete one user | `DELETE /clinic/users/{userId}` |
| Bulk delete users | Multiple `DELETE /clinic/users/{userId}` calls |
| Activate/deactivate/suspend one or many users | `POST /clinic/users/bulk-status` |
| Change role for selected users | `POST /clinic/users/bulk-role` |
| Reset password | `POST /clinic/users/{userId}/reset-password` |
| Create role | `POST /clinic/roles` |
| Edit role | `PUT /clinic/roles/{roleKey}` |
| Toggle permission in matrix | `PUT /clinic/roles/{roleKey}` with full permissions array |
| Delete role | `DELETE /clinic/roles/{roleKey}` |

## Acceptance Checklist

```txt
All endpoints are scoped by authenticated clinic token.
GET /clinic/users returns fields needed by the users table and profile dialog.
POST /clinic/users creates a real user and returns the persisted object.
PUT /clinic/users/{id} updates profile, role, status, work, and security fields.
Bulk status updates active/inactive/suspended and revokes sessions when access is blocked.
Bulk role updates multiple users reliably.
Reset password sends email and does not expose reset token.
GET /clinic/roles returns built-in and custom roles with permissions.
GET /clinic/permissions returns grouped permission metadata.
PUT /clinic/roles/{key} updates permissions for the permissions matrix.
super_admin cannot be deleted and its permissions cannot be modified.
Audit logs are written for user and role mutations.
All validation errors use 422 with field-level errors.
Suspended clinics receive 403 CLINIC_SUSPENDED for all clinic endpoints.
```
