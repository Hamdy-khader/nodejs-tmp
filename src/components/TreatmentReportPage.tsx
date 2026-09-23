import { useEffect, useRef, useState, type RefObject } from "react";
import { TeethChart } from "./TeethChart";
import { getStatusMeta, type TreatmentPlan, type TreatmentRow } from "@/lib/patients-store";
import type { TreatmentPlanPdfPage } from "@/lib/treatment-plan-pdf";
import type { PlanSettings } from "@/lib/plan-settings-store";
import {
  resolveCoverImage,
  resolveTemplate,
  type PdfExportContext,
} from "@/lib/pdf-export-context";
import { getTreatmentTeeth } from "@/lib/treatment-teeth";
import { reportPageHeight } from "@/lib/treatment-report-layout";

export function TreatmentReportPage({
  page,
  index,
  total,
  plan,
  settings,
  pageRef,
  exportContext,
}: {
  page: TreatmentPlanPdfPage;
  index: number;
  total: number;
  plan: TreatmentPlan;
  settings: PlanSettings;
  pageRef: RefObject<HTMLDivElement | null>;
  exportContext: PdfExportContext;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const height = reportPageHeight(settings.pageSize);
  useEffect(() => {
    if (!host.current) return;
    const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / 595));
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={host}
      className="relative w-full self-start overflow-hidden rounded border bg-white shadow-sm"
      style={{ aspectRatio: `595 / ${height}` }}
    >
      <article
        ref={pageRef}
        data-overview-export-page="true"
        data-page-kind={page.kind}
        style={{
          width: 595,
          minHeight: height,
          height,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          fontFamily: "Arial, sans-serif",
          color: "#171717",
          background: "white",
          position: "absolute",
          display: "flex",
          flexDirection: "column",
          padding: page.kind === "cover" ? 0 : "26px 34px 22px",
          fontSize: 9,
        }}
      >
        {page.kind === "cover" ? (
          <ReportCover settings={settings} context={exportContext} />
        ) : (
          <>
            <header
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #ccc",
                paddingBottom: 17,
                marginBottom: 8,
                minHeight: 38,
              }}
            >
              <h2
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "Arial, sans-serif",
                  color: "#666",
                  textTransform: "uppercase",
                }}
              >
                {page.title}
              </h2>
              <span
                style={{
                  fontFamily: "Georgia, serif",
                  fontStyle: "italic",
                  fontSize: 12,
                  color: "#8c7638",
                }}
              >
                {exportContext.clinicName}
              </span>
            </header>
            <main style={{ flex: 1 }}>
              {page.kind === "status" && <ReportDiagnosis plan={plan} />}
              {page.kind === "xray" && (
                <div
                  style={{
                    height: 680,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <img
                    src={page.imageUrl}
                    alt="Patient X-ray"
                    crossOrigin="anonymous"
                    style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                  />
                </div>
              )}
              {page.kind === "suggested" && (
                <ReportTreatment page={page} plan={plan} settings={settings} />
              )}
              {page.kind === "document" &&
                (page.documents ?? [{ title: page.title, body: page.body }]).map(
                  (document, documentIndex) => (
                    <section key={documentIndex}>
                      <h3 style={{ fontSize: 14, margin: "14px 0" }}>{document.title}</h3>
                      <div
                        style={{ whiteSpace: "pre-wrap", lineHeight: 1.65, overflowWrap: "anywhere" }}
                      >
                        {document.body}
                      </div>
                    </section>
                  ),
                )}
              {page.kind === "back" && (
                <div style={{ paddingTop: 100, textAlign: "center" }}>
                  <h2 style={{ fontSize: 26 }}>{settings.pageDesign.backCover.title}</h2>
                  <p style={{ whiteSpace: "pre-wrap", marginTop: 20 }}>
                    {settings.pageDesign.backCover.note}
                  </p>
                </div>
              )}
            </main>
            {settings.pageDesign.innerPages.showFooter && (
              <footer
                style={{
                  borderTop: "1px solid #bbb",
                  paddingTop: 24,
                  marginTop: 16,
                  textAlign: "center",
                  fontSize: 8,
                  color: "#666",
                }}
              >
                <div>
                  {index} / {total}
                </div>
                <div>
                  {resolveTemplate(settings.pageDesign.innerPages.footerLeft, exportContext) ||
                    exportContext.clinicName}
                </div>
                <div>
                  {resolveTemplate(settings.pageDesign.innerPages.footerRight, exportContext)}
                </div>
              </footer>
            )}
          </>
        )}
      </article>
    </div>
  );
}

