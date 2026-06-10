# Treatly Online API Contract

هذا المستند يصف `API contract` المطلوب لتغطية كل العمليات الظاهرة في النظام الحالي، مع ملاحظات تصميم تساعد مباشرة في بناء قاعدة البيانات.

المستند مبني على ما هو مستخدم فعليًا في الواجهة الحالية:

- إدارة العيادات من لوحة الأدمن
- إدارة مستخدمي العيادة
- المرضى
- خطط العلاج
- قائمة الأسعار
- القوالب
- اختيار المستندات
- إعدادات الخطة
- المستخدمون والأدوار والصلاحيات
- السجلات والإحصائيات

---

## 1. Architecture

يوجد مساران منفصلان في النظام:

- `Admin API`: لإدارة المنصة والعيادات
- `Clinic API`: لاستخدام العيادة داخل التطبيق

### Base URLs

```txt
https://api.yourdomain.com/api/admin
https://api.yourdomain.com/api/clinic
```

### Auth Headers

كل الطلبات المحمية تحتاج:

```http
Authorization: Bearer <token>
Accept: application/json
Content-Type: application/json
```

### Response Envelope

يفضل توحيد جميع الردود بهذا الشكل:

```json
{
  "success": true,
  "data": {},
  "meta": {},
  "message": "optional"
}
```

