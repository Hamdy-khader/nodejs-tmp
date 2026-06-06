# Treatment Plans API Contract

This contract describes the API required by the current frontend for the plan page, including Diagnosis, Treatments, X-rays, General statuses, and the manual Save action.

## Base URL

```txt
/api/clinic
```

All protected requests require:

```http
Authorization: Bearer <clinic_token>
Accept: application/json
Content-Type: application/json
```

Preferred response envelope:

```json
{
  "success": true,
  "data": {}
}
```

Error response:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The given data was invalid.",
    "errors": {}
  }
}
```

## Enums

```txt
ToothStatus:
intact
missing
caries
filled
crown
root-treated
implant
bridge

BillingMode:
insurance
payment

TreatmentRowKind:
visit
healing
discount

DiscountMode:
amount
percent
```

## Plan Object

```json
{
  "id": "plan_001",
  "patient_id": "pat_001",
  "name": "Your suggested treatment",
  "notes": "",
  "billing_mode": "insurance",
  "insurance": {
    "unused_max": 100,
    "deductible": 0
  },
  "payment_plan": {
    "amount": 500,
    "term": 2,
    "interest": 0
  },
  "treatment_note": "optional note",
  "teeth": [],
  "xrays": [],
  "general_statuses": [],
  "treatment_rows": [],
  "created_at": "2026-06-06T10:00:00Z",
  "updated_at": "2026-06-06T10:00:00Z"
}
```

## 1. List Patient Plans

```http
GET /clinic/patients/{patientId}/plans
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "plan_001",
      "patient_id": "pat_001",
      "name": "Your suggested treatment",
      "notes": "",
      "billing_mode": "insurance",
      "treatment_note": null,
      "created_at": "2026-06-06T10:00:00Z",
      "updated_at": "2026-06-06T10:00:00Z"
    }
  ]
}
```

## 2. Create Plan

```http
POST /clinic/patients/{patientId}/plans
```

Request:

```json
{
  "name": "Your suggested treatment",
  "notes": ""
}
```

Validation:

```txt
name: required string max 255
notes: nullable string
```

Response returns the created plan.

## 3. Get Full Plan

```http
GET /clinic/patients/{patientId}/plans/{planId}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "plan_001",
    "patient_id": "pat_001",
    "name": "Your suggested treatment",
    "notes": "",
    "billing_mode": "insurance",
    "insurance": {
      "unused_max": 100,
      "deductible": 0
    },
    "payment_plan": null,
    "treatment_note": "Follow-up note",
    "teeth": [
      {
        "tooth_number": 11,
        "status": "caries",
        "note": "Caries",
        "diagnosis": ["Mesial", "Distal"]
      }
    ],
    "xrays": [
      {
        "id": "xray_001",
        "file_url": "https://cdn.example.com/xray.png",
        "sort_order": 1
      }
    ],
    "general_statuses": [
      {
        "id": "gs_001",
        "label": "Bruxism signs",
        "sort_order": 1
      }
    ],
    "treatment_rows": [
      {
        "id": "row_001",
        "kind": "visit",
        "label": null,
        "note": null,
        "sort_order": 1,
        "items": [
          {
            "id": "item_001",
            "name": "Filling",
            "tooth_number": 11,
            "amount": 1,
            "unit_price": 100,
            "sort_order": 1
          }
        ]
      },
      {
        "id": "row_002",
        "kind": "healing",
        "label": null,
        "note": null,
        "days": 7,
        "sort_order": 2,
        "items": []
      },
      {
        "id": "row_003",
        "kind": "discount",
        "label": null,
        "note": "Cash discount",
        "mode": "percent",
        "value": 10,
        "sort_order": 3,
        "items": []
      }
    ],
    "created_at": "2026-06-06T10:00:00Z",
    "updated_at": "2026-06-06T10:00:00Z"
  }
}
```

## 4. Update Plan Basics

```http
PUT /clinic/patients/{patientId}/plans/{planId}
```

Used for plan name, notes, billing mode, insurance, payment plan, and treatment note.

Request:

```json
{
  "name": "Your suggested treatment",
  "notes": "",
  "billing_mode": "insurance",
  "insurance": {
    "unused_max": 100,
    "deductible": 0
  },
  "payment_plan": null,
  "treatment_note": "Follow-up note"
}
```

Validation:

```txt
billing_mode: nullable insurance | payment
insurance.unused_max: number >= 0
insurance.deductible: number >= 0
payment_plan.amount: number >= 0
payment_plan.term: integer >= 1
payment_plan.interest: number >= 0
```

## 5. Delete Plan

```http
DELETE /clinic/patients/{patientId}/plans/{planId}
```

Recommended behavior: soft delete the plan and cascade soft delete or hard delete related plan rows, items, teeth, statuses, and xrays according to backend policy.

## 6. Save All Teeth and Diagnosis

This endpoint is required by the manual Save button and diagnosis sync.

```http
PUT /clinic/plans/{planId}/teeth
```

Request:

```json
{
  "teeth": [
    {
      "tooth_number": 11,
      "status": "caries",
      "note": "Caries",
      "diagnosis": ["Mesial", "Distal"]
    },
    {
      "tooth_number": 12,
      "status": "intact",
      "note": null,
      "diagnosis": []
    }
  ]
}
```

Backend behavior:

```txt
Upsert by plan_id + tooth_number.
If a tooth exists, update it.
If a tooth does not exist, create it.
Do not require all 32 teeth, but accept all 32 if sent.
diagnosis must be stored as JSON array of strings.
```

## 7. Update One Tooth

This endpoint is used by autosave when choosing Diagnosis/status.

```http
PATCH /clinic/plans/{planId}/teeth/{toothNumber}
```

Request:

```json
{
  "tooth_number": 11,
  "status": "caries",
  "note": "Caries",
  "diagnosis": ["Mesial"]
}
```

## 8. Add X-ray

```http
POST /clinic/plans/{planId}/xrays
```

Request:

```json
{
  "file_url": "https://cdn.example.com/xray.png",
  "sort_order": 1
}
```

Response returns the created xray record.

## 9. Delete X-ray

```http
DELETE /clinic/plans/{planId}/xrays/{xrayId}
```

## 10. Save General Statuses

```http
PUT /clinic/plans/{planId}/general-statuses
```

Request:

```json
{
  "items": [
    { "label": "Bruxism signs" },
    { "label": "Gingivitis" }
  ]
}
```

Backend behavior:

```txt
Replace all existing general statuses for this plan.
Save sort_order based on array order.
```

## 11. Save All Treatment Rows

This endpoint is required by the manual Save button and treatment sync.

```http
PUT /clinic/plans/{planId}/rows
```

Request:

```json
{
  "rows": [
    {
      "id": "row_local_or_uuid_001",
      "kind": "visit",
      "label": null,
      "note": "Visit note",
      "days": null,
      "mode": null,
      "value": null,
      "sort_order": 1,
      "items": [
        {
          "id": "item_local_or_uuid_001",
          "name": "Filling",
          "tooth_number": 11,
          "amount": 1,
          "unit_price": 100,
          "sort_order": 1
        }
      ]
    },
    {
      "id": "row_local_or_uuid_002",
      "kind": "healing",
      "label": null,
      "note": null,
      "days": 7,
      "mode": null,
      "value": null,
      "sort_order": 2,
      "items": []
    },
    {
      "id": "row_local_or_uuid_003",
      "kind": "discount",
      "label": null,
      "note": "Cash discount",
      "days": null,
      "mode": "percent",
      "value": 10,
      "sort_order": 3,
      "items": []
    }
  ]
}
```

Backend behavior:

```txt
Sync rows for this plan.
Upsert rows by id.
Delete rows that belong to the plan but are not included in request.
For visit rows, sync items by id.
Delete missing items that are no longer included.
Keep sort_order exactly as sent.
```

Important implementation note:

```txt
The frontend can send ids generated on the client.
The backend should accept string UUID/ULID/client ids, or return a clear id mapping.
The simplest option is to use string UUID/ULID ids and accept ids sent by the frontend.
```

## 12. Create Treatment Row

```http
POST /clinic/plans/{planId}/rows
```

Request:

```json
{
  "kind": "visit",
  "label": null,
  "note": null,
  "days": null,
  "mode": null,
  "value": null,
  "sort_order": 1
}
```

Response returns the created row.

## 13. Update Treatment Row

```http
PATCH /clinic/plans/{planId}/rows/{rowId}
```

Healing row request:

```json
{
  "kind": "healing",
  "label": null,
  "note": "Wait before next visit",
  "days": 14,
  "mode": null,
  "value": null
}
```

Discount row request:

```json
{
  "kind": "discount",
  "note": "Discount note",
  "mode": "amount",
  "value": 50
}
```

## 14. Delete Treatment Row

```http
DELETE /clinic/plans/{planId}/rows/{rowId}
```

Backend should also delete child items for visit rows.

## 15. Create Treatment Item

Only valid for rows where `kind = visit`.

```http
POST /clinic/plans/{planId}/rows/{rowId}/items
```

Request:

```json
{
  "name": "Filling",
  "tooth_number": 11,
  "amount": 1,
  "unit_price": 100,
  "sort_order": 1
}
```

## 16. Update Treatment Item

```http
PATCH /clinic/plans/{planId}/rows/{rowId}/items/{itemId}
```

Request:

```json
{
  "name": "Filling",
  "tooth_number": 11,
  "amount": 2,
  "unit_price": 120
}
```

## 17. Delete Treatment Item

```http
DELETE /clinic/plans/{planId}/rows/{rowId}/items/{itemId}
```

## Manual Save Button Flow

When the user clicks Save in the plan page, the frontend persists the current plan by calling:

```txt
PUT /clinic/patients/{patientId}/plans/{planId}
PUT /clinic/plans/{planId}/teeth
PUT /clinic/plans/{planId}/general-statuses
PUT /clinic/plans/{planId}/rows
GET /clinic/patients/{patientId}/plans/{planId}
```

The backend must make all four write endpoints reliable. The final GET reloads the saved plan into the frontend.

## Recommended Database Tables

```txt
treatment_plans
- id
- clinic_id
- patient_id
- name
- notes
- billing_mode
- insurance_unused_max
- insurance_deductible
- payment_plan_amount
- payment_plan_term
- payment_plan_interest
- treatment_note
- created_at
- updated_at
- deleted_at

