# API Update: Treatment Catalog and Price List Sync

This document describes the backend changes needed so the frontend can treat the clinic `Price List` as the single source of truth for:

- the fixed treatment categories
- the treatment dropdown shown in the plan page
- the default price selected when a treatment is added

## Goal

The system should behave as follows:

- Every clinic has one treatment catalog.
- The catalog is the same data shown in `Price List`.
- The plan page reads its treatment dropdown from that catalog.
- When the user selects a treatment in the plan page, the current clinic price is filled automatically.
- Custom clinic-specific treatments can still be added, but only under `Other treatments` or `Other`.
- Fixed categories stay stable and are not user-editable from the frontend.

## Fixed Sections

The backend should always return these section keys in this exact order:

1. `extraction`
2. `prosthesis-removal`
3. `filling`
4. `dentures`
5. `root-canal-treatment`
6. `implant`
7. `crown`
8. `veneer`
9. `bridge`
10. `general`
11. `other`

Each section should have a stable `key`, `label`, `icon`, and `sort_order`.

## 1. Pricelist Must Become the Treatment Catalog

`GET /clinic/pricelist` and `PUT /clinic/pricelist` should be treated as the authoritative treatment catalog endpoint.

### Required response shape

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
        "id": "12",
        "key": "extraction",
        "label": "Extraction",
        "icon": "scissors",
        "sort_order": 1,
        "is_fixed": true,
        "groups": [
          {
            "id": "101",
            "key": "extraction",
            "title": "Extraction",
            "sort_order": 1,
            "is_fixed": true,
            "allow_custom_items": false,
            "items": [
              {
                "id": "1001",
                "key": "wisdom-extraction",
                "name": "Wisdom Extraction",
                "price": 100,
                "note": "",
                "is_fixed": true
              }
            ]
          },
          {
            "id": "102",
            "key": "other",
            "title": "Other treatments",
            "sort_order": 2,
            "is_fixed": true,
            "allow_custom_items": true,
            "items": []
          }
        ]
      }
    ]
  }
}
```

### Required backend rules

- Seed missing fixed sections/groups/items automatically for every clinic.
- Preserve stable `key` values for sections, groups, and fixed items.
- Allow custom items only in groups where `allow_custom_items = true`.
- Reject deleting fixed sections, fixed groups, or fixed items.
- Allow price and note updates for fixed items.
- Allow creating and deleting custom items only.

## 2. Add Catalog References to Treatment Plan Items

Today the plan item stores only:

```json
{
  "name": "Filling",
  "unit_price": 150
}
```

That is not enough to keep a reliable link to the price list.

Each treatment item should also store catalog references:

```json
{
  "id": "item_001",
  "catalog_section_key": "filling",
  "catalog_group_key": "filling",
  "catalog_item_id": "1005",
  "catalog_item_key": "filling",
  "name": "Filling",
  "tooth_number": 11,
  "amount": 1,
  "unit_price": 150,
  "price_source": "catalog",
  "manual_price_override": false
}
```

## 3. Update Treatment Item Create/Update Endpoints

### POST `/clinic/plans/{planId}/rows/{rowId}/items`

The endpoint should accept either:

1. a catalog item selection
2. a manual custom entry

### Catalog-based request

```json
{
  "catalog_section_key": "filling",
  "catalog_group_key": "filling",
  "catalog_item_id": "1005",
  "tooth_number": 11,
  "amount": 1
}
```

Backend behavior:

- Load the treatment from the authenticated clinic catalog.
- Copy `name` from the catalog item.
- Copy current `price` into `unit_price`.
- Save the catalog references on the plan item.
- Mark `price_source = "catalog"`.

### Manual request

```json
{
  "catalog_section_key": "filling",
  "catalog_group_key": "other",
  "name": "Custom filling repair",
  "tooth_number": 11,
  "amount": 1,
  "unit_price": 0,
  "price_source": "manual"
}
```

Backend behavior:

- Accept manual entries only in `allow_custom_items = true` groups.
- Save the free-text `name`.
- Keep `catalog_item_id = null`.

### PATCH `/clinic/plans/{planId}/rows/{rowId}/items/{itemId}`

Allow:

- `amount`
- `unit_price`
- `manual_price_override`
- `tooth_number`

If the request changes `catalog_item_id`, the backend should reload the latest catalog name and price from the clinic price list.

## 4. Full Plan Response Must Return Catalog References

`GET /clinic/patients/{patientId}/plans/{planId}` should return treatment items with catalog metadata:

```json
{
  "id": "item_001",
  "catalog_section_key": "implant",
  "catalog_group_key": "implant-abutment",
  "catalog_item_id": "2050",
  "catalog_item_key": "zirconium-abutment",
  "name": "Zirconium Abutment",
  "tooth_number": 14,
  "amount": 1,
  "unit_price": 500,
  "price_source": "catalog",
  "manual_price_override": false,
  "sort_order": 1
}
```

## 5. PUT `/clinic/pricelist` Validation Changes

The backend should validate by `key` and `is_fixed`, not just by free text labels.

### Minimum rules

- `sections[].key`: required
- `sections[].groups[].key`: required
- `sections[].groups[].allow_custom_items`: boolean
- `sections[].groups[].items[].key`: nullable for custom items, required for fixed items
- fixed items cannot be deleted
- fixed item `name` should not be changed by clinics
- custom item `name` can be changed

## 6. Recommended Database Changes

### Pricelist tables

Add stable keys and flags:

```txt
clinic_pricelist_sections
- key
- is_fixed

clinic_pricelist_groups
- key
- is_fixed
- allow_custom_items

clinic_pricelist_items
- key
- is_fixed
```

### Treatment plan items table

Add catalog reference columns:

```txt
treatment_plan_items
- catalog_section_key nullable
- catalog_group_key nullable
- catalog_item_id nullable
- catalog_item_key nullable
- price_source enum('catalog','manual')
- manual_price_override boolean default false
```

## 7. Backend Acceptance Checklist

- `GET /clinic/pricelist` always returns the fixed treatment sections in the same order.
- Clinics can edit prices for fixed items.
- Clinics can add custom items only inside `Other treatments` or `Other`.
- The plan page can create treatment items from a catalog item id.
- The backend fills the item name and price from the catalog automatically.
- `GET plan` returns the catalog references for every treatment item.
- Existing old records without catalog references still load safely.
