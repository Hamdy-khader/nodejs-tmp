# Dental Harmony Panel — API Contract

> **Stack الحالي**: التطبيق يعتمد على `localStorage` لتخزين البيانات و Supabase Auth للمصادقة فقط.
> هذا العقد يصف الـ REST API الكاملة التي يحتاجها النظام لربطه بأي Backend.

---

## Base URL

```
https://api.yourdomain.com/v1
```

---

## Authentication

جميع الطلبات (عدا `/auth/*`) تحتاج:

```http
Authorization: Bearer <supabase_access_token>
```

**مصدر التوكن**: `supabase.auth.getSession()` → `session.access_token`

**التحقق من التوكن (Server-side)**:
```typescript
supabase.auth.getClaims(token)
// → data.claims.sub = userId
```

---

## 1. Authentication API

### POST `/auth/login`
```json
// Request
{
  "email": "doctor@clinic.com",
  "password": "min6chars"
}

// Response 200
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "user": {
    "id": "uuid",
    "email": "doctor@clinic.com"
  }
}

// Response 401
{ "error": "Invalid credentials" }
```

### POST `/auth/signup`
```json
// Request
{
  "email": "doctor@clinic.com",
  "password": "min6chars",
  "redirect_to": "https://app.yourdomain.com/"
}

// Response 200
{ "message": "Check your email for verification link" }
```

### GET `/auth/session`
```json
// Response 200
{
  "user_id": "uuid",
  "email": "doctor@clinic.com",
  "expires_at": 1700000000
}
```

### POST `/auth/logout`
```json
// Response 200
{ "message": "Logged out" }
```

---

## 2. Patients API

### GET `/patients`
```
Query Params:
  search?     string    — search by name/email/phone
  page?       number    — default: 1
  limit?      number    — default: 20
```

```json
// Response 200
{
  "data": [
    {
      "id": "uuid",
      "name": "محمد أحمد",
      "email": "patient@email.com",
      "phone": "+971501234567",
      "date_of_birth": "1990-05-15",
      "language": "ar",
      "currency": "AED",
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 120,
  "page": 1,
  "limit": 20
}
```

### POST `/patients`
```json
// Request
{
  "name": "محمد أحمد",
  "email": "patient@email.com",
  "phone": "+971501234567",
  "date_of_birth": "1990-05-15",
  "language": "ar",
  "currency": "AED"
}

// Response 201
{
  "id": "uuid",
  "name": "محمد أحمد",
  "email": "patient@email.com",
  "phone": "+971501234567",
  "date_of_birth": "1990-05-15",
  "language": "ar",
  "currency": "AED",
  "created_at": "2024-01-15T10:00:00Z"
}
```

### GET `/patients/:patientId`
```json
// Response 200
{
  "id": "uuid",
  "name": "محمد أحمد",
  "email": "patient@email.com",
  "phone": "+971501234567",
  "date_of_birth": "1990-05-15",
  "language": "ar",
  "currency": "AED",
  "created_at": "2024-01-15T10:00:00Z"
}

// Response 404
{ "error": "Patient not found" }
```

### PUT `/patients/:patientId`
```json
// Request (partial update supported)
{
  "name": "محمد أحمد علي",
  "phone": "+971509999999"
}

// Response 200 — updated patient object
```

### DELETE `/patients/:patientId`
```json
// Response 200
{ "message": "Patient deleted" }

// Response 404
{ "error": "Patient not found" }
```

---

## 3. Treatment Plans API

### GET `/patients/:patientId/plans`
```json
// Response 200
{
  "data": [
    {
      "id": "uuid",
      "patient_id": "uuid",
      "name": "خطة العلاج الأولى",
      "notes": "ملاحظات عامة",
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-20T12:00:00Z"
    }
  ]
}
```