function ReportCover({ settings, context }: { settings: PlanSettings; context: PdfExportContext }) {
  const cover = settings.pageDesign.frontCover;
  return (
    <div
      style={{
        position: "relative",
        flex: 1,
        overflow: "hidden",
        background: "linear-gradient(120deg,#f2eddf,#fffdf5 55%,#e8e0cb)",
        color: "#8e7534",
      }}
    >
      <img
        src={resolveCoverImage(cover.coverImage)}
        alt="Clinic cover"
        crossOrigin="anonymous"
        style={{
          position: "absolute",
          top: 135,
          width: "100%",
          height: 500,
          objectFit: "cover",
          borderRadius: "0 0 48% 22%",
        }}
      />
      <div
        style={{
          position: "relative",
          height: 215,
          padding: "40px 26px",
          textAlign: "center",
          background: "#080808",
          borderRadius: "0 0 60% 10%",
        }}
      >
        <h1 style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 45 }}>
          {context.clinicName}
        </h1>
        <p style={{ marginTop: 15, fontSize: 13, letterSpacing: 2 }}>
          {resolveTemplate(cover.subtitle, context).replace("[PATIENT NAME]", context.patientName)}
        </p>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 105,
          width: "100%",
          textAlign: "center",
          padding: "0 30px",
        }}
      >
        <h2 style={{ fontSize: 23, letterSpacing: 2, textTransform: "uppercase" }}>
          {cover.title || "Treatment plan"}
        </h2>
        <p style={{ fontSize: 20, fontWeight: 700, marginTop: 6 }}>{context.patientName}</p>
      </div>
    </div>
  );
}

function ReportDiagnosis({ plan }: { plan: TreatmentPlan }) {
  return (
    <>
      <TeethChart teeth={plan.teeth} report />
      {!!plan.generalStatuses?.length && (
        <p style={{ margin: "8px 0" }}>{plan.generalStatuses.join(" · ")}</p>
      )}
      {[
        { title: "Upper jaw", left: 1, right: 2 },
        { title: "Lower jaw", left: 4, right: 3 },
      ].map((jaw) => (
        <section key={jaw.title} style={{ marginTop: 14 }}>
          <h3
            style={{
              background: "#ededed",
              padding: "6px",
              fontSize: 10,
              fontWeight: 700,
              fontFamily: "Arial, sans-serif",
            }}
          >
            Diagnosis - {jaw.title}
          </h3>
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              data-pdf-keep-together
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 14 }}
            >
              {[jaw.left * 10 + i + 1, jaw.right * 10 + i + 1].map((number) => {
                const tooth = plan.teeth[number];
                const label = tooth?.note || getStatusMeta(tooth?.status ?? "intact").label;
                const intact =
                  tooth?.status === "intact" &&
                  (!tooth.note || tooth.note === "Intact") &&
                  !tooth.diagnosis?.length;
                return (
                  <div
                    key={number}
                    style={{
                      padding: "5px",
                      borderBottom: "1px solid #e7e7e7",
                      color: intact ? "#aaa" : "#111",
                      lineHeight: "12px",
                      overflowWrap: "anywhere",
                    }}
                  >
                    <span style={{ marginRight: 5 }}>{number}.</span>
                    {label}
                    {!!tooth?.diagnosis?.length && ` - ${tooth.diagnosis.join(", ")}`}
                  </div>
                );
              })}
            </div>
          ))}
        </section>
      ))}
    </>
  );
}