وفي حالة الخطأ:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The given data was invalid.",
    "errors": {
      "email": ["The email field is required."]
    }
  }
}
```

---

## 2. Common Database Design Notes

### Multi-tenant model

كل البيانات التشغيلية يجب أن تكون مربوطة بـ `clinic_id` حتى يتم عزل بيانات كل عيادة بالكامل.

### Recommended core tables

```txt
admins
clinics
clinic_users
patients
treatment_plans
treatment_plan_teeth
treatment_plan_xrays
treatment_plan_general_statuses
treatment_plan_rows
treatment_plan_items
clinic_pricelist_settings
clinic_pricelist_sections
clinic_pricelist_groups
clinic_pricelist_items
templates
document_presets
document_preset_items
plan_settings
roles
permissions
role_permissions
clinic_user_roles
audit_logs
media_files
```

### Shared columns

يفضل أن تحتوي أغلب الجداول على:

```txt
id
clinic_id            // إلا في جداول الأدمن العامة
created_at
updated_at
deleted_at           // لو ستستخدم soft delete
created_by
updated_by
```

### Files

لا يفضل حفظ الصور أو ملفات الأشعة أو أغلفة الصفحات بصيغة `base64` داخل قاعدة البيانات. الأفضل:

- تخزين الملف في `S3` أو `Supabase Storage` أو أي object storage
- حفظ الرابط أو المفتاح فقط داخل قاعدة البيانات

---

## 3. Admin Auth API

هذه الواجهات خاصة بالأدمن فقط.

### POST `/admin/login`

```json
{
  "email": "admin@treatlyonline.de",
  "password": "secret"
}
```

```json
{
  "success": true,
  "data": {
    "token": "jwt-token",
    "admin": {
      "id": 1,
      "name": "System Admin",
      "email": "admin@treatlyonline.de",
      "status": "active",
      "created_at": "2026-06-03T10:00:00Z"
    }
  }
}
```

### POST `/admin/logout`

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### GET `/admin/me`

يرجع بيانات الأدمن الحالي.

### GET `/admin/stats`

```json
{
  "success": true,
  "data": {
    "total_clinics": 240,
    "active_clinics": 220,
    "suspended_clinics": 20,
    "total_clinic_users": 1810,
    "new_clinics_this_month": 14
  }
}
```

### DB notes

- جدول `admins`
- إن كان هناك صلاحيات أدمن متعددة، أضف `admin_roles` و `admin_role_permissions`

---

## 4. Admin Clinics API

هذه الواجهات لإدارة العيادات من لوحة الأدمن.

### GET `/admin/clinics`

Query params:

```txt
q?        string
status?   active | suspended
page?     number
limit?    number
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": 12,
      "name": "Dental Harmony",
      "email": "info@clinic.com",
      "phone": "+201000000000",
      "country": "Egypt",
      "city": "Cairo",
      "address": "Nasr City",
      "website_url": "https://clinic.com",
      "logo": "https://cdn.example.com/logo.png",
      "contact_person_name": "Dr Ahmed",
      "contact_person_phone": "+201111111111",
      "status": "active",
      "notes": "VIP client",
      "users_count": 6,
      "created_at": "2026-06-01T08:00:00Z",
      "updated_at": "2026-06-03T09:00:00Z"
    }
  ],
  "meta": {
    "total": 1,
    "per_page": 15,
    "current_page": 1,
    "last_page": 1
  }
}
```

### POST `/admin/clinics`

```json
{
  "name": "Dental Harmony",
  "email": "info@clinic.com",
  "phone": "+201000000000",
  "country": "Egypt",
  "city": "Cairo",
  "address": "Nasr City",
  "website_url": "https://clinic.com",
  "logo": "https://cdn.example.com/logo.png",
  "contact_person_name": "Dr Ahmed",
  "contact_person_phone": "+201111111111",
  "notes": "optional"
}
```

### Required

- `name`
- `email`

### GET `/admin/clinics/{clinicId}`

يرجع بيانات العيادة.

### PUT `/admin/clinics/{clinicId}`

تحديث بيانات العيادة.

### DELETE `/admin/clinics/{clinicId}`

ينصح أن يكون `soft delete` وليس حذفًا نهائيًا.

### PATCH `/admin/clinics/{clinicId}/suspend`

### PATCH `/admin/clinics/{clinicId}/activate`

### DB notes

جدول `clinics`:

```txt
id
name
email
phone
country
city
address
website_url
logo
contact_person_name
contact_person_phone
status
notes
created_at
updated_at
deleted_at
```

قيود مهمة:

- `email` unique
- `status` enum: `active`, `suspended`

---

## 5. Admin Clinic Users API

هذه الواجهات لإدارة مستخدمي كل عيادة من لوحة الأدمن.

### GET `/admin/clinics/{clinicId}/users`

Query params:

```txt
q?        string
status?   active | inactive
role?     clinic_owner | clinic_admin | clinic_staff
page?     number
limit?    number
```

### POST `/admin/clinics/{clinicId}/users`

```json
{
  "full_name": "Dr Ahmed Mohamed",
  "email": "doctor@clinic.com",
  "phone": "+201222222222",
  "role": "clinic_admin",
  "status": "active",
  "password": "secret123"
}
```

### GET `/admin/clinic-users/{userId}`

### PUT `/admin/clinic-users/{userId}`

### DELETE `/admin/clinic-users/{userId}`

### PATCH `/admin/clinic-users/{userId}/activate`

### PATCH `/admin/clinic-users/{userId}/deactivate`

### DB notes

جدول `clinic_users`:

```txt
id
clinic_id
full_name
email
phone
password_hash
role
status
last_login_at
created_at
updated_at
deleted_at
```

قيود مهمة:

- `clinic_id` foreign key
- `email` unique
- `role` enum: `clinic_owner`, `clinic_admin`, `clinic_staff`

---

## 6. Clinic Auth API

هذه الواجهات لمستخدمي العيادة.

### POST `/clinic/login`

```json
{
  "email": "doctor@clinic.com",
  "password": "secret"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "token": "jwt-token",
    "clinic_user": {
      "id": 100,
      "clinic_id": 12,
      "full_name": "Dr Ahmed Mohamed",
      "email": "doctor@clinic.com",
      "role": "clinic_admin",
      "status": "active"
    },
    "clinic": {
      "id": 12,
      "name": "Dental Harmony",
      "status": "active"
    }
  }
}
```

### POST `/clinic/logout`

### GET `/clinic/me`

Suggested response additions for account defaults:

```json
{
  "success": true,
  "data": {
    "clinic_user": {
      "id": 100,
      "clinic_id": 12,
      "full_name": "Dr Ahmed Mohamed",
      "email": "doctor@clinic.com",
      "role": "clinic_admin",
      "status": "active",
      "preferred_language": "English (EN)",
      "preferred_currency": "USD"
    }
  }
}
```

### PUT `/clinic/me/preferences`

```json
{
  "preferred_language": "English (EN)",
  "preferred_currency": "USD"
}
```

يعيد:

- المستخدم الحالي
- العيادة الحالية
- يمكن إضافة الصلاحيات المجمعة إن لزم

---

## 7. Patients API

### GET `/clinic/patients`

Query params:

```txt
search?   string
page?     number
limit?    number
sort?     created_at | name
order?    asc | desc
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "pat_001",
      "clinic_id": 12,
      "name": "Mohamed Ahmed",
      "email": "patient@email.com",
      "phone": "+20123456789",
      "date_of_birth": "1990-05-15",
      "created_at": "2026-06-03T10:00:00Z",
      "updated_at": "2026-06-03T10:00:00Z"
    }
  ],
  "meta": {
    "total": 55,
    "per_page": 20,
    "current_page": 1,
    "last_page": 3
  }
}
```

### POST `/clinic/patients`

```json
{
  "name": "Mohamed Ahmed",
  "email": "patient@email.com",
  "phone": "+20123456789",
  "date_of_birth": "1990-05-15"
}
```

### Required

- `name`

### GET `/clinic/patients/{patientId}`

### PUT `/clinic/patients/{patientId}`

يدعم `partial update`.

### DELETE `/clinic/patients/{patientId}`

يفضل `soft delete`.

### DB notes

جدول `patients`:

```txt
id
clinic_id
name
email
phone
date_of_birth
created_at
updated_at
deleted_at
```

فهرسة مقترحة:

- `(clinic_id, name)`
- `(clinic_id, phone)`
- `(clinic_id, created_at)`

---

## 8. Treatment Plans API

هذا الجزء هو الأهم في بناء قاعدة البيانات، لأن الخطة تحتوي بيانات مركبة وليست flat.

### 8.1 GET `/clinic/patients/{patientId}/plans`

```json
{
  "success": true,
  "data": [
    {
      "id": "plan_001",
      "patient_id": "pat_001",
      "name": "Initial assessment",
      "notes": "Routine checkup",
      "billing_mode": "payment",
      "created_at": "2026-06-03T10:00:00Z",
      "updated_at": "2026-06-03T10:00:00Z"
    }
  ]
}
```

### 8.2 POST `/clinic/patients/{patientId}/plans`

```json
{
  "name": "Initial assessment",
  "notes": "Routine checkup",
  "billing_mode": "payment",
  "insurance": {
    "unused_max": 5000,
    "deductible": 200
  },
  "payment_plan": {
    "amount": 3000,
    "term": 12,
    "interest": 0
  },
  "treatment_note": "Follow-up every 6 months"
}
```

### 8.3 GET `/clinic/patients/{patientId}/plans/{planId}`

يرجع الخطة كاملة مع الأسنان والأشعة والصفوف العلاجية.

### Response shape

```json
{
  "success": true,
  "data": {
    "id": "plan_001",
    "patient_id": "pat_001",
    "name": "Initial assessment",
    "notes": "Routine checkup",
    "billing_mode": "payment",
    "insurance": {
      "unused_max": 5000,
      "deductible": 200
    },
    "payment_plan": {
      "amount": 3000,
      "term": 12,
      "interest": 0
    },
    "treatment_note": "Follow-up every 6 months",
    "teeth": [
      {
        "tooth_number": 11,
        "status": "caries",
        "note": "moderate caries",
        "diagnosis": ["caries"]
      }
    ],
    "xrays": [
      {
        "id": "xray_001",
        "file_url": "https://cdn.example.com/xrays/1.png",
        "sort_order": 1
      }
    ],
    "general_statuses": [
      {
        "id": "gs_001",
        "label": "Bone Loss"
      }
    ],
    "treatment_rows": [
      {
        "id": "row_001",
        "kind": "visit",
        "label": "Visit 1",
        "note": "",
        "sort_order": 1,
        "items": [
          {
            "id": "item_001",
            "name": "Filling",
            "tooth_number": 11,
            "amount": 1,
            "unit_price": 500,
            "sort_order": 1
          }
        ]
      },
      {
        "id": "row_002",
        "kind": "healing",
        "label": "Healing",
        "note": "",
        "days": 7,
        "sort_order": 2
      },
      {
        "id": "row_003",
        "kind": "discount",
        "note": "Cash discount",
        "mode": "percent",
        "value": 10,
        "sort_order": 3
      }
    ],
    "created_at": "2026-06-03T10:00:00Z",
    "updated_at": "2026-06-03T10:00:00Z"
  }
}
```

### 8.4 PUT `/clinic/patients/{patientId}/plans/{planId}`

تحديث عام للخطة الأساسية.

### 8.5 DELETE `/clinic/patients/{patientId}/plans/{planId}`

### 8.6 PUT `/clinic/plans/{planId}/teeth`

يحفظ حالة جميع الأسنان دفعة واحدة.

```json
{
  "teeth": [
    {
      "tooth_number": 11,
      "status": "caries",
      "note": "moderate caries",
      "diagnosis": ["caries"]
    },
    {
      "tooth_number": 21,
      "status": "intact",
      "note": null,
      "diagnosis": []
    }
  ]
}
```

### 8.7 PATCH `/clinic/plans/{planId}/teeth/{toothNumber}`

تحديث سن واحد فقط.

### 8.8 صور الأشعة X-ray Images — `/clinic/plans/{planId}/xrays`

#### GET `/clinic/plans/{planId}/xrays`

يرجع قائمة صور الأشعة الخاصة بالخطة العلاجية، مرتبة تصاعدياً حسب `sort_order`.

##### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "xray_001",
      "file_url": "https://cdn.example.com/xrays/plan_123/1.png",
      "sort_order": 1,
      "created_at": "2026-06-01T10:00:00Z",
      "updated_at": "2026-06-01T10:00:00Z"
    },
    {
      "id": "xray_002",
      "file_url": "https://cdn.example.com/xrays/plan_123/2.png",
      "sort_order": 2,
      "created_at": "2026-06-02T09:30:00Z",
      "updated_at": "2026-06-02T09:30:00Z"
    }
  ]
}
```