### POST `/patients/:patientId/plans`
```json
// Request
{
  "name": "خطة العلاج الأولى",
  "notes": "ملاحظات عامة",
  "teeth": {
    "11": { "number": 11, "status": "caries", "note": "تسوس متوسط", "diagnosis": ["تسوس"] },
    "21": { "number": 21, "status": "intact" }
  },
  "xrays": ["data:image/png;base64,..."],
  "general_statuses": ["Bone Loss", "Gum Disease"],
  "treatments": [
    {
      "id": "uuid",
      "kind": "visit",
      "label": "الزيارة الأولى",
      "note": "",
      "items": [
        {
          "id": "uuid",
          "name": "حشو ضرس",
          "tooth_number": 11,
          "amount": 1,
          "unit_price": 500
        }
      ]
    },
    {
      "id": "uuid",
      "kind": "healing",
      "label": "فترة التعافي",
      "days": 7
    },
    {
      "id": "uuid",
      "kind": "discount",
      "mode": "percent",
      "value": 10,
      "note": "خصم كاشير"
    }
  ],
  "treatment_note": "يُنصح بالمتابعة كل 6 أشهر",
  "billing_mode": "payment",
  "insurance": {
    "unused_max": 5000,
    "deductible": 200
  },
  "payment_plan": {
    "amount": 3000,
    "term": 12,
    "interest": 0
  }
}

// Response 201 — full plan object
```

### GET `/patients/:patientId/plans/:planId`
```json
// Response 200 — full plan object (same shape as POST request + id, created_at, updated_at)
```

### PUT `/patients/:patientId/plans/:planId`
```json
// Request — same shape as POST (partial update supported)
// Response 200 — updated plan object
```

### DELETE `/patients/:patientId/plans/:planId`
```json
// Response 200
{ "message": "Plan deleted" }
```

---

## 4. Clinic Fees (Price List) API

### GET `/clinic-fees`
```json
// Response 200
{
  "data": [
    {
      "id": "uuid",
      "n": 1,
      "label": "أسنان الأطفال",
      "icon": "baby-tooth",
      "groups": [
        {
          "id": "uuid",
          "title": "العلاجات الأساسية",
          "price_label": "السعر",
          "items": [
            {
              "id": "uuid",
              "name": "حشو مؤقت",
              "price": 150,
              "note": "للسن المؤقت"
            }
          ]
        }
      ]
    }
  ]
}
```

### PUT `/clinic-fees`
```json
// Request — full array of sections (replace all)
// Response 200 — updated sections array
```

### POST `/clinic-fees/sections`
```json
// Request
{
  "n": 5,
  "label": "قسم جديد",
  "icon": "tooth",
  "groups": []
}
// Response 201 — new section
```

### PUT `/clinic-fees/sections/:sectionId`
```json
// Request
{
  "label": "قسم محدث",
  "icon": "crown"
}
// Response 200 — updated section
```

### DELETE `/clinic-fees/sections/:sectionId`
```json
// Response 200
{ "message": "Section deleted" }
```

---

## 5. Templates API

### GET `/templates`
```
Query Params:
  category?   "diagnosis" | "treatments" | "dentists" | "other"
  language?   string
```

```json
// Response 200
{
  "data": [
    {
      "id": "uuid",
      "title": "تقرير التشخيص",
      "category": "diagnosis",
      "language": "ar",
      "body": "<p>محتوى HTML...</p>",
      "order": 1,
      "updated_at": "2024-01-15T10:00:00Z"
    }
  ]
}
```

### POST `/templates`
```json
// Request
{
  "title": "تقرير جديد",
  "category": "diagnosis",
  "language": "ar",
  "body": "<p>المحتوى...</p>",
  "order": 2
}
// Response 201 — new template
```

### PUT `/templates/:templateId`
```json
// Request (partial update supported)
{
  "title": "تقرير محدث",
  "body": "<p>محتوى محدث...</p>"
}
// Response 200 — updated template
```

### DELETE `/templates/:templateId`
```json
// Response 200
{ "message": "Template deleted" }
```

---

## 6. Plan Settings API

### GET `/plan-settings`
```json
// Response 200
{
  "language": "ar",
  "page_size": "A4",
  "price_list_design": "detailed",
  "price_page": {
    "show_prices": true,
    "show_subtotal": true,
    "show_discount": true,
    "show_tax": false,
    "show_total": true,
    "show_insurance": false,
    "currency": "AED"
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
      "cover_image": "data:image/png;base64,...",
      "title": "خطة العلاج",
      "subtitle": "عيادة الانسجام"
    },
    "inner_pages": {
      "header_text": "سري وخاص بالمريض",
      "show_footer": true
    },
    "animation_page": {
      "mode": "default",
      "custom_note": null
    },
    "back_cover": {
      "back_image": null,
      "note": "شكراً لثقتكم"
    }
  },
  "updated_at": "2024-01-15T10:00:00Z"
}
```