function ReportTreatment({
  page,
  plan,
  settings,
}: {
  page: TreatmentPlanPdfPage;
  plan: TreatmentPlan;
  settings: PlanSettings;
}) {
  const { showPrices, showSubtotal, showTotal, showDiscount, currency } = settings.pricePage;
  const money = (value: number) =>
    `${currency === "EUR" ? "€" : currency === "USD" ? "$" : currency} ${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  const allRows = plan.treatments ?? [];
  const subtotal = allRows.reduce(
    (sum, row) =>
      sum +
      (row.kind === "visit"
        ? row.items.reduce((n, item) => n + item.amount * item.unitPrice, 0)
        : 0),
    0,
  );
  const discount = allRows.reduce(
    (sum, row) =>
      sum +
      (row.kind === "discount"
        ? row.mode === "percent"
          ? (subtotal * row.value) / 100
          : row.value
        : 0),
    0,
  );
  const teeth = getTreatmentTeeth(plan.teeth, allRows);
  const visits = allRows.filter((row) => row.kind === "visit");
  return (
    <>
      {page.showTreatmentChart && (
        <TeethChart
          teeth={teeth}
          highlighted={allRows.flatMap((row) =>
            row.kind === "visit"
              ? row.items.flatMap((item) => (item.toothNumber == null ? [] : [item.toothNumber]))
              : [],
          )}
          report
        />
      )}
      {(page.treatmentRows ?? []).map((row, index) => (
        <section key={`${row.id}-${index}`} style={{ marginTop: 10 }}>
          {row.kind === "visit" ? (
            <>
              <div
                data-pdf-keep-together
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  background: "#ededed",
                  padding: "7px 6px",
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                <span>
                  {visits.findIndex((visit) => visit.id === row.id) + 1}. Visit: {row.label}
                </span>
                {showPrices && (
                  <span>
                    {money(
                      (
                        visits.find((visit) => visit.id === row.id) as
                          | Extract<TreatmentRow, { kind: "visit" }>
                          | undefined
                      )?.items.reduce((sum, item) => sum + item.amount * item.unitPrice, 0) ?? 0,
                    )}
                  </span>
                )}
              </div>
              {row.note && <p style={{ margin: "4px 6px", whiteSpace: "pre-wrap" }}>{row.note}</p>}
              <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: "57%" }} />
                  <col style={{ width: "11%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "16%" }} />
                </colgroup>
                <thead>
                  <tr style={{ color: "#999", borderBottom: "1px solid #bbb" }}>
                    {["Treatment", "Amount", "Unit price", "Price"].map((label, i) => (
                      <th
                        key={label}
                        style={{
                          padding: "5px 6px",
                          fontWeight: 400,
                          textAlign: i ? "right" : "left",
                        }}
                      >
                        {!showPrices && i > 1 ? "" : label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {row.items.map((item) => (
                    <tr
                      key={item.id}
                      data-pdf-keep-together
                      style={{ borderBottom: "1px solid #ddd" }}
                    >
                      <td style={{ padding: "6px", lineHeight: "13px", overflowWrap: "anywhere" }}>
                        {item.name}
                        {item.toothNumber != null && ` (${item.toothNumber})`}
                      </td>
                      <td style={{ textAlign: "right", padding: 6 }}>{item.amount} ×</td>
                      <td style={{ textAlign: "right", padding: 6 }}>
                        {showPrices && money(item.unitPrice)}
                      </td>
                      <td style={{ textAlign: "right", padding: 6 }}>
                        {showPrices && money(item.unitPrice * item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <div data-pdf-keep-together style={{ padding: "7px 6px" }}>
              {row.kind === "healing" ? (
                <>
                  Healing period: {row.label} {row.days != null && `${row.days} days`}
                </>
              ) : (
                <>
                  Discount{" "}
                  {showPrices && (row.mode === "percent" ? `${row.value}%` : money(row.value))}
                </>
              )}
              {row.note && <p style={{ whiteSpace: "pre-wrap" }}>{row.note}</p>}
            </div>
          )}
        </section>
      ))}
      {page.showTotals && (
        <div data-pdf-keep-together style={{ marginTop: 18 }}>
          {showPrices && (
            <div style={{ background: "#ededed", fontSize: 11, fontWeight: 700 }}>
              {[
                ["Total", subtotal, showSubtotal],
                ["Discount", -discount, showDiscount && discount > 0],
                [
                  discount > 0 ? "Discounted price" : "Total payable",
                  Math.max(0, subtotal - discount),
                  showTotal,
                ],
              ].map(([label, value, visible]) =>
                visible ? (
                  <div
                    key={String(label)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      borderBottom: "1px solid #bbb",
                      padding: "6px",
                    }}
                  >
                    <span>{label}</span>
                    <span>{money(Number(value))}</span>
                  </div>
                ) : null,
              )}
            </div>
          )}
          {plan.treatmentNote && (
            <p style={{ whiteSpace: "pre-wrap", marginTop: 12 }}>{plan.treatmentNote}</p>
          )}
        </div>
      )}
    </>
  );
}