#### POST `/clinic/plans/{planId}/xrays`

رفع صورة أشعة جديدة وحفظها. الطلب من نوع **`multipart/form-data`** (وليس JSON) لأن الواجهة الأمامية ترسل ملف الصورة الفعلي مباشرة، وليس رابطاً جاهزاً.

##### Request — `multipart/form-data` fields

| Field        | Type   | Required | ملاحظات                                                  |
|--------------|--------|----------|-----------------------------------------------------------|
| `file`       | binary | نعم      | ملف الصورة (`image/png`, `image/jpeg`, `image/webp`)      |
| `sort_order` | int    | لا       | ترتيب العرض؛ افتراضياً = آخر ترتيب موجود + 1               |

##### Response — `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "xray_003",
    "file_url": "https://cdn.example.com/xrays/plan_123/3.png",
    "sort_order": 3,
    "created_at": "2026-06-08T08:00:00Z",
    "updated_at": "2026-06-08T08:00:00Z"
  }
}
```

##### ملاحظات تنفيذية للباكند

- **لا تُخزَّن الصورة كـ `base64` داخل قاعدة البيانات.** يُرفع الملف إلى object storage (S3 / Supabase Storage / Cloudflare R2 ...) ويُحفظ الرابط النهائي فقط في عمود `treatment_plan_xrays.file_url`، اتساقاً مع توصية قسم [Files](#files) أعلاه.
- يجب التحقق من:
  - أن `Content-Type` الخاص بالملف من نوع `image/*` فعلياً.
  - حجم الملف لا يتجاوز الحد الأقصى المسموح (يُقترح ~10MB — حدد الرقم النهائي وأبلغ الفرونت به).
- عند الرفض، استخدم نفس Response Envelope الموحّد للأخطاء (`error.code`, `error.message`)، أمثلة على أكواد مقترحة:
  - `INVALID_FILE_TYPE` — الملف ليس صورة مدعومة
  - `FILE_TOO_LARGE` — تجاوز الحجم الأقصى المسموح
  - `PLAN_NOT_FOUND` — الخطة العلاجية غير موجودة أو لا تتبع للعيادة الحالية

#### DELETE `/clinic/plans/{planId}/xrays/{xrayId}`

يحذف سجل صورة الأشعة من قاعدة البيانات **ومن الـ object storage أيضاً** (لتفادي تراكم ملفات يتيمة لا يشير إليها أي سجل).

##### Response

`204 No Content` — أو `200 OK` مع `{ "success": true, "data": null }` بحسب الاتفاقية المتبعة في بقية الـ API.

إذا لم يُعثر على السجل: `404 Not Found` بكود خطأ `XRAY_NOT_FOUND`.

### 8.10 PUT `/clinic/plans/{planId}/general-statuses`

```json
{
  "items": [{ "label": "Bone Loss" }, { "label": "Gum Disease" }]
}
```

### 8.11 PUT `/clinic/plans/{planId}/rows`

يحفظ ترتيب الصفوف العلاجية بالكامل.

### 8.12 POST `/clinic/plans/{planId}/rows`

```json
{
  "kind": "visit",
  "label": "Visit 1",
  "note": "",
  "days": null,
  "mode": null,
  "value": null,
  "sort_order": 1
}
```

### 8.13 PATCH `/clinic/plans/{planId}/rows/{rowId}`

### 8.14 DELETE `/clinic/plans/{planId}/rows/{rowId}`

### 8.15 POST `/clinic/plans/{planId}/rows/{rowId}/items`

خاص بصفوف `visit`.

```json
{
  "name": "Filling",
  "tooth_number": 11,
  "amount": 1,
  "unit_price": 500,
  "sort_order": 1
}
```

### 8.16 PATCH `/clinic/plans/{planId}/rows/{rowId}/items/{itemId}`

### 8.17 DELETE `/clinic/plans/{planId}/rows/{rowId}/items/{itemId}`

### Required business rules

- `kind = visit` يحتاج `items`
- `kind = healing` يحتاج `days`
- `kind = discount` يحتاج `mode` و `value`
- `billing_mode = insurance` يمكن أن يحتوي `insurance`
- `billing_mode = payment` يمكن أن يحتوي `payment_plan`

### DB notes

#### Table `treatment_plans`

```txt
id
clinic_id
patient_id
name
notes
billing_mode
insurance_unused_max
insurance_deductible
payment_plan_amount
payment_plan_term
payment_plan_interest
treatment_note
created_at
updated_at
deleted_at
```

#### Table `treatment_plan_teeth`

```txt
id
plan_id
tooth_number
status
note
diagnosis_json
created_at
updated_at
```

ملحوظة: `diagnosis` يمكن أن تكون `json` أو جدول منفصل لو أردت تقارير أكثر دقة.

#### Table `treatment_plan_xrays`

```txt
id
plan_id
file_url
sort_order
created_at
updated_at
```

#### Table `treatment_plan_general_statuses`

```txt
id
plan_id
label
sort_order
created_at
updated_at
```

#### Table `treatment_plan_rows`

```txt
id
plan_id
kind
label
note
days
discount_mode
discount_value
sort_order
created_at
updated_at
```

#### Table `treatment_plan_items`

```txt
id
row_id
name
tooth_number
amount
unit_price
sort_order
created_at
updated_at
```

---

## 9. Pricelist API

هذه الواجهات مطابقة تقريبًا لما يحتاجه النظام الحالي.

### GET `/clinic/pricelist`

إذا لم توجد بيانات محفوظة، يمكن للباك إرجاع default seed.

### Response

```json
{
  "success": true,
  "data": {
    "settings": {
      "language": "en",
      "currency_code": "USD",
      "currency_label": "United States dollar",
      "currency_symbol": "$"
    },
    "sections": [
      {
        "id": "extraction",
        "n": 1,
        "label": "Extraction",
        "icon": "scissors",
        "groups": [
          {
            "id": "grp_001",
            "title": "Extraction",
            "price_label": null,
            "items": [
              {
                "id": "pri_001",
                "name": "Wisdom Extraction",
                "price": 100,
                "note": ""
              }
            ]
          }
        ]
      }
    ]
  }
}
```

### PUT `/clinic/pricelist`

يحفظ `settings + sections + groups + items` دفعة واحدة.

### POST `/clinic/pricelist/items`

```json
{
  "group_id": "grp_001",
  "name": "New treatment",
  "price": 0,
  "note": ""
}
```

### PATCH `/clinic/pricelist/items/{itemId}`

### DELETE `/clinic/pricelist/items/{itemId}`

### DB notes

#### Table `clinic_pricelist_settings`

```txt
id
clinic_id
language
currency_code
currency_label
currency_symbol
created_at
updated_at
```

#### Table `clinic_pricelist_sections`

```txt
id
clinic_id
section_key
n
label
icon
display_order
created_at
updated_at
```

#### Table `clinic_pricelist_groups`

```txt
id
section_id
title
price_label
display_order
created_at
updated_at
```

#### Table `clinic_pricelist_items`

```txt
id
group_id
name
price
note
display_order
created_at
updated_at
```

---

## 10. Templates API

### GET `/clinic/templates`

Query params:

```txt
category?   diagnosis | treatments | dentists | other
language?   string
```

### POST `/clinic/templates`

```json
{
  "title": "Treatment summary",
  "category": "treatments",
  "language": "English",
  "body": "<p>Template body</p>",
  "order": 1
}
```

### GET `/clinic/templates/{templateId}`

### PUT `/clinic/templates/{templateId}`

### DELETE `/clinic/templates/{templateId}`

### PUT `/clinic/templates/reorder`

```json
{
  "category": "treatments",
  "ordered_ids": ["tmp_1", "tmp_2", "tmp_3"]
}
```

### DB notes

جدول `templates`:

```txt
id
clinic_id
title
category
language
body_html
display_order
updated_at
created_at
deleted_at
```

فئات مدعومة:

```txt
diagnosis
treatments
dentists
other
```

---

## 11. Documents Selection API

الواجهة الحالية لديها اختيار مستندات، ترتيب داخل كل قسم، و `undo/redo/reset`.
لا تحتاج قاعدة البيانات إلى حفظ الـ history نفسه إلا إذا أردت ذلك.

### 11.1 GET `/clinic/document-presets`

يرجع إعدادات اختيار المستندات الحالية للعيادة.

### Response

```json
{
  "success": true,
  "data": {
    "selected_ids": [
      "fixed:clinic:demo",
      "fixed:clinic:note",
      "fixed:diagnosis:note",
      "tmp_001",
      "fixed:other:guarantee"
    ],
    "order": {
      "clinic": [],
      "opg": [],
      "diagnosis": ["fixed:diagnosis:note", "tmp_003"],
      "treatments": ["fixed:treatments:note", "tmp_001"],
      "other": ["fixed:other:guarantee", "fixed:other:ourclinic"]
    }
  }
}
```

### 11.2 PUT `/clinic/document-presets`

```json
{
  "selected_ids": ["fixed:clinic:demo", "fixed:diagnosis:note", "tmp_001"],
  "order": {
    "clinic": ["fixed:clinic:demo", "fixed:clinic:note"],
    "opg": [],
    "diagnosis": ["fixed:diagnosis:note", "tmp_003"],
    "treatments": ["fixed:treatments:note", "tmp_001"],
    "other": ["fixed:other:guarantee", "fixed:other:ourclinic"]
  }
}
```

### 11.3 POST `/clinic/document-presets/reset`

يعيد الإعدادات الافتراضية.

### DB notes

الأفضل هنا استخدام جدولين:

#### Table `document_presets`

```txt
id
clinic_id
created_at
updated_at
```

#### Table `document_preset_items`

```txt
id
preset_id
section_id
document_ref
is_selected
display_order
created_at
updated_at
```

`document_ref` قد يشير إلى:

- عنصر ثابت مثل `fixed:clinic:demo`
- أو `template_id`

إذا أردت تصميمًا أنظف، يمكنك فصل الثابت عن القوالب:

- `source_type`: `fixed` | `template`
- `source_id`

---

## 12. Plan Settings API

### GET `/clinic/plan-settings`

### Response

```json
{
  "success": true,
  "data": {
    "language": "English (EN)",
    "page_size": "A4",
    "price_list_design": "detailed",
    "price_page": {
      "show_prices": true,
      "show_subtotal": true,
      "show_discount": true,
      "show_tax": false,
      "show_total": true,
      "show_insurance": true,
      "currency": "USD"
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
        "cover_image": "https://cdn.example.com/front.png",
        "title": "TREATMENT PLAN",
        "subtitle": "[PATIENT NAME]"
      },
      "inner_pages": {
        "header_text": "TITLE",
        "show_footer": true
      },
      "animation_page": {
        "mode": "default",
        "custom_note": ""
      },
      "back_cover": {
        "back_image": "https://cdn.example.com/back.png",
        "note": ""
      }
    },
    "updated_at": "2026-06-03T10:00:00Z"
  }
}
```

### PUT `/clinic/plan-settings`

يدعم التحديث الجزئي أو الكامل.

### Required validation

- `page_size`: `A4 | Letter | Legal`
- `price_list_design`: `compact | detailed | minimal`
- `animation_page.mode`: `default | custom`

### DB notes

جدول واحد يكفي:

#### Table `plan_settings`

```txt
id
clinic_id
language
page_size
price_list_design
price_page_json
plan_sections_json
page_design_json
created_at
updated_at
```

هذا أنسب من تفكيك الإعدادات إلى عدة جداول لأن هذه البيانات إعدادات ثابتة نسبيًا.

---

## 13. Clinic Internal Users / Roles / Permissions API

هذا الجزء يغطي شاشة إدارة المستخدمين داخل العيادة، وليس مستخدمي العيادة من منظور الأدمن فقط.

### 13.1 GET `/clinic/users`

Query params:

```txt
role?      string
status?    active | inactive | suspended
branch?    string
search?    string
page?      number
limit?     number
```

### 13.2 POST `/clinic/users`

```json
{
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
  "working_hours": "9am-5pm",
  "calendar_color": "#3B82F6",
  "notes": "",
  "tags": ["senior"],
  "two_factor": false
}
```

### 13.3 GET `/clinic/users/{userId}`

### 13.4 PUT `/clinic/users/{userId}`

### 13.5 DELETE `/clinic/users/{userId}`

### 13.6 POST `/clinic/users/bulk-status`

```json
{
  "user_ids": ["u1", "u2"],
  "status": "inactive"
}
```

### 13.7 POST `/clinic/users/bulk-role`

```json
{
  "user_ids": ["u1", "u2"],
  "role": "assistant"
}
```

### 13.8 POST `/clinic/users/{userId}/reset-password`

### DB notes

هذه البيانات يمكن حفظها في جدول `clinic_users` نفسه أو في جدول منفصل مثل `staff_users` حسب تصميم النظام.
إذا كان لديك بالفعل `clinic_users` للمصادقة، فالأفضل توسيعه بدل تكرار جدول آخر.

حقول مقترحة إضافية:

```txt
first_name
last_name
avatar_url
branch
department
specialty
license_number
experience_years
gender
dob
working_hours
calendar_color
notes
tags_json
two_factor
online
```

---

## 14. Roles & Permissions API

### GET `/clinic/roles`

### POST `/clinic/roles`

```json
{
  "key": "senior_dentist",
  "name": "Senior Dentist",
  "description": "Advanced dentist role",
  "color": "purple",
  "permissions": ["patients.read", "patients.write", "plans.read", "plans.write", "users.read"]
}
```

### PUT `/clinic/roles/{roleKey}`

### DELETE `/clinic/roles/{roleKey}`

### GET `/clinic/permissions`

### DB notes

#### Table `roles`

```txt
id
clinic_id nullable     // null لو role system-wide
key
name
description
color
built_in
created_at
updated_at
```

#### Table `permissions`

```txt
id
key
group_name
label
created_at
updated_at
```

#### Table `role_permissions`

```txt
id
role_id
permission_id
```

#### Table `clinic_user_roles`

```txt
id
clinic_user_id
role_id
```

إذا كان كل مستخدم له role واحد فقط، يمكنك الاكتفاء بحقل `role_key` داخل `clinic_users`.

---

## 15. Audit Logs API

### GET `/clinic/audit-logs`

Query params:

```txt
actor?     string
action?    string
from?      ISO date
to?        ISO date
page?      number
limit?     number
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "log_001",
      "at": "2026-06-03T10:00:00Z",
      "actor": "Ahmed Mohamed",
      "action": "patient.created",
      "target": "Mohamed Ahmed",
      "details": "Created from patients page"
    }
  ],
  "meta": {
    "total": 120,
    "per_page": 20,
    "current_page": 1,
    "last_page": 6
  }
}
```

### DB notes

#### Table `audit_logs`

```txt
id
clinic_id
actor_user_id nullable
actor_name
action
target_type
target_id
target_label
details
ip_address
user_agent
created_at
```

---

## 16. Overview / Analytics API

### GET `/clinic/overview/stats`

```json
{
  "success": true,
  "data": {
    "total_patients": 250,
    "active_plans": 45,
    "completed_plans": 180,
    "total_revenue": 125000,
    "currency": "USD",
    "period": "2026-06"
  }
}
```

### GET `/clinic/overview/revenue`

Query params:

```txt
from?    ISO date
to?      ISO date
group?   day | week | month
```

### Response

```json
{
  "success": true,
  "data": [
    { "period": "2026-01", "revenue": 15000 },
    { "period": "2026-02", "revenue": 18000 }
  ]
}
```

### DB notes

إذا كان النظام سيحتاج revenue حقيقي، فلابد من إضافة:

- `invoices`
- `invoice_items`
- `payments`

أما إذا كانت الأرقام مجرد تلخيص من خطط العلاج، فيجب تحديد rule واضح:

- هل الإيراد محسوب من `unit_price * amount`
- هل الخصومات تدخل
- هل الخطط غير المؤكدة تدخل أم لا

---

## 17. Enumerations

### Tooth Status

```txt
intact
missing
caries
filled
crown
root-treated
implant
bridge
```

### Treatment Row Kind

```txt
visit
healing
discount
```

### Discount Mode

```txt
amount
percent
```

### Billing Mode

```txt
insurance
payment
```

### Page Size

```txt
A4
Letter
Legal
```

### Price List Design

```txt
compact
detailed
minimal
```

### Template Category

```txt
diagnosis
treatments
dentists
other
```

### Clinic Status

```txt
active
suspended
```

### User Status

```txt
active
inactive
suspended
```

---

## 18. Validation Rules Summary

### Patients

- `name`: required, max 255
- `email`: nullable, valid email
- `phone`: nullable, max 30
- `date_of_birth`: nullable, valid date

### Treatment plans

- `name`: required, max 255
- `billing_mode`: nullable enum
- `insurance_unused_max`: numeric >= 0
- `insurance_deductible`: numeric >= 0
- `payment_plan_amount`: numeric >= 0
- `payment_plan_term`: integer >= 0
- `payment_plan_interest`: numeric >= 0

### Pricelist item

- `name`: required, max 200
- `price`: required, numeric >= 0
- `note`: nullable, max 1000

### Template

- `title`: required, max 255
- `category`: required enum
- `language`: required, max 50
- `body`: nullable string or html

---

## 19. Suggested Build Order For Backend

لجعل التنفيذ سهلًا ومنظمًا:

1. أنشئ جداول `clinics`, `clinic_users`, `patients`, `treatment_plans`
2. بعد ذلك أضف الجداول التابعة للخطة: الأسنان، الأشعة، الصفوف، العناصر
3. ثم نفذ `pricelist` لأنه منفصل نسبيًا
4. ثم `templates` و `document_presets`
5. ثم `plan_settings`
6. ثم `roles`, `permissions`, `audit_logs`
7. أخيرًا `overview` لأن بعضها يعتمد على البيانات السابقة

---

## 20. Recommended Practical Decisions

### Decision 1

استخدم `UUID` أو `ULID` للكيانات التشغيلية بدل الأرقام المتسلسلة إذا كان هناك مزامنة مستقبلية أو استيراد بيانات.

### Decision 2

البيانات المركبة القليلة التغيير مثل:

- `price_page`
- `plan_sections`
- `page_design`

الأفضل حفظها `JSON` داخل جدول واحد.

### Decision 3

البيانات التي تحتاج فرزًا، بحثًا، وتجميعًا مثل:

- المرضى
- الخطط
- عناصر العلاج
- عناصر قائمة الأسعار

الأفضل حفظها جداول relational عادية، وليس JSON.

### Decision 4

إن أردت تقارير دقيقة لاحقًا، لا تعتمد على استخراج الأسعار من `notes` أو `html`.
كل شيء مالي أو علاجي يجب أن يكون في حقول structured.

---

## 21. Minimum SQL Skeleton

```sql
CREATE TABLE clinics (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(30) NULL,
  country VARCHAR(100) NULL,
  city VARCHAR(100) NULL,
  address VARCHAR(255) NULL,
  website_url VARCHAR(255) NULL,
  logo VARCHAR(255) NULL,
  contact_person_name VARCHAR(255) NULL,
  contact_person_phone VARCHAR(30) NULL,
  status ENUM('active','suspended') NOT NULL DEFAULT 'active',
  notes TEXT NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL
);

CREATE TABLE patients (
  id CHAR(36) PRIMARY KEY,
  clinic_id BIGINT NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(30) NULL,
  date_of_birth DATE NULL,
  language VARCHAR(20) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (clinic_id) REFERENCES clinics(id)
);

CREATE TABLE treatment_plans (
  id CHAR(36) PRIMARY KEY,
  clinic_id BIGINT NOT NULL,
  patient_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  notes TEXT NULL,
  billing_mode ENUM('insurance','payment') NULL,
  insurance_unused_max DECIMAL(10,2) NULL,
  insurance_deductible DECIMAL(10,2) NULL,
  payment_plan_amount DECIMAL(10,2) NULL,
  payment_plan_term INT NULL,
  payment_plan_interest DECIMAL(10,2) NULL,
  treatment_note TEXT NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (clinic_id) REFERENCES clinics(id),
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);
```

---

## 22. Final Note

إذا كان الهدف الآن هو بدء بناء قاعدة البيانات بسرعة، فالأفضل اعتماد هذا المستند كمرجع أول، ثم تحويله مباشرة إلى:

1. `ERD`
2. SQL migrations
3. OpenAPI / Swagger file
4. Postman collection

بهذا سيكون عندك مسار واضح من الشاشة إلى الـ API ثم إلى قاعدة البيانات بدون فجوات كبيرة.