### PUT `/plan-settings`
```json
// Request — full or partial settings object
// Response 200 — updated settings
```

---

## 7. Users & Roles API

### GET `/users`
```
Query Params:
  role?       string
  status?     "active" | "inactive" | "suspended"
  branch?     string
  search?     string
  page?       number
  limit?      number
```

```json
// Response 200
{
  "data": [
    {
      "id": "uuid",
      "first_name": "أحمد",
      "last_name": "محمد",
      "email": "doctor@clinic.com",
      "phone": "+971501234567",
      "avatar_url": "https://...",
      "role": "dentist",
      "status": "active",
      "branch": "الفرع الرئيسي",
      "department": "زرع الأسنان",
      "specialty": "تقويم",
      "license_number": "DM12345",
      "experience_years": 10,
      "gender": "male",
      "dob": "1985-03-20",
      "working_hours": "9am-5pm",
      "calendar_color": "#3B82F6",
      "last_login": "2024-01-20T09:00:00Z",
      "created_at": "2023-01-01T00:00:00Z",
      "notes": "",
      "tags": ["خبير تقويم"],
      "two_factor": false,
      "online": true
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 20
}
```

### POST `/users`
```json
// Request
{
  "first_name": "أحمد",
  "last_name": "محمد",
  "email": "newdoctor@clinic.com",
  "phone": "+971501234567",
  "role": "dentist",
  "branch": "الفرع الرئيسي",
  "status": "active"
  // ... optional fields
}
// Response 201 — new user object
```

### GET `/users/:userId`
```json
// Response 200 — full user object
```

### PUT `/users/:userId`
```json
// Request — partial update
// Response 200 — updated user
```

### DELETE `/users/:userId`
```json
// Response 200
{ "message": "User deleted" }
```

---

## 8. Roles & Permissions API

### GET `/roles`
```json
// Response 200
{
  "data": [
    {
      "key": "dentist",
      "name": "طبيب أسنان",
      "description": "يملك صلاحيات التشخيص والعلاج",
      "color": "blue",
      "built_in": true,
      "permissions": [
        "patients.read",
        "patients.write",
        "plans.read",
        "plans.write"
      ]
    }
  ]
}
```

### POST `/roles`
```json
// Request
{
  "key": "senior_dentist",
  "name": "طبيب أسنان أول",
  "description": "طبيب ذو خبرة",
  "color": "purple",
  "permissions": ["patients.read", "patients.write", "plans.read", "plans.write", "users.read"]
}
// Response 201 — new role
```

### PUT `/roles/:roleKey`
```json
// Request
{
  "name": "اسم جديد",
  "permissions": ["patients.read"]
}
// Response 200 — updated role
```

### DELETE `/roles/:roleKey`
```json
// Response 200
{ "message": "Role deleted" }

// Response 400 (built-in role)
{ "error": "Cannot delete built-in role" }
```

### GET `/permissions`
```json
// Response 200
{
  "data": [
    { "key": "patients.read",  "group": "Patients",  "label": "عرض المرضى" },
    { "key": "patients.write", "group": "Patients",  "label": "إضافة/تعديل المرضى" },
    { "key": "plans.read",     "group": "Plans",     "label": "عرض خطط العلاج" },
    { "key": "plans.write",    "group": "Plans",     "label": "إنشاء/تعديل خطط العلاج" },
    { "key": "users.read",     "group": "Users",     "label": "عرض المستخدمين" },
    { "key": "users.write",    "group": "Users",     "label": "إدارة المستخدمين" },
    { "key": "fees.read",      "group": "Fees",      "label": "عرض قائمة الأسعار" },
    { "key": "fees.write",     "group": "Fees",      "label": "تعديل قائمة الأسعار" },
    { "key": "templates.read", "group": "Templates", "label": "عرض القوالب" },
    { "key": "templates.write","group": "Templates", "label": "تعديل القوالب" }
  ]
}
```

