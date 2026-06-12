# Statistics Page

## Summary

This page adds a clinic-facing `Statistics` dashboard at `/statistics`.

It is implemented end-to-end through:

- frontend route: `src/routes/statistics.tsx`
- backend integration layer: `src/lib/admin/api.ts`

## Frontend

The page includes:

- KPI cards for:
  - total patients
  - active plans
  - completed plans
  - total revenue
- revenue trend line chart
- active/completed plan distribution pie chart
- period filter
- grouping filter (`day`, `week`, `month`)
- refresh action
- loading, empty, and error states

## Backend Contract

The page consumes these backend endpoints:

### `GET /clinic/overview/stats`

Expected response payload:

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

Mapped in frontend to:

```ts
interface ClinicOverviewStats {
  totalPatients: number;
  activePlans: number;
  completedPlans: number;
  totalRevenue: number;
  currency: string;
  period: string;
}
```

### `GET /clinic/overview/revenue`

Query params:

```txt
from   ISO date
to     ISO date
group  day | week | month
```

Expected response payload:

```json
{
  "success": true,
  "data": [
    { "period": "2026-01", "revenue": 15000 },
    { "period": "2026-02", "revenue": 18000 }
  ]
}
```

Mapped in frontend to:

```ts
interface ClinicRevenuePoint {
  period: string;
  revenue: number;
}
```

## Files Changed

- `src/lib/admin/api.ts`
- `src/routes/statistics.tsx`
- `docs/statistics-page.md`

## Notes

- The page uses the existing authenticated clinic API client.
- Statistics values are normalized from either `snake_case` or `camelCase` backend responses.
- Revenue insights like average revenue and best period are derived on the frontend from the revenue series.
