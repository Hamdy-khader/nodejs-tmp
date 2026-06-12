# Pricelist And Treatment Plan Behavior

This document defines the exact product and API behavior required for clinic treatments, the clinic pricelist, and treatment-plan pricing snapshots.

## Product Goals

1. Every newly created clinic must start with the full default treatment catalog already seeded into its own clinic pricelist.
2. After clinic creation, the clinic works only with its own copied pricelist data.
3. The clinic can add new treatments at any time.
4. The clinic can always change treatment prices.
5. Once a treatment has been used in any saved treatment plan item:
   - the clinic must not be allowed to delete it
   - the clinic must not be allowed to rename it
   - the clinic must not be allowed to edit its note/description
   - the clinic must still be allowed to change its price for future plans
6. Treatment plan items must store their own `name` and `unit_price` snapshot on the treatment-plan item row itself.
7. Changing the clinic pricelist later must not retroactively change any previously saved treatment plan.

## Required Backend Logic

### 1. Seed a clinic-specific pricelist on clinic creation

When a clinic is created through `POST /admin/clinics`, the backend must also seed:

- `clinic_pricelist_sections`
- `clinic_pricelist_groups`
- `clinic_pricelist_items`

The seeded data should be copied from the system master catalog into that clinic's own records.

The clinic must not be reading directly from a shared global catalog after creation.

### 2. Return clinic item usage and permissions in `GET /clinic/pricelist`

Each item in `/clinic/pricelist` should include usage metadata and UI permissions.

Example item response:

```json
{
  "id": "123",
  "key": "filling",
  "name": "Filling",
  "price": 150,
  "note": "",
  "usage_count": 8,
  "is_used": true,
  "can_edit_name": false,
  "can_edit_note": false,
  "can_delete": false,
  "can_edit_price": true
}
```

### 3. Enforce item locking in the backend

Frontend hints are not enough. The backend must enforce the rules.

#### `PATCH /clinic/pricelist/items/{id}`

If the item is already used in any treatment plan item:

- allow `price`
- reject updates to `name`
- reject updates to `note`
- reject any future structural edits

Recommended error:

```json
{
  "error": {
    "code": "PRICELIST_ITEM_LOCKED",
    "message": "Used treatments can only update price."
  }
}
```

Suggested status: `409 Conflict`

#### `DELETE /clinic/pricelist/items/{id}`

If the item is already used in any treatment plan item:

- reject delete

Recommended error:

```json
{
  "error": {
    "code": "PRICELIST_ITEM_IN_USE",
    "message": "This treatment is already used in treatment plans and cannot be deleted."
  }
}
```

Suggested status: `409 Conflict`

### 4. Store a treatment snapshot on each treatment plan item

When adding an item to a treatment plan, the backend must save:

- `catalog_item_id` nullable
- `name`
- `unit_price`
- `amount`
- `manual_price_override`
- `tooth_number`

The treatment plan item must be fully usable even if the original pricelist item is renamed, repriced, or deleted later.

## Required API Contract Changes

### `GET /clinic/pricelist`

Extend each item object with:

- `usage_count`
- `is_used`
- `can_edit_name`
- `can_edit_note`
- `can_delete`
- `can_edit_price`

### `POST /clinic/plans/{planId}/rows/{rowId}/items`

The request body must accept and persist:

```json
{
  "catalog_item_id": "123",
  "catalog_item_key": "filling",
  "catalog_group_key": "filling",
  "catalog_section_key": "filling",
  "name": "Filling",
  "tooth_number": 11,
  "amount": 1,
  "unit_price": 150,
  "manual_price_override": false,
  "sort_order": 1
}
```

### `PATCH /clinic/plans/{planId}/rows/{rowId}/items/{itemId}`

The request body must accept and persist:

```json
{
  "name": "Filling",
  "tooth_number": 11,
  "amount": 2,
  "unit_price": 175,
  "manual_price_override": true
}
```

`unit_price` here updates only the treatment-plan item snapshot. It must not update the clinic pricelist item price.

## Database Requirements

### `clinic_pricelist_items`

Minimum fields:

- `id`
- `clinic_id`
- `group_id`
- `key` or `seed_key`
- `name`
- `price`
- `note`
- timestamps

### `treatment_plan_items`

Minimum fields:

- `id`
- `row_id`
- `catalog_item_id` nullable
- `catalog_item_key` nullable
- `catalog_group_key` nullable
- `catalog_section_key` nullable
- `name`
- `tooth_number` nullable
- `amount`
- `unit_price`
- `manual_price_override`
- `sort_order`
- timestamps

## Expected Frontend Behavior

### Price List page

- Show only clinic-specific pricelist items.
- Allow adding new clinic treatments.
- Allow deleting only items where `can_delete = true`.
- If `is_used = true`, lock `name` and `note`, but keep `price` editable.
- Show a visible badge that the treatment is already used.

### Treatment plan page

- Treatment picker must read from the clinic pricelist only.
- When the user adds a treatment, send `name` and `unit_price` with the request.
- The saved plan item price becomes the authoritative snapshot for that plan row.
- If the clinic changes its pricelist later, old saved plan items must keep their original price.
- If the user edits `unit_price` inside the plan, that is a plan-level override only.

## Notes

- The frontend has been prepared to consume the new pricelist permission fields immediately once the backend returns them.
- The frontend now also sends `name` and `unit_price` when creating and updating treatment plan items.
