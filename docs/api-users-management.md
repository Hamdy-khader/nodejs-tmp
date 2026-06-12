# Users Management API Contract

This contract covers the simplified clinic Users Management module. The frontend manages users only. Roles and permissions are not configurable from the frontend.

## Scope

- Users page only.
- No roles page.
- No permissions page.
- No audit logs page.
- No role management endpoints required by the frontend.
- No permission management endpoints required by the frontend.

## Base URL

```text
/api
```

All endpoints below are clinic-authenticated and use:

```http
Authorization: Bearer {clinic_token}
Accept: application/json
Content-Type: application/json
```

## Enums

### Role

Only these values are accepted:

```text
dentist
assistant
```

Backend behavior:

- `dentist` receives the backend predefined dentist permissions.
- `assistant` receives the backend predefined assistant permissions.
- Permissions must not be accepted from frontend payloads.
- Permissions must not be returned as editable data for this module.

### Status

```text
active
inactive
suspended
```

## Shared User Object

```json
{
  "id": "usr_123",
  "first_name": "Mona",
  "last_name": "Hassan",
  "email": "mona@example.com",
  "phone": "+201000000000",
  "avatar_url": "https://example.com/avatar.png",
  "role": "dentist",
  "status": "active",
  "branch": "Main Branch",
  "department": "Orthodontics",
  "specialty": "Orthodontist",
  "license_number": "DEN-12345",
  "experience_years": 8,
  "gender": "female",
  "dob": "1990-01-20",
  "working_hours": "9:00-18:00",
  "calendar_color": "#10b981",
  "notes": "Part-time on Thursday",
  "tags": [],
  "two_factor": false,
  "online": false,
  "last_login_at": "2026-06-10T11:45:00Z",
  "created_at": "2026-06-01T09:00:00Z",
  "updated_at": "2026-06-11T13:00:00Z"
}
```

## Shared Error Format

```json
{
  "message": "Validation failed.",
  "code": "VALIDATION_ERROR",
  "errors": {
    "email": ["The email has already been taken."]
  }
}
```

Common errors:

| HTTP | Code | Meaning |
| --- | --- | --- |
| 400 | `BAD_REQUEST` | Malformed request. |
| 401 | `UNAUTHENTICATED` | Missing or invalid token. |
| 403 | `FORBIDDEN` | Clinic user cannot perform this action. |
| 404 | `USER_NOT_FOUND` | User does not exist in this clinic. |
| 409 | `EMAIL_ALREADY_EXISTS` | Email is already used. |
| 422 | `VALIDATION_ERROR` | Field validation failed. |
| 500 | `SERVER_ERROR` | Unexpected backend error. |

## 1. List Users

```http
GET /clinic/users
```

### Query Parameters

| Name | Type | Required | Notes |
| --- | --- | --- | --- |
| `search` | string | no | Search by name, email or phone. |
| `role` | string | no | `dentist` or `assistant`. |
| `status` | string | no | `active`, `inactive`, `suspended`. |
| `branch` | string | no | Branch name or branch id, depending on backend model. |
| `page` | integer | no | Default `1`. |
| `limit` | integer | no | Default `20`, max `200`. |

### Response Body

```json
{
  "data": [
    {
      "id": "usr_123",
      "first_name": "Mona",
      "last_name": "Hassan",
      "email": "mona@example.com",
      "phone": "+201000000000",
      "avatar_url": null,
      "role": "dentist",
      "status": "active",
      "branch": "Main Branch",
      "department": "Orthodontics",
      "specialty": "Orthodontist",
      "license_number": "DEN-12345",
      "experience_years": 8,
      "gender": "female",
      "dob": "1990-01-20",
      "working_hours": "9:00-18:00",
      "calendar_color": "#10b981",
      "notes": null,
      "tags": [],
      "two_factor": false,
      "online": false,
      "last_login_at": "2026-06-10T11:45:00Z",
      "created_at": "2026-06-01T09:00:00Z",
      "updated_at": "2026-06-11T13:00:00Z"
    }
  ],
  "meta": {
    "total": 1,
    "per_page": 20,
    "current_page": 1,
    "last_page": 1
  }
}
```

### Validation Rules

```text
role: nullable|in:dentist,assistant
status: nullable|in:active,inactive,suspended
branch: nullable|string|max:255
page: nullable|integer|min:1
limit: nullable|integer|min:1|max:200
```

### Error Responses

- `401 UNAUTHENTICATED`
- `403 FORBIDDEN`
- `422 VALIDATION_ERROR`

## 2. Get User Details

```http
GET /clinic/users/{id}
```

### Response Body

```json
{
  "data": {
    "id": "usr_123",
    "first_name": "Mona",
    "last_name": "Hassan",
    "email": "mona@example.com",
    "phone": "+201000000000",
    "avatar_url": null,
    "role": "dentist",
    "status": "active",
    "branch": "Main Branch",
    "department": "Orthodontics",
    "specialty": "Orthodontist",
    "license_number": "DEN-12345",
    "experience_years": 8,
    "gender": "female",
    "dob": "1990-01-20",
    "working_hours": "9:00-18:00",
    "calendar_color": "#10b981",
    "notes": null,
    "tags": [],
    "two_factor": false,
    "online": false,
    "last_login_at": "2026-06-10T11:45:00Z",
    "created_at": "2026-06-01T09:00:00Z",
    "updated_at": "2026-06-11T13:00:00Z"
  }
}
```

