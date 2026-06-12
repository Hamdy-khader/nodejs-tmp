# Plan Settings Custom Pages API Update

## Goal

Replace the old PDF page design structure:

- `front_cover`
- `inner_pages`
- `animation_page`
- `back_cover`

With a 3-page design model only:

- `front_cover`
- `inner_pages`
- `back_cover`

The `3D TREATMENT ANIMATION` page must be removed from the generated treatment plan PDF.

## Required Backend Changes

### 1. Update `GET /clinic/plan-settings`

Return `page_design` in this shape:

```json
{
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
    "show_documents": true,
    "show_overview": true
  },
  "page_design": {
    "front_cover": {
      "cover_image": null,
      "clinic_name": "Treatly",
      "title": "TREATMENT PLAN",
      "subtitle": "[PATIENT NAME]"
    },
    "inner_pages": {
      "header_text": "Inner pages",
      "footer_left": "Footer (left)",
      "footer_right": "Footer (right)",
      "show_footer": true
    },
    "back_cover": {
      "back_image": null,
      "title": "Back cover",
      "note": ""
    }
  },
  "updated_at": "2026-06-12T00:00:00Z"
}
```

### 2. Update `PUT /clinic/plan-settings`

Accept this request body:

```json
{
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
    "show_documents": true,
    "show_overview": true
  },
  "page_design": {
    "front_cover": {
      "cover_image": null,
      "clinic_name": "Treatly",
      "title": "TREATMENT PLAN",
      "subtitle": "[PATIENT NAME]"
    },
    "inner_pages": {
      "header_text": "Inner pages",
      "footer_left": "Footer (left)",
      "footer_right": "Footer (right)",
      "show_footer": true
    },
    "back_cover": {
      "back_image": null,
      "title": "Back cover",
      "note": ""
    }
  }
}
```

## Field Notes

- `front_cover.clinic_name`: clinic-specific branding text shown on the first page.
- `front_cover.title`: main title on the first page.
- `front_cover.subtitle`: usually patient name or a placeholder such as `[PATIENT NAME]`.
- `inner_pages.header_text`: repeated top header for all internal pages.
- `inner_pages.footer_left`: repeated footer text on the left side of all internal pages.
- `inner_pages.footer_right`: repeated footer text on the right side of all internal pages.
- `inner_pages.show_footer`: controls whether the footer is rendered on internal pages.
- `back_cover.title`: title shown on the final page.
- `back_cover.note`: final custom text shown on the last page.

## Deprecated / Removed Fields

These fields should be removed from the API response and ignored if received from older clients:

```json
{
  "plan_sections": {
    "show_animation": true
  },
  "page_design": {
    "animation_page": {
      "mode": "default",
      "custom_note": null
    }
  }
}
```

## PDF Generation Rules

When generating the overview/download PDF:

1. `front_cover` must always be the first page.
2. `back_cover` must always be the last page.
3. Every page between them is an `inner page`.
4. `inner_pages.header_text` must appear on all pages between front and back.
5. `inner_pages.footer_left` and `inner_pages.footer_right` must appear on all pages between front and back.
6. Page number should appear in the inner-page footer as `current / total`.
7. The `3D TREATMENT ANIMATION` page must not be generated anymore.

## Optional Download API Upgrade

If the backend PDF endpoint is still generating the final file, update:

- `GET /clinic/plans/{planId}/document`

So it uses the saved clinic `plan_settings.page_design` values above when building the PDF.

If you want stronger versioning, introduce:

- `GET /clinic/plans/{planId}/document?layout=v2`

Where `layout=v2` means:

- no animation page
- custom front cover
- custom inner-page header/footer
- custom back cover
