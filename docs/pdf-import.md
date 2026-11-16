# PDF treatment-plan import

On a patient's page, choose **Import PDF**, select a report, then **Analyze PDF**. Review the diagnoses, visits, healing period, quantities, source prices, patient and currency. **Save and open plan** creates a new draft and opens the existing diagnosis/treatment workspace. The original PDF is downloadable from the imported plan.

Supported input: text-based BrightPlans reports with `YOUR CURRENT DENTAL STATUS`, all 32 permanent FDI teeth and `YOUR SUGGESTED TREATMENT` visit tables. Current diagnosis labels: Intact, Missing, Caries, Filled, Crown, Root canal treated, Implant, Bridge. Prices use a dollar, euro or pound symbol and English number formatting. Maximum 10 MB / 50 pages. Scans, unsupported layouts, incomplete diagnoses, ambiguous tooth ranges and mismatched totals are rejected without creating a plan. This is deterministic extraction of recorded findings, not a new medical diagnosis. No external AI service receives the document.

Tooth-specific items are split into individual teeth only when their quantity exactly matches the listed FDI teeth. Healing ranges remain exact text, without converting months into an invented day count. Source currency is displayed for review; amounts are not converted. Images, X-rays and declarations remain in the original PDF and are not imported into editable chart sections. Patient identity must be checked manually before saving.

## Backend deployment

Deploy the backend and frontend together. Backend requires `composer install` for the locked `smalot/pdfparser` dependency and migration `2026_11_16_000001_add_pdf_import_to_treatment_plans`. Production deployment/migration has not been performed as part of this local change.

Authenticated API endpoints:

- `POST /api/clinic/patients/{patientId}/plans/import-pdf`: multipart `file`, optional `name`, `preview=1` to extract without persistence; omit preview or use `0` to reparse and save. Preview returns `teeth`, `rows`, `total`, `currency_symbol`, `warnings`; save returns standard plan details (201).
- `GET /api/clinic/plans/{planId}/imported-pdf`: clinic-scoped download of the private original.

Plan responses include `pdf_import` with source filename, original currency/total and warnings. Internal storage paths and hashes are never returned. The PDF lives on Laravel's private local disk, outside `public/storage`. Database writes are transactional and failed saves remove the uploaded file. Existing imported items keep their source prices without modifying the clinic catalog. Soft-deleted plans retain their private source under existing record-retention behavior.

Validation: real supplied PDF extraction, backend feature tests for preview/save/reload/edit/move and cross-clinic denial; frontend dialog tests for review state, file changes and extraction errors. Backend tests use SQLite in memory, never the production database.