treatment_plan_teeth
- id
- plan_id
- tooth_number
- status
- note
- diagnosis_json
- created_at
- updated_at
Unique: plan_id + tooth_number

treatment_plan_general_statuses
- id
- plan_id
- label
- sort_order
- created_at
- updated_at

treatment_plan_rows
- id
- plan_id
- kind
- label
- note
- days
- discount_mode
- discount_value
- sort_order
- created_at
- updated_at

treatment_plan_items
- id
- row_id
- name
- tooth_number
- amount
- unit_price
- sort_order
- created_at
- updated_at

treatment_plan_xrays
- id
- plan_id
- file_url
- sort_order
- created_at
- updated_at
```

## Validation Summary

```txt
plan.name: required, max 255
tooth_number: integer, one of FDI numbers 11-18, 21-28, 31-38, 41-48
status: intact | missing | caries | filled | crown | root-treated | implant | bridge
diagnosis: array<string>
row.kind: visit | healing | discount
healing.days: nullable integer >= 0
discount.mode: amount | percent
discount.value: number >= 0
item.name: required string max 255
item.amount: number >= 1
item.unit_price: number >= 0
item.tooth_number: nullable valid tooth number
```

## Backend Acceptance Checklist

```txt
GET full plan returns teeth, xrays, general_statuses, and treatment_rows.
PUT teeth saves Diagnosis fully.
PATCH tooth supports immediate Diagnosis/status autosave.
PUT rows syncs Treatments fully with visit items.
PUT general-statuses replaces the list.
PUT plan basics saves billing and notes.
All plan data is scoped by clinic_id from the authenticated clinic user.
All endpoints reject access to plans outside the authenticated clinic.
```
