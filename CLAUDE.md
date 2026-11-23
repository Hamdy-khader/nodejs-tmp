# Treatly

Reply in Arabic. The team writes Levantine Arabic. Keep code, paths and identifiers in English.

## What the site is

Treatly (Treatly Online) is a multi-clinic SaaS for dental clinics. A clinic builds a treatment plan (proposal) for each patient: a teeth chart with diagnoses, X-rays, a price list, insurance and financing, and discounts. The plan is exported as a PDF document. A platform admin panel manages the clinics and their users.

## Repos

| Repo | Role |
|---|---|
| `treatly.online` (this repo, github.com/Hamdy-khader/nodejs-tmp) | Current frontend |
| `dental-back-end` (github.com/doaaabed94/dental-back-end) | Laravel API, usually cloned next to this repo |
| `treatlyonline.de` (github.com/doaaabed94/treatlyonline.de) | Old frontend. Do not work there; read it only for reference |

All work happens in this repo and `dental-back-end`.

The production API is `https://backend.treatlyonline.de/api`. There are two separate auth worlds: platform admins (`/api/admin/*`) and clinic users (`/api/clinic/*`).

## Frontend (this repo)

- A Lovable-generated TanStack Start app: React 19, file-based TanStack Router (`src/routes`; `routeTree.gen.ts` is generated), React Query, Tailwind v4, shadcn/Radix, zod + react-hook-form, recharts, and jspdf + html2canvas-pro.
- The API client is `src/lib/admin/api.ts`, with its base URL from `VITE_API_URL`. **`.env` points at the production API**, so local runs read and write live data. Check it before testing anything that writes.
- Tokens live in localStorage as `bp_clinic_token` and `bp_admin_token`. A 401 clears the token and redirects to login.
- `src/integrations/supabase` is a template leftover that nothing uses.
- Main screens:
  - `/`: landing page
  - `/clinic/login`: clinic sign-in
  - `/admin/*`: the platform admin panel
  - `/patients` and `/patients/$patientId/plans/$planId`: the patient list and the treatment-plan workspace
  - `/clinic-fees`: the price list
  - `/templates`, `/documents`, `/plan-settings`, `/users`, `/overview`, `/statistics`, `/support`
- State and business logic live in `src/lib/*-store.ts` and `src/lib/treatment-*.ts`, with co-located `*.test.ts(x)` files.
- Commands: `npm run dev`, `npm run build`, `npm run test:run` (vitest), `npm run lint`.
- There is no CI. `dist/` and `public/.htaccess` (an SPA rewrite) suggest the static build is uploaded by hand. This is not confirmed.

## Backend (dental-back-end)

- Laravel 10, PHP ^8.1 (8.3 in production), MySQL. `barryvdh/laravel-dompdf` renders the treatment-plan PDFs.
- Auth is custom bearer-token auth, not Sanctum. Tokens are stored hashed in `admin_tokens` and `clinic_user_tokens`, and checked by the middleware `admin.auth` and `clinic.auth`. All routes are in `routes/api.php`.
- Business logic lives in `app/Services` (pricing, financial summary, PDF builder).
- Tests: `php artisan test`.
- X-ray upload expects the multipart field `file`, not `file_url`.
- **Pushing to `main` in dental-back-end deploys to production.** A GitHub Actions workflow resets the server to `origin/main`, runs `composer install` and `artisan migrate --force`, then rebuilds the caches. The standing delivery authorization below covers routine task pushes and this deployment. Review any migration's data impact before delivery; it does not authorize unrelated or destructive data changes.
- If production behaves differently from the code, first check whether the deployed version is behind the repo.

## Docs

- `API_CONTRACT.md`, `API_REFERENCE.md` and `docs/*.md` in this repo (a mix of Arabic and English)
- `openapi.yaml` and `public/swagger.html` in dental-back-end

## Delivery rule

The user explicitly requests automatic delivery, reaffirmed on 2026-11-23: "ارفع دائما عند الانتهاء خليها ضمن role المشروع". After completing requested work and passing relevant checks, commit and push the task's changes to the configured frontend/backend origins and deploy them to the live site without asking again. This includes the backend production workflow triggered by a push to main. A later user hold or scope restriction takes precedence. Do not include unrelated uncommitted work or secrets. Report the deployed revision and verification result; if a check or deployment is blocked, explain the concrete blocker.

Frontend production is hosted over SSH via the `treatly` host alias. Deploy the built static frontend to both `/home/u203733728/domains/treatlyonline.de/public_html` and `/home/u203733728/domains/treatly.pro/public_html`. Back up existing frontend files, upload assets before switching `index.html`, retain old hashed assets for open sessions, and preserve each site's `backend` directory. Verify the public pages reference the new build.
