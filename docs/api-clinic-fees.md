# API Contract — Clinic Fees (Pricelist)

> **Base URL:** `http://localhost:8000/api`
> **Auth:** All endpoints require `Authorization: Bearer {clinic_token}`
> The token is scoped to a single clinic — no `clinic_id` needed in the URL.

---

## Endpoints Overview

| Method | Endpoint                           | Description                          |
|--------|------------------------------------|--------------------------------------|
| GET    | `/clinic/pricelist`                | Fetch full pricelist                 |
| PUT    | `/clinic/pricelist`                | Bulk save full pricelist             |
| POST   | `/clinic/pricelist/items`          | Add a new item to a group            |
| PATCH  | `/clinic/pricelist/items/{id}`     | Update item (name, price, note)      |
| DELETE | `/clinic/pricelist/items/{id}`     | Delete an item                       |

---

## GET `/clinic/pricelist`

Fetch the complete pricelist for the authenticated clinic.

> **First-time behavior:** If the clinic has no saved pricelist, the backend seeds it with the default pricelist and returns it.

### Response `200 OK`

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
            "id": "a1b2c3d",
            "title": "Extraction",
            "price_label": null,
            "items": [
              {
                "id": "x1y2z3",
                "name": "Wisdom Extraction",
                "price": 100,
                "note": ""
              },
              {
                "id": "x4y5z6",
                "name": "Surgical extraction",
                "price": 200,
                "note": ""
              }
            ]
          },
          {
            "id": "a7b8c9d",
            "title": "Other treatments",
            "price_label": null,
            "items": []
          }
        ]
      }
    ]
  }
}
```

### Error Responses

| Status | Code               | When                     |
|--------|--------------------|--------------------------|
| 401    | `UNAUTHORIZED`     | Missing or invalid token |
| 403    | `CLINIC_SUSPENDED` | Clinic is suspended      |

---

## PUT `/clinic/pricelist`

Bulk save — replaces the entire pricelist (settings + all sections + items) for the clinic.
Used when the user clicks the **Save** button after making multiple edits.

### Request Body

```json
{
  "settings": {
    "language": "ar",
    "currency_code": "TRY",
    "currency_label": "Turkish lira",
    "currency_symbol": "₺"
  },
  "sections": [
    {
      "id": "extraction",
      "n": 1,
      "label": "Extraction",
      "icon": "scissors",
      "groups": [
        {
          "id": "a1b2c3d",
          "title": "Extraction",
          "price_label": null,
          "items": [
            {
              "id": "x1y2z3",
              "name": "Wisdom Extraction",
              "price": 150,
              "note": "Includes post-op medication"
            }
          ]
        }
      ]
    }
  ]
}
```

### Validation Rules

| Field                               | Rule                        |
|-------------------------------------|-----------------------------|
| `settings.language`                 | required, string, max:10    |
| `settings.currency_code`            | required, string, max:10    |
| `settings.currency_label`           | required, string, max:100   |
| `settings.currency_symbol`          | required, string, max:10    |
| `sections`                          | required, array             |
| `sections[].id`                     | required, string            |
| `sections[].label`                  | required, string, max:100   |
| `sections[].icon`                   | required, string, max:50    |
| `sections[].groups`                 | required, array             |
| `sections[].groups[].id`            | required, string            |
| `sections[].groups[].title`         | required, string, max:100   |
| `sections[].groups[].items`         | required, array             |
| `sections[].groups[].items[].id`    | required, string            |
| `sections[].groups[].items[].name`  | required, string, max:200   |
| `sections[].groups[].items[].price` | required, numeric, min:0    |
| `sections[].groups[].items[].note`  | optional, string, max:500   |

### Response `200 OK`

Returns the saved pricelist (same structure as GET response).

```json
{
  "success": true,
  "data": {
    "settings": { "..." },
    "sections": [ "..." ]
  }
}
```

### Error Responses

| Status | Code               | When                     |
|--------|--------------------|--------------------------|
| 401    | `UNAUTHORIZED`     | Missing or invalid token |
| 403    | `CLINIC_SUSPENDED` | Clinic is suspended      |
| 422    | `VALIDATION_ERROR` | Invalid request body     |

---

## POST `/clinic/pricelist/items`

Add a single new item to an existing group.
Used when the user clicks **"Add to {group}"** inside a sub-group.

### Request Body

```json
{
  "group_id": "a1b2c3d",
  "name": "New treatment",
  "price": 0,
  "note": ""
}
```

### Validation Rules

| Field      | Rule                              |
|------------|-----------------------------------|
| `group_id` | required, string, must belong to the clinic |
| `name`     | required, string, max:200         |
| `price`    | required, numeric, min:0          |
| `note`     | optional, string, max:500         |

### Response `201 Created`

Returns the newly created item.

```json
{
  "success": true,
  "data": {
    "id": "newitemid",
    "name": "New treatment",
    "price": 0,
    "note": ""
  }
}
```

### Error Responses

| Status | Code               | When                              |
|--------|--------------------|-----------------------------------|
| 401    | `UNAUTHORIZED`     | Missing or invalid token          |
| 403    | `CLINIC_SUSPENDED` | Clinic is suspended               |
| 404    | `NOT_FOUND`        | `group_id` not found for this clinic |
| 422    | `VALIDATION_ERROR` | Invalid request body              |

---

## PATCH `/clinic/pricelist/items/{id}`

Update one or more fields of a single item.
Used for inline editing (name, price) and adding/editing a note.
Only the fields included in the request body are updated.

### URL Parameter

| Param | Type   | Description    |
|-------|--------|----------------|
| `id`  | string | The item's ID  |

### Request Body

All fields are **optional** — send only what changed.

```json
{
  "name": "Wisdom Extraction (updated)",
  "price": 180,
  "note": "Includes post-op medication"
}
```

> **Note-only update** — send just the `note` field:
> ```json
> { "note": "Patient must fast 4 hours before procedure" }
> ```

> **Clear a note** — send an empty string:
> ```json
> { "note": "" }
> ```

### Validation Rules

| Field   | Rule                                      |
|---------|-------------------------------------------|
| `name`  | optional, string, max:200, not empty      |
| `price` | optional, numeric, min:0                  |
| `note`  | optional, string, max:500, nullable       |

### Response `200 OK`

Returns the updated item.

```json
{
  "success": true,
  "data": {
    "id": "x1y2z3",
    "name": "Wisdom Extraction (updated)",
    "price": 180,
    "note": "Includes post-op medication"
  }
}
```

### Error Responses

| Status | Code               | When                                    |
|--------|--------------------|-----------------------------------------|
| 401    | `UNAUTHORIZED`     | Missing or invalid token                |
| 403    | `FORBIDDEN`        | Item belongs to a different clinic      |
| 403    | `CLINIC_SUSPENDED` | Clinic is suspended                     |
| 404    | `NOT_FOUND`        | Item not found                          |
| 422    | `VALIDATION_ERROR` | Invalid field value                     |

---

## DELETE `/clinic/pricelist/items/{id}`

Permanently delete a single item.
Triggered immediately when the user clicks the **trash icon** on a row.

### URL Parameter

| Param | Type   | Description    |
|-------|--------|----------------|
| `id`  | string | The item's ID  |

### Response `204 No Content`

No response body.

### Error Responses

| Status | Code               | When                               |
|--------|--------------------|------------------------------------|
| 401    | `UNAUTHORIZED`     | Missing or invalid token           |
| 403    | `FORBIDDEN`        | Item belongs to a different clinic |
| 403    | `CLINIC_SUSPENDED` | Clinic is suspended                |
| 404    | `NOT_FOUND`        | Item not found                     |

---

## Data Types

### `PricelistSettings`

| Field             | Type   | Description                           |
|-------------------|--------|---------------------------------------|
| `language`        | string | Language code (`en`, `ar`, `tr`…)     |
| `currency_code`   | string | ISO 4217 code (`USD`, `EUR`, `TRY`…)  |
| `currency_label`  | string | Full currency name                    |
| `currency_symbol` | string | Display symbol (`$`, `€`, `₺`…)      |

### `PricelistSection`

| Field    | Type         | Description                                             |
|----------|--------------|---------------------------------------------------------|
| `id`     | string       | Stable section key (`extraction`, `implant`, `crown`…)  |
| `n`      | number\|null | Button number shown in UI (null = no number)            |
| `label`  | string       | Display name                                            |
| `icon`   | string       | Icon key (`scissors`, `anchor`, `crown`…)               |
| `groups` | array        | Sub-groups within this section                          |

### `PricelistGroup`

| Field         | Type         | Description                                       |
|---------------|--------------|---------------------------------------------------|
| `id`          | string       | Unique group ID                                   |
| `title`       | string       | Group name                                        |
| `price_label` | string\|null | Column header override (default: `"Unit price"`)  |
| `items`       | array        | Price items in this group                         |

### `PricelistItem`

| Field   | Type   | Description                            |
|---------|--------|----------------------------------------|
| `id`    | string | Unique item ID                         |
| `name`  | string | Treatment name                         |
| `price` | number | Price in the selected currency (≥ 0)   |
| `note`  | string | Optional note shown on documents       |

---

## Operation Strategy

| Action              | Endpoint used                          | When triggered                  |
|---------------------|----------------------------------------|---------------------------------|
| Load page           | `GET /clinic/pricelist`                | On page mount                   |
| Edit name or price  | local state → `PUT /clinic/pricelist`  | On **Save** button click        |
| Add note / edit note| local state → `PUT /clinic/pricelist`  | On **Save** button click        |
| Add item to group   | `POST /clinic/pricelist/items`         | Immediately on "Add" click      |
| Delete item         | `DELETE /clinic/pricelist/items/{id}`  | Immediately on trash icon click |
| Change settings     | local state → `PUT /clinic/pricelist`  | On **Save** button click        |

---

## Database Schema

```sql
-- Pricelist settings (one row per clinic)
CREATE TABLE clinic_pricelist_settings (
    id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    clinic_id        BIGINT UNSIGNED NOT NULL UNIQUE,
    language         VARCHAR(10)     NOT NULL DEFAULT 'en',
    currency_code    VARCHAR(10)     NOT NULL DEFAULT 'USD',
    currency_label   VARCHAR(100)    NOT NULL DEFAULT 'United States dollar',
    currency_symbol  VARCHAR(10)     NOT NULL DEFAULT '$',
    created_at       TIMESTAMP NULL,
    updated_at       TIMESTAMP NULL,
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE
);

