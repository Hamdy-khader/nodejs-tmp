import { groupTreatmentItems, treatmentItemsTotal, PRICE_MODES } from "@/lib/treatment-groups";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Odontogram } from "./odontogram/Odontogram";
import { getStatusMeta, type TreatmentPlan, type TreatmentRow } from "@/lib/patients-store";
import { planEntries } from "@/lib/dental/plan-diagnosis";
import { plannedStates } from "@/lib/dental/treatment-engine";
import type { TreatmentPlanPdfPage } from "@/lib/treatment-plan-pdf";
import type { PlanSettings } from "@/lib/plan-settings-store";
import {
  resolveCoverImage,
  resolveTemplate,
  type PdfExportContext,
} from "@/lib/pdf-export-context";
import {
  reportPageHeight,
  reportTableOptions,
  REPORT_XRAY_HEIGHT,
  REPORT_XRAY_BLOCK_HEIGHT,
} from "@/lib/treatment-report-layout";

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
  const backImage = page.kind === "back" ? settings.pageDesign.backCover.backImage : undefined;
  const logo = settings.pageDesign.innerPages.logo;
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
          padding: page.kind === "cover" || backImage ? 0 : "26px 34px 22px",
          fontSize: 9,
        }}
      >
        {page.kind === "cover" ? (
          <ReportCover settings={settings} context={exportContext} />
        ) : backImage ? (
          <img
            src={backImage}
            alt="Back cover"
            crossOrigin="anonymous"
            style={{ flex: 1, width: "100%", minHeight: 0, objectFit: "cover" }}
          />
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
              {logo ? (
                <img
                  src={logo}
                  alt="Clinic logo"
                  crossOrigin="anonymous"
                  style={{ maxHeight: 30, maxWidth: 150, objectFit: "contain" }}
                />
              ) : (
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
              )}
            </header>
            <main style={{ flex: 1 }}>
              {page.kind === "status" && <ReportDiagnosis plan={plan} />}
              {page.kind === "xray" && (
                <ReportXray title={page.title} imageUrl={page.imageUrl} />
              )}
              {page.kind === "suggested" && (
                <ReportTreatment page={page} plan={plan} settings={settings} />
              )}
              {page.xrays?.map((xray, imageIndex) => <ReportXray key={imageIndex} {...xray} />)}
              {(page.kind === "document" || page.kind === "suggested") &&
                (page.documents ?? (page.kind === "document" ? [{ title: page.title, body: page.body }] : [])).map(
                  (document, documentIndex) => (
                    <section key={documentIndex}>
                      {document.title && <h3 style={{ fontSize: 14, margin: "14px 0" }}>{document.title}</h3>}
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

function ReportXray({ title, imageUrl }: { title: string; imageUrl?: string }) {
  return (
    <figure data-pdf-keep-together style={{ margin: 0, padding: "12px 0", height: REPORT_XRAY_BLOCK_HEIGHT, boxSizing: "border-box", breakInside: "avoid" }}>
      <figcaption style={{ fontSize: 9, lineHeight: "12px", height: 12 }}>{title}</figcaption>
      <img src={imageUrl} alt={title} crossOrigin="anonymous" style={{ display: "block", width: "100%", height: REPORT_XRAY_HEIGHT, objectFit: "contain" }} />
    </figure>
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

// The same chart as the plan screen, read-only; the treatment page adds the
// planned work in green.
function ReportChart({ plan, rows }: { plan: TreatmentPlan; rows?: TreatmentRow[] }) {
  const entries = useMemo(() => planEntries(plan.teeth, plan.generalStatuses), [plan.teeth, plan.generalStatuses]);
  const planned = useMemo(() => (rows ? plannedStates(rows) : []), [rows]);
  return (
    <div data-pdf-keep-together style={{ padding: "4px 0" }}>
      <Odontogram entries={entries} planned={planned} mode={rows ? "treatments" : "diagnosis"} readOnly />
    </div>
  );
}

function ReportDiagnosis({ plan }: { plan: TreatmentPlan }) {
  return (
    <>
      <ReportChart plan={plan} />
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
  const { showSubtotal, showDiscount, currency } = settings.pricePage;
  const showAmount = settings.pricePage.showAmount ?? true;
  const showUnitPrice = settings.pricePage.showUnitPrice ?? settings.pricePage.showPrices;
  const showPrice = settings.pricePage.showPrice ?? settings.pricePage.showPrices;
  const showTotal = settings.pricePage.showTotal;
  const { showJaws, showVisits } = reportTableOptions(settings);
  // "Fit to page" draws the whole table smaller so it stays on this page.
  const scale = page.fitScale ?? 1;
  const px = (value: number) => value * scale;
  const money = (value: number) =>
    `${currency === "EUR" ? "€" : currency === "USD" ? "$" : currency} ${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  const allRows = plan.treatments ?? [];
  const subtotal = allRows.reduce(
    (sum, row) =>
      sum +
      (row.kind === "visit"
        ? treatmentItemsTotal(row.items)
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
  const visits = allRows.filter((row) => row.kind === "visit");
  const allItems = visits.flatMap((visit) => visit.items);
  // A continued fragment still needs its whole visit to know who owns a package.
  const contextItems = (row: Extract<TreatmentRow, { kind: "visit" }>) =>
    showVisits ? visits.find((visit) => visit.id === row.id)?.items ?? row.items : allItems;
  const columns = [
    { label: "Treatment", width: 0, visible: true },
    { label: "Amount", width: 11, visible: showAmount },
    { label: "Unit price", width: 16, visible: showUnitPrice },
    { label: "Price", width: 16, visible: showPrice },
  ].filter((column) => column.visible);
  const nameWidth = 100 - columns.reduce((sum, column) => sum + column.width, 0);
  const totals: Array<[string, number]> =
    discount > 0
      ? [
          ...(showSubtotal ? [["Total", subtotal] as [string, number]] : []),
          ...(showDiscount ? [["Discount", -discount] as [string, number]] : []),
          ["Discounted price", Math.max(0, subtotal - discount)],
        ]
      : [["Total", subtotal]];
  return (
    <>
      {page.showTreatmentChart && <ReportChart plan={plan} rows={allRows} />}
      <div style={{ fontSize: px(9) }}>
        {(page.treatmentRows ?? []).map((row, index) => (
          <section key={`${row.id}-${index}`} style={{ marginTop: px(10) }}>
            {row.kind === "visit" ? (
              <>
                {showVisits && (
                  <div
                    data-pdf-keep-together
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      background: "#ededed",
                      padding: `${px(7)}px ${px(6)}px`,
                      fontSize: px(10),
                      fontWeight: 700,
                    }}
                  >
                    <span>
                      {visits.findIndex((visit) => visit.id === row.id) + 1}. Visit: {row.label}
                    </span>
                    {showPrice && <span>{money(treatmentItemsTotal(contextItems(row)))}</span>}
                  </div>
                )}
                {showVisits && row.note && (
                  <p style={{ margin: `${px(4)}px ${px(6)}px`, whiteSpace: "pre-wrap" }}>{row.note}</p>
                )}
                <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                  <colgroup>
                    {columns.map((column) => (
                      <col key={column.label} style={{ width: `${column.width || nameWidth}%` }} />
                    ))}
                  </colgroup>
                  <thead>
                    <tr style={{ color: "#999", borderBottom: "1px solid #bbb" }}>
                      {columns.map((column, i) => (
                        <th
                          key={column.label}
                          style={{
                            padding: `${px(5)}px ${px(6)}px`,
                            fontWeight: 400,
                            textAlign: i ? "right" : "left",
                          }}
                        >
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {groupTreatmentItems(row.items, contextItems(row), { splitJaws: showJaws }).map((group) => (
                      <tr
                        key={group.id}
                        data-pdf-keep-together
                        style={{ borderBottom: "1px solid #ddd" }}
                      >
                        <td style={{ padding: px(6), lineHeight: `${px(13)}px`, overflowWrap: "anywhere" }}>
                          {group.items[0].name}
                          {group.jaw && ` — ${group.jaw}`}
                          {group.teeth.length > 0 && ` (${group.teeth.join(", ")})`}
                        </td>
                        {showAmount && <td style={{ textAlign: "right", padding: px(6) }}>{group.amount} ×</td>}
                        {showUnitPrice && (
                          <td style={{ textAlign: "right", padding: px(6) }}>
                            {group.packageIncluded ? "In package" : group.priceMode === "unit" ? money(group.unitPrice) : group.priceMode === "package" ? `${money(group.unitPrice)} (${PRICE_MODES[group.priceMode]})` : PRICE_MODES[group.priceMode]}
                          </td>
                        )}
                        {showPrice && (
                          <td style={{ textAlign: "right", padding: px(6) }}>
                            {group.packageIncluded ? "In package" : money(group.total)}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <div data-pdf-keep-together style={{ padding: `${px(7)}px ${px(6)}px` }}>
                {row.kind === "healing" ? (
                  <>
                    Healing period: {row.label} {row.days != null && `${row.days} days`}
                  </>
                ) : (
                  <>
                    Discount{" "}
                    {(showUnitPrice || showPrice) && (row.mode === "percent" ? `${row.value}%` : money(row.value))}
                  </>
                )}
                {row.note && <p style={{ whiteSpace: "pre-wrap" }}>{row.note}</p>}
              </div>
            )}
          </section>
        ))}
        {page.showTotals && (
          <div data-pdf-keep-together style={{ marginTop: px(18) }}>
            {showTotal && (
              <div style={{ background: "#ededed", fontSize: px(11), fontWeight: 700 }}>
                {totals.map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      borderBottom: "1px solid #bbb",
                      padding: px(6),
                    }}
                  >
                    <span>{label}</span>
                    <span>{money(value)}</span>
                  </div>
                ))}
              </div>
            )}
            {plan.treatmentNote && (
              <p style={{ whiteSpace: "pre-wrap", marginTop: px(12) }}>{plan.treatmentNote}</p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
