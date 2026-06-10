# Backend Spec: Treatment Plan Document Download

## Goal

تنفيذ endpoint في الـ backend يقوم بتوليد ملف PDF حقيقي لخطة العلاج، بحيث عند الضغط على زر `Download` في مرحلة `Overview` يتم تنزيل الملف النهائي مع نصوص الـ documents المختارة داخل الملف.

الهدف هو أن يكون التوليد من الـ backend وليس من الـ frontend.

---

## Existing Frontend Expectation

الفرونت عنده endpoint متوقع بالفعل:

`GET /clinic/plans/{planId}/document`

ويفترض أن يرجع:

- `200 OK`
- `Content-Type: application/pdf`
- body = PDF binary stream

اسم الملف المقترح في response header:

`Content-Disposition: attachment; filename="treatment-plan-{planId}.pdf"`

---

## Required Behavior

عند استدعاء:

`GET /clinic/plans/{planId}/document`

يقوم الـ backend بالخطوات التالية:

1. التحقق من صلاحية المستخدم والعيادة.
2. تحميل خطة العلاج المطلوبة `planId`.
3. تحميل إعدادات الوثائق الخاصة بالعيادة من `document_presets`.
4. تحديد الوثائق المختارة من `selected_ids`.
5. ترتيب الوثائق حسب `order`.
6. جلب النص الفعلي لكل document.
7. توليد PDF نهائي يحتوي:
   - صفحات الخطة الأساسية
   - ثم صفحات الـ documents المختارة بالنصوص الحقيقية
8. إرجاع الملف كـ PDF قابل للتحميل.

---

## Data Sources

### 1. Document Presets

المصدر:

- `document_presets`
- `document_preset_items` إذا كنتم تستخدمونها داخليًا

المطلوب قراءته:

```json
{
  "selected_ids": [
    "fixed:clinic:demo",
    "fixed:diagnosis:note",
    "template-id-1",
    "template-id-2"
  ],
  "order": {
    "clinic": ["fixed:clinic:demo", "fixed:clinic:note"],
    "opg": [],
    "diagnosis": ["fixed:diagnosis:note", "template-id-1"],
    "treatments": ["fixed:treatments:note", "template-id-2"],
    "other": ["fixed:other:guarantee", "fixed:other:ourclinic", "fixed:other:note"]
  }
}
```

### 2. Dynamic Templates

المصدر:

- `templates`

الحقول المهمة:

- `id`
- `title`
- `category`
- `body` أو `body_html`
- `language`
- `order`

أي document id ليس من نوع `fixed:*` يعتبر template ديناميكي ويجب جلب النص منه.

### 3. Fixed Documents

الـ frontend يستخدم هذه identifiers الثابتة:

```txt
fixed:clinic:demo
fixed:clinic:note
fixed:diagnosis:note
fixed:treatments:note
fixed:other:guarantee
fixed:other:ourclinic
fixed:other:note
```

هذه العناصر تحتاج نصوص حقيقية من الـ backend.

يوجد خياران مقبولان:

### Option A

تخزين نصوص هذه العناصر في config أو constants داخل الـ backend مؤقتًا.

### Option B

ربطها بجداول/إعدادات فعلية من النظام.

الخيار الأفضل لاحقًا هو `Option B`، لكن للتنفيذ السريع يمكن البدء بـ `Option A`.

---

## Document Resolution Rules

### If document id starts with `fixed:`

يجب حل النص من مصدر ثابت في الـ backend.

مثال:

```json
{
  "id": "fixed:other:guarantee",
  "title": "Guarantee and Brief Info",
  "body": "Actual guarantee text here..."
}
```

### If document id is a template id

يجب قراءة record من جدول `templates`.

مثال:

```json
{
  "id": "tpl_123",
  "title": "Implant Treatment",
  "body": "<p>...</p>"
}
```

إذا كان النص HTML:

- إما تحويله إلى plain text
- أو render HTML داخل الـ PDF إذا كانت مكتبة الـ PDF تسمح بذلك

للتنفيذ السريع:

- plain text مقبول كبداية

---

## Ordering Rules

الترتيب النهائي للوثائق يكون كالتالي:

1. `clinic`
2. `diagnosis`
3. `treatments`
4. `other`