-- Sections (categories like Extraction, Implant, Crown…)
CREATE TABLE clinic_pricelist_sections (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    clinic_id     BIGINT UNSIGNED NOT NULL,
    section_key   VARCHAR(100)    NOT NULL,
    n             TINYINT UNSIGNED NULL,
    label         VARCHAR(100)    NOT NULL,
    icon          VARCHAR(50)     NOT NULL DEFAULT 'package',
    display_order SMALLINT        NOT NULL DEFAULT 0,
    created_at    TIMESTAMP NULL,
    updated_at    TIMESTAMP NULL,
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE
);

-- Sub-groups within each section
CREATE TABLE clinic_pricelist_groups (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    section_id    BIGINT UNSIGNED NOT NULL,
    title         VARCHAR(100)    NOT NULL,
    price_label   VARCHAR(100)    NULL,
    display_order SMALLINT        NOT NULL DEFAULT 0,
    created_at    TIMESTAMP NULL,
    updated_at    TIMESTAMP NULL,
    FOREIGN KEY (section_id) REFERENCES clinic_pricelist_sections(id) ON DELETE CASCADE
);

-- Individual price items
CREATE TABLE clinic_pricelist_items (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    group_id      BIGINT UNSIGNED NOT NULL,
    name          VARCHAR(200)    NOT NULL,
    price         DECIMAL(10, 2)  NOT NULL DEFAULT 0,
    note          TEXT            NULL,
    display_order SMALLINT        NOT NULL DEFAULT 0,
    created_at    TIMESTAMP NULL,
    updated_at    TIMESTAMP NULL,
    FOREIGN KEY (group_id) REFERENCES clinic_pricelist_groups(id) ON DELETE CASCADE
);
```

---

## Supported Languages

| Code | Label     |
|------|-----------|
| `en` | English   |
| `ar` | العربية   |
| `tr` | Türkçe    |
| `fr` | Français  |
| `de` | Deutsch   |
| `es` | Español   |
| `pt` | Português |
| `ru` | Русский   |

## Supported Icons

| Key        | Section         |
|------------|-----------------|
| `scissors` | Extraction      |
| `layers`   | Prosthesis      |
| `droplet`  | Filling         |
| `smile`    | Dentures        |
| `activity` | Root canal      |
| `anchor`   | Implant         |
| `crown`    | Crown           |
| `wrench`   | Bridge          |
| `package`  | General         |
| `more`     | Other           |
| `sparkles` | Hair Transplant |

---

## Frontend Integration

```typescript
// Load on page mount
const data = await clinicApi.pricelist.get();

// Add item immediately when user clicks "Add"
const newItem = await clinicApi.pricelist.addItem({ group_id, name: "New treatment", price: 0, note: "" });

// Delete item immediately when user clicks trash icon
await clinicApi.pricelist.deleteItem(itemId);

// Update item (name/price) — batched, sent on "Save" click
await clinicApi.pricelist.updateItem(itemId, { name, price });

// Update note only
await clinicApi.pricelist.updateItem(itemId, { note: "Some note" });

// Bulk save everything on "Save" button
const saved = await clinicApi.pricelist.save(data);
```