### Validation Rules

```text
id: required|exists:clinic_users,id scoped to authenticated clinic
```

### Error Responses

- `401 UNAUTHENTICATED`
- `403 FORBIDDEN`
- `404 USER_NOT_FOUND`

## 3. Create User

```http
POST /clinic/users
```

### Request Body

```json
{
  "first_name": "Mona",
  "last_name": "Hassan",
  "email": "mona@example.com",
  "phone": "+201000000000",
  "password": "StrongPassword123!",
  "password_confirmation": "StrongPassword123!",
  "avatar_url": null,
  "role": "dentist",
  "status": "active",
  "branch": "Main Branch",
  "department": "Orthodontics",
  "specialty": "Orthodontist",
  "license_number": "DEN-12345",
  "experience_years": 8,
  "gender": "female",
  "dob": "1990-01-20",
  "working_hours": "9:00-18:00",
  "calendar_color": "#10b981",
  "notes": null,
  "tags": []
}
```

Do not send `permissions`.

### Response Body

```json
{
  "message": "User created successfully.",
  "data": {
    "id": "usr_123",
    "first_name": "Mona",
    "last_name": "Hassan",
    "email": "mona@example.com",
    "phone": "+201000000000",
    "avatar_url": null,
    "role": "dentist",
    "status": "active",
    "branch": "Main Branch",
    "department": "Orthodontics",
    "specialty": "Orthodontist",
    "license_number": "DEN-12345",
    "experience_years": 8,
    "gender": "female",
    "dob": "1990-01-20",
    "working_hours": "9:00-18:00",
    "calendar_color": "#10b981",
    "notes": null,
    "tags": [],
    "two_factor": false,
    "online": false,
    "last_login_at": null,
    "created_at": "2026-06-12T10:00:00Z",
    "updated_at": "2026-06-12T10:00:00Z"
  }
}
```

### Validation Rules

```text
first_name: required|string|max:100
last_name: required|string|max:100
email: required|email|max:255|unique:clinic_users,email
phone: nullable|string|max:30
password: required|string|min:8|confirmed
avatar_url: nullable|url|max:2048
role: required|in:dentist,assistant
status: required|in:active,inactive,suspended
branch: required|string|max:255
department: nullable|string|max:100
specialty: nullable|string|max:100
license_number: nullable|string|max:100
experience_years: nullable|integer|min:0|max:80
gender: nullable|in:male,female,other
dob: nullable|date|before:today
working_hours: nullable|string|max:100
calendar_color: nullable|string regex /^#[0-9A-Fa-f]{6}$/
notes: nullable|string|max:2000
tags: nullable|array
tags.*: string|max:50
permissions: prohibited
```

### Error Responses

- `401 UNAUTHENTICATED`
- `403 FORBIDDEN`
- `409 EMAIL_ALREADY_EXISTS`
- `422 VALIDATION_ERROR`

## 4. Update User

```http
PUT /clinic/users/{id}
```

### Request Body

All fields are optional, but at least one field must be present.

```json
{
  "first_name": "Mona",
  "last_name": "Hassan",
  "email": "mona@example.com",
  "phone": "+201000000000",
  "avatar_url": null,
  "role": "assistant",
  "status": "inactive",
  "branch": "Downtown",
  "department": "Clinical",
  "specialty": null,
  "license_number": null,
  "experience_years": 8,
  "gender": "female",
  "dob": "1990-01-20",
  "working_hours": "10:00-16:00",
  "calendar_color": "#0ea5e9",
  "notes": "Moved branch",
  "tags": []
}
```

Do not send `permissions`.

### Response Body

```json
{
  "message": "User updated successfully.",
  "data": {
    "id": "usr_123",
    "first_name": "Mona",
    "last_name": "Hassan",
    "email": "mona@example.com",
    "phone": "+201000000000",
    "avatar_url": null,
    "role": "assistant",
    "status": "inactive",
    "branch": "Downtown",
    "department": "Clinical",
    "specialty": null,
    "license_number": null,
    "experience_years": 8,
    "gender": "female",
    "dob": "1990-01-20",
    "working_hours": "10:00-16:00",
    "calendar_color": "#0ea5e9",
    "notes": "Moved branch",
    "tags": [],
    "two_factor": false,
    "online": false,
    "last_login_at": "2026-06-10T11:45:00Z",
    "created_at": "2026-06-01T09:00:00Z",
    "updated_at": "2026-06-12T12:00:00Z"
  }
}
```

### Validation Rules

