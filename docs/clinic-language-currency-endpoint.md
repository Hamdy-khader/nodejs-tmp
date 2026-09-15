# Clinic language and currency

Language and currency are clinic-wide settings. They are selected only from the Clinic Fees / Pricelist page and must be used by every price, total, report, treatment plan, and generated document.

## Read the current settings

```http
GET /api/clinic/pricelist
Authorization: Bearer {clinic_token}
```

The response must include:

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
    "sections": []
  }
}
```

## Save the settings

```http
PUT /api/clinic/pricelist
Authorization: Bearer {clinic_token}
Content-Type: application/json
```

The existing endpoint saves `settings` together with the complete `sections` array:

```json
{
  "settings": {
    "language": "ar",
    "currency_code": "EGP",
    "currency_label": "Egyptian pound",
    "currency_symbol": "E£"
  },
  "sections": [
    { "id": "extraction", "label": "Extraction", "groups": [] }
  ]
}
```

The client must send the complete current `sections` collection. Sending an empty array replaces and clears the clinic pricelist.

`currency_code` must be an ISO 4217 code. Monetary values remain numeric; the frontend uses `currency_code` and `currency_symbol` only for formatting. The backend must return the same clinic currency in statistics and generated plan/document responses and must not fall back to USD when clinic settings exist.
