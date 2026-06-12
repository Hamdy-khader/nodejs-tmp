# Backend Spec: Documents Selection -> Overview -> Download

## Goal

تنفيذ تدفق backend يربط بين:

1. اختيار الـ templates في تبويب `Documents`
2. حفظ العناصر المختارة وترتيبها
3. عرض نفس العناصر في تبويب `Overview`
4. تنزيل PDF النهائي من endpoint التحميل باستخدام نفس العناصر المحفوظة

---

## Frontend Behavior Today

الفرونت الآن يعمل كالتالي:

### Documents tab

عند عمل check / uncheck على document أو template:

- يتم تحديث `selected_ids`
- يتم حفظ الترتيب داخل `order`
- يتم إرسال الحفظ مباشرة إلى backend

الـ frontend يتوقع هذه الـ APIs:

- `GET /clinic/document-presets`
- `PUT /clinic/document-presets`
- `POST /clinic/document-presets/reset`

### Overview tab

الفرونت يقرأ نفس البيانات المحفوظة:

- `selected_ids`
- `order`

ثم يعرض فقط الوثائق المختارة، بالترتيب نفسه.

### Download button

زر التحميل في `Overview` يستدعي:

`GET /clinic/plans/{planId}/document`

ويفترض أن الـ backend سيولد الـ PDF باستخدام نفس الوثائق المحفوظة في `document-presets`.

---

## What Backend Must Do

يوجد مساران مطلوبان:

## 1. Save selected documents

### Endpoint

`PUT /clinic/document-presets`

### Expected request body

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

### Required behavior

- حفظ الإعدادات per clinic
- overwrite آخر نسخة محفوظة
- إعادة payload النهائي بعد الحفظ

### Success response

```json
{
  "selected_ids": ["fixed:clinic:demo", "template-id-1"],
  "order": {
    "clinic": ["fixed:clinic:demo"],
    "opg": [],
    "diagnosis": ["template-id-1"],
    "treatments": [],
    "other": []
  }
}
```

---

## 2. Generate final PDF using saved selections

### Endpoint

`GET /clinic/plans/{planId}/document`

### Required behavior

عند استدعاء هذا endpoint يجب:

1. التحقق من صلاحية المستخدم والعيادة
2. جلب خطة العلاج `planId`
3. جلب `document-presets` الخاصة بنفس العيادة
4. قراءة:
   - `selected_ids`
   - `order`
5. بناء القائمة النهائية للوثائق التي يجب إرفاقها
6. جلب النص الفعلي لكل وثيقة
7. توليد PDF
8. إرجاعه كملف قابل للتحميل

---

## Selection Source of Truth

الـ backend يجب أن يعتبر `document-presets` هي المصدر الرسمي لاختيار الوثائق.

بمعنى:

- ما هو موجود في `selected_ids` فقط هو الذي يجب أن يظهر في `Overview`
- وما هو موجود في `selected_ids` فقط هو الذي يجب أن يدخل في PDF النهائي

إذا لم يكن العنصر selected:

- لا يظهر في الـ PDF
- حتى لو كان موجودًا في `order`

---

## Document Types

يوجد نوعان من العناصر:

## A. Fixed documents

هذه IDs ثابتة:

```txt
fixed:clinic:demo
fixed:clinic:note
fixed:diagnosis:note
fixed:treatments:note
fixed:other:guarantee
fixed:other:ourclinic
fixed:other:note
```

هذه العناصر يجب أن يحلها الـ backend إلى:

- title
- body

يمكن تنفيذ ذلك مؤقتًا عبر constants داخل backend.

## B. Dynamic templates

أي id ليس من نوع `fixed:*` يعتبر template ديناميكي.

يجب جلبه من جدول `templates`.

الحقول المطلوبة:

- `id`
- `title`
- `category`
- `body` أو `body_html`
- `language`
- `order`

---

## Final Ordering Rules

الترتيب النهائي داخل PDF يجب أن يكون:

1. `clinic`
2. `diagnosis`
3. `treatments`
4. `other`

داخل كل section:

- استخدم `order[section]`
- خذ فقط العناصر الموجودة في `selected_ids`
- إذا كان هناك element selected لكنه غير موجود في `order[section]` أضفه في نهاية نفس القسم

Pseudo logic:

```txt
final_docs = []

for section in [clinic, diagnosis, treatments, other]:
  ordered_ids = order[section]

  for id in ordered_ids:
    if id in selected_ids:
      final_docs.push(id)

  for id in selected_ids belonging to same section:
    if id not in ordered_ids:
      final_docs.push(id)
```

---

## How Backend Determines Section

### For fixed ids

يمكن استخراج الـ section من الـ id نفسه:

```txt
fixed:clinic:demo        -> clinic
fixed:diagnosis:note     -> diagnosis
fixed:treatments:note    -> treatments
fixed:other:guarantee    -> other
```

### For template ids

يتم تحديد الـ section من `templates.category`

mapping مقترح:

- `diagnosis` -> diagnosis
- `treatments` -> treatments
- `other` -> other
- `dentists` -> other

---

## PDF Content Rules

الحد الأدنى المطلوب الآن:

- يمكن أن يحتوي الـ PDF فقط على الوثائق المختارة

أو إذا كانت صفحات الخطة الأساسية موجودة أصلًا:

- أضف الوثائق المختارة بعد الصفحات الأساسية

لكل document page:

- title
- body
- page break تلقائي إذا كان النص طويل

---

## Expected Response

### Success

```http
200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="treatment-plan-{planId}.pdf"
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

#### No access

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

## Backend Acceptance Criteria

يعتبر التنفيذ صحيحًا عندما:

1. أي template يعمل عليه المستخدم check في `Documents` يتم حفظه في `document-presets`
2. أي template غير selected لا يدخل في ملف التحميل
3. ترتيب الوثائق في الـ PDF يطابق `order`
4. `Overview` و `Download` يعتمدان على نفس المصدر المحفوظ
5. الـ PDF يحتوي النص الحقيقي للـ templates المختارة
6. الـ backend يتجاهل العناصر غير الموجودة أو المحذوفة بأمان

---

## Important Note

الـ frontend الحالي لا يرسل قائمة templates مع طلب التحميل نفسه.

بدل ذلك:

- الـ frontend يحفظ الاختيارات أولًا في `document-presets`
- ثم endpoint التحميل يجب أن يقرأ هذه الاختيارات من قاعدة البيانات عند تنفيذ:

`GET /clinic/plans/{planId}/document`

هذا هو السلوك المطلوب والمعتمد.