```text
id: required|exists:clinic_users,id scoped to authenticated clinic
first_name: sometimes|required|string|max:100
last_name: sometimes|required|string|max:100
email: sometimes|required|email|max:255|unique:clinic_users,email,{id}
phone: nullable|string|max:30
avatar_url: nullable|url|max:2048
role: sometimes|required|in:dentist,assistant
status: sometimes|required|in:active,inactive,suspended
branch: sometimes|required|string|max:255
department: nullable|string|max:100
specialty: nullable|string|max:100
license_number: nullable|string|max:100
experience_years: nullable|integer|min:0|max:80
gender: nullable|in:male,female,other
dob: nullable|date|before:today
working_hours: nullable|string|max:100
calendar_color: nullable|string regex /^#[0-9A-Fa-f]{6}$/
notes: nullable|string|max:2000
tags: nullable|array
tags.*: string|max:50
permissions: prohibited
password: prohibited
```

### Error Responses

- `401 UNAUTHENTICATED`
- `403 FORBIDDEN`
- `404 USER_NOT_FOUND`
- `409 EMAIL_ALREADY_EXISTS`
- `422 VALIDATION_ERROR`

## 5. Delete User

```http
DELETE /clinic/users/{id}
```

### Request Body

No request body.

### Response Body

```json
{
  "message": "User deleted successfully."
}
```

Alternatively, `204 No Content` is acceptable.

### Validation Rules

```text
id: required|exists:clinic_users,id scoped to authenticated clinic
```

Recommended backend safeguards:

- Do not allow deleting the authenticated user.
- Do not allow deleting the last active dentist/admin-equivalent user if that would lock the clinic out.

### Error Responses

- `401 UNAUTHENTICATED`
- `403 FORBIDDEN`
- `404 USER_NOT_FOUND`
- `409 CANNOT_DELETE_SELF`
- `409 CANNOT_DELETE_LAST_PRIVILEGED_USER`

## 6. Change Password

```http
POST /clinic/users/{id}/change-password
```

### Request Body

```json
{
  "password": "NewStrongPassword123!",
  "password_confirmation": "NewStrongPassword123!"
}
```

### Response Body

```json
{
  "message": "Password changed successfully."
}
```

### Validation Rules

```text
id: required|exists:clinic_users,id scoped to authenticated clinic
password: required|string|min:8|confirmed
```

Recommended password policy:

- Minimum 8 characters.
- Must include at least one uppercase letter, one lowercase letter and one number.
- Reject passwords found in known breach lists if available.

### Error Responses

- `401 UNAUTHENTICATED`
- `403 FORBIDDEN`
- `404 USER_NOT_FOUND`
- `422 VALIDATION_ERROR`

## 7. Get Login History

```http
GET /clinic/users/{id}/login-history
```

### Query Parameters

| Name | Type | Required | Notes |
| --- | --- | --- | --- |
| `page` | integer | no | Default `1`. |
| `limit` | integer | no | Default `20`, max `100`. |

### Response Body

```json
{
  "data": [
    {
      "id": "login_123",
      "logged_at": "2026-06-12T08:30:00Z",
      "ip_address": "197.45.10.20",
      "user_agent": "Mozilla/5.0 ...",
      "status": "success",
      "failure_reason": null
    },
    {
      "id": "login_124",
      "logged_at": "2026-06-11T19:10:00Z",
      "ip_address": "197.45.10.21",
      "user_agent": "Mozilla/5.0 ...",
      "status": "failed",
      "failure_reason": "Invalid password"
    }
  ],
  "meta": {
    "total": 2,
    "per_page": 20,
    "current_page": 1,
    "last_page": 1
  }
}
```

### Validation Rules

```text
id: required|exists:clinic_users,id scoped to authenticated clinic
page: nullable|integer|min:1
limit: nullable|integer|min:1|max:100
```

### Error Responses

- `401 UNAUTHENTICATED`
- `403 FORBIDDEN`
- `404 USER_NOT_FOUND`
- `422 VALIDATION_ERROR`

## Frontend Endpoint Usage

| UI Action | Endpoint |
| --- | --- |
| Page load | `GET /clinic/users?limit=200` |
| Filter users | `GET /clinic/users?search=&role=&status=&branch=` or client-side filtering after page load |
| View Profile | `GET /clinic/users/{id}` when fresh data is needed |
| Create User | `POST /clinic/users` |
| Edit User | `PUT /clinic/users/{id}` |
| Change Password | `POST /clinic/users/{id}/change-password` |
| Login History | `GET /clinic/users/{id}/login-history` |
| Delete User | `DELETE /clinic/users/{id}` |
| Status management | `PUT /clinic/users/{id}` with `status` |
| Branch assignment | `PUT /clinic/users/{id}` with `branch` |

## Backend Acceptance Checklist

- `role` accepts only `dentist` and `assistant`.
- The backend assigns permissions automatically from the selected role.
- Frontend payloads containing `permissions` are rejected or ignored safely.
- Users can be listed, viewed, created, updated and deleted.
- Password changes use the dedicated change password endpoint.
- Login history is available per user.
- Status can be managed through user update.
- Branch can be assigned through user create/update.
- No roles, permissions or audit log endpoints are required for this frontend module.