داخل كل section:

- استخدم الترتيب الموجود في `order[section]`
- ثم تجاهل أي عنصر غير موجود في `selected_ids`
- ثم لا تضف أي document غير مختار

Pseudo logic:

```txt
for each section in [clinic, diagnosis, treatments, other]:
  for each id in order[section]:
    if id is in selected_ids:
      append to final_docs
```

إذا كان هناك document مختار داخل `selected_ids` لكنه غير موجود في `order[section]`:

- أضفه في نهاية نفس القسم

---

## PDF Content Structure

الحد الأدنى المطلوب:

1. Cover page
2. Diagnosis / status page
3. Suggested treatment page
4. Animation page
5. Document pages

في هذه المرحلة، إذا كانت صفحات النظام غير جاهزة في الـ backend، يمكن مؤقتًا تنفيذ:

- PDF يحتوي فقط على صفحات الـ documents المختارة

لكن الأفضل أن يبقى endpoint قابلًا للتوسعة ليشمل كامل treatment plan لاحقًا.

---

## Minimum Document Page Layout

لكل document page:

- عنوان الصفحة = `title`
- النص = `body`
- دعم multi-page إذا كان النص طويل

مقترح layout:

- Margin top: 50-70 px
- Title font أكبر
- Body font عادي
- page break تلقائي إذا تجاوز النص نهاية الصفحة

---

## Recommended Response Contract

### Success

```http
200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="treatment-plan-123.pdf"
```

### Errors

#### Plan not found

```json
{
  "success": false,
  "code": "PLAN_NOT_FOUND",
  "message": "Treatment plan not found."
}
```

#### Forbidden

```json
{
  "success": false,
  "code": "FORBIDDEN",
  "message": "You do not have access to this treatment plan."
}
```

#### PDF generation failed

```json
{
  "success": false,
  "code": "DOCUMENT_GENERATION_FAILED",
  "message": "Could not generate treatment plan PDF."
}
```

---

## Backend Implementation Notes

يفضل تقسيم التنفيذ إلى 3 طبقات:

### 1. Resolver

مسؤول عن:

- قراءة `document_presets`
- بناء `final_docs[]`
- جلب body لكل document

### 2. PDF Builder

مسؤول عن:

- إنشاء PDF
- إضافة العنوان والنص
- page breaks

### 3. Controller / Endpoint

مسؤول عن:

- auth
- validation
- استدعاء resolver
- استدعاء PDF builder
- إرجاع الـ stream

---

## Suggested Output Model Inside Backend

```ts
type ResolvedDocument = {
  id: string;
  title: string;
  section: "clinic" | "diagnosis" | "treatments" | "other";
  body: string;
};
```

---

## Acceptance Criteria

يعتبر التنفيذ مكتملًا عندما:

1. الضغط على زر `Download` ينزل PDF من الـ backend.
2. الملف يحتوي النصوص الحقيقية للوثائق المختارة.
3. الترتيب داخل الملف يطابق ترتيب `document_presets`.
4. الوثائق غير المختارة لا تظهر في الملف.
5. إذا كان النص طويلًا، يتم تقسيمه على أكثر من صفحة بدون قص.
6. إذا فشل التوليد، يرجع backend error واضح.

---

## Fast First Version

إذا أردتم أسرع تنفيذ ممكن الآن:

1. نفذوا endpoint:
   `GET /clinic/plans/{planId}/document`
2. اقرأوا `document_presets`
3. اجلبوا template bodies من `templates`
4. ضعوا fixed document texts في constants داخل backend
5. ولدوا PDF نصي بسيط
6. رجعوه كـ attachment

هذا كافٍ لتشغيل الزر بشكل صحيح الآن، ثم يمكن تحسين التصميم لاحقًا.

---

## Important Frontend Note

الواجهة الحالية فيها أكثر من شاشة `Overview`.

الـ backend يجب أن يدعم endpoint موحدًا، والفرونت سيستهلكه من الزر النهائي في مرحلة الـ wizard الخاصة بالخطة.

---

## Final Recommendation

لا تغيروا اسم الـ endpoint الحالي إذا أمكن:

`GET /clinic/plans/{planId}/document`

لأن هذا متوافق مع بنية الفرونت الحالية وأسهل في الدمج.