---

## 9. Audit Logs API

### GET `/audit-logs`
```
Query Params:
  actor?      string
  action?     string
  from?       ISO date
  to?         ISO date
  page?       number
  limit?      number
```

```json
// Response 200
{
  "data": [
    {
      "id": "uuid",
      "at": "2024-01-20T09:00:00Z",
      "actor": "أحمد محمد",
      "action": "patient.created",
      "target": "محمد علي",
      "details": "تم إضافة مريض جديد"
    }
  ],
  "total": 500,
  "page": 1,
  "limit": 20
}
```

---

## 10. Overview / Analytics API

### GET `/overview/stats`
```json
// Response 200
{
  "total_patients": 250,
  "active_plans": 45,
  "completed_plans": 180,
  "total_revenue": 125000,
  "currency": "AED",
  "period": "2024-01"
}
```

### GET `/overview/revenue`
```
Query Params:
  from?   ISO date
  to?     ISO date
  group?  "day" | "week" | "month"  (default: month)
```

```json
// Response 200
{
  "data": [
    { "period": "2024-01", "revenue": 15000 },
    { "period": "2024-02", "revenue": 18000 }
  ]
}
```

---

## Data Types Reference

### ToothStatus
```typescript
type ToothStatus =
  | "intact"       // سليم
  | "missing"      // مفقود
  | "caries"       // تسوس
  | "filled"       // محشو
  | "crown"        // تاج
  | "root-treated" // علاج عصب
  | "implant"      // زرعة
  | "bridge";      // جسر
```

### TreatmentRow kinds
```typescript
type TreatmentKind = "visit" | "healing" | "discount";
```

### RoleKey (built-in)
```typescript
type RoleKey =
  | "super_admin"
  | "admin"
  | "dentist"
  | "assistant"
  | "receptionist"
  | "accountant"
  | "lab_technician"
  | "viewer";
```

### UserStatus
```typescript
type UserStatus = "active" | "inactive" | "suspended";
```

### DiscountMode
```typescript
type DiscountMode = "amount" | "percent";
```

### BillingMode
```typescript
type BillingMode = "insurance" | "payment";
```

### PageSize
```typescript
type PageSize = "A4" | "Letter" | "Legal";
```

### PriceListDesign
```typescript
type PriceListDesign = "compact" | "detailed" | "minimal";
```

### TemplateCategory
```typescript
type TemplateCategory = "diagnosis" | "treatments" | "dentists" | "other";
```

---

## Error Responses

جميع الأخطاء تتبع هذا الشكل:

```json
{
  "error": "رسالة الخطأ",
  "code": "ERROR_CODE",        // اختياري
  "details": {}                // اختياري — تفاصيل إضافية
}
```

| Status Code | المعنى |
|-------------|--------|
| `200` | نجاح |
| `201` | تم الإنشاء |
| `400` | طلب خاطئ (Validation Error) |
| `401` | غير مصادق (Invalid/Expired Token) |
| `403` | غير مصرح (No Permission) |
| `404` | غير موجود |
| `409` | تعارض (مثلاً: email مكرر) |
| `500` | خطأ في السيرفر |

---

## LocalStorage Keys (الحالة الحالية)

البيانات مخزنة حالياً في المتصفح بهذه المفاتيح:

| Key | البيانات |
|-----|----------|
| `brightplans:data:v1` | المرضى + خطط العلاج |
| `brightplans:documents:v2` | اختيارات الوثائق |
| `brightplans:templates:v1` | القوالب |
| `brightplans:pricelist:v1` | قائمة الأسعار |
| `brightplans:plan-settings:v1` | إعدادات الخطة |
| `bp.users.v1` | المستخدمون والأدوار |
| `supabase.auth.v1` | جلسة المصادقة |

---

## Migration Path

للانتقال من localStorage إلى API:

1. كل store file في `src/lib/*-store.ts` يحتاج استبدال `localStorage.getItem/setItem` بـ `fetch('/api/...')`
2. استخدم **TanStack Query** (موجود مسبقاً في المشروع) لجميع الـ API calls
3. الـ Auth token جاهز — موجود في `supabase.auth.getSession()`
