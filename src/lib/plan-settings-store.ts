import { useEffect, useSyncExternalStore } from "react";
import { clinicApi } from "@/lib/admin/api";

export type PageSize = "A4" | "Letter" | "Legal";

export interface PageDesign {
  frontCover: { coverImage?: string; clinicName: string; title: string; subtitle?: string };
  innerPages: { headerText: string; footerLeft: string; footerRight: string; showFooter: boolean };
  backCover: { backImage?: string; title: string; note?: string };
}

export interface PlanSettings {
  language: string;
  pageSize: PageSize;
  priceListDesign: "compact" | "detailed" | "minimal";
  pricePage: {
    showPrices: boolean;
    showSubtotal: boolean;
    showDiscount: boolean;
    showTax: boolean;
    showTotal: boolean;
    showInsurance: boolean;
    currency: string;
  };
  planSections: {
    showDiagnosis: boolean;
    showTreatments: boolean;
    showDocuments: boolean;
    showOverview: boolean;
  };
  pageDesign: PageDesign;
  updatedAt: number;
}

const defaults: PlanSettings = {
  language: "English (EN)",
  pageSize: "A4",
  priceListDesign: "detailed",
  pricePage: {
    showPrices: true,
    showSubtotal: true,
    showDiscount: true,
    showTax: false,
    showTotal: true,
    showInsurance: true,
    currency: "USD",
  },
  planSections: {
    showDiagnosis: true,
    showTreatments: true,
    showDocuments: true,
    showOverview: true,
  },
  pageDesign: {
    frontCover: {
      clinicName: "Treatly",
      title: "TREATMENT PLAN",
      subtitle: "[PATIENT NAME]",
    },
    innerPages: {
      headerText: "Inner pages",
      footerLeft: "Footer (left)",
      footerRight: "Footer (right)",
      showFooter: true,
    },
    backCover: { title: "Back cover", note: "" },
  },
  updatedAt: Date.now(),
};

let state: PlanSettings = defaults;
const listeners = new Set<() => void>();
let inflight: Promise<void> | null = null;
let loaded = false;

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function applyRemote(raw: Record<string, unknown>) {
  const pricePage = (raw.price_page ?? {}) as Record<string, unknown>;
  const planSections = (raw.plan_sections ?? {}) as Record<string, unknown>;
  const pageDesign = (raw.page_design ?? {}) as Record<string, unknown>;
  const frontCover = (pageDesign.front_cover ?? {}) as Record<string, unknown>;
  const innerPages = (pageDesign.inner_pages ?? {}) as Record<string, unknown>;
  const backCover = (pageDesign.back_cover ?? {}) as Record<string, unknown>;

  state = {
    language: String(raw.language ?? defaults.language),
    pageSize: String(raw.page_size ?? defaults.pageSize) as PageSize,
    priceListDesign: String(raw.price_list_design ?? defaults.priceListDesign) as PlanSettings["priceListDesign"],
    pricePage: {
      showPrices: Boolean(pricePage.show_prices ?? defaults.pricePage.showPrices),
      showSubtotal: Boolean(pricePage.show_subtotal ?? defaults.pricePage.showSubtotal),
      showDiscount: Boolean(pricePage.show_discount ?? defaults.pricePage.showDiscount),
      showTax: Boolean(pricePage.show_tax ?? defaults.pricePage.showTax),
      showTotal: Boolean(pricePage.show_total ?? defaults.pricePage.showTotal),
      showInsurance: Boolean(pricePage.show_insurance ?? defaults.pricePage.showInsurance),
      currency: String(pricePage.currency ?? defaults.pricePage.currency),
    },
    planSections: {
      showDiagnosis: Boolean(planSections.show_diagnosis ?? defaults.planSections.showDiagnosis),
      showTreatments: Boolean(planSections.show_treatments ?? defaults.planSections.showTreatments),
      showDocuments: Boolean(planSections.show_documents ?? defaults.planSections.showDocuments),
      showOverview: Boolean(planSections.show_overview ?? defaults.planSections.showOverview),
    },
    pageDesign: {
      frontCover: {
        coverImage: frontCover.cover_image ? String(frontCover.cover_image) : undefined,
        clinicName: String(frontCover.clinic_name ?? defaults.pageDesign.frontCover.clinicName),
        title: String(frontCover.title ?? defaults.pageDesign.frontCover.title),
        subtitle: frontCover.subtitle ? String(frontCover.subtitle) : defaults.pageDesign.frontCover.subtitle,
      },
      innerPages: {
        headerText: String(innerPages.header_text ?? defaults.pageDesign.innerPages.headerText),
        footerLeft: String(innerPages.footer_left ?? defaults.pageDesign.innerPages.footerLeft),
        footerRight: String(innerPages.footer_right ?? defaults.pageDesign.innerPages.footerRight),
        showFooter: Boolean(innerPages.show_footer ?? defaults.pageDesign.innerPages.showFooter),
      },
      backCover: {
        backImage: backCover.back_image ? String(backCover.back_image) : undefined,
        title: String(backCover.title ?? defaults.pageDesign.backCover.title),
        note: backCover.note ? String(backCover.note) : "",
      },
    },
    updatedAt: new Date(String(raw.updated_at ?? new Date().toISOString())).getTime(),
  };
  loaded = true;
  emit();
}

async function loadSettings(force = false) {
  if (!force && loaded) return;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await clinicApi.planSettings.get();
      applyRemote(res);
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

function toPayload(settings: PlanSettings) {
  return {
    language: settings.language,
    page_size: settings.pageSize,
    price_list_design: settings.priceListDesign,
    price_page: {
      show_prices: settings.pricePage.showPrices,
      show_subtotal: settings.pricePage.showSubtotal,
      show_discount: settings.pricePage.showDiscount,
      show_tax: settings.pricePage.showTax,
      show_total: settings.pricePage.showTotal,
      show_insurance: settings.pricePage.showInsurance,
      currency: settings.pricePage.currency,
    },
    plan_sections: {
      show_diagnosis: settings.planSections.showDiagnosis,
      show_treatments: settings.planSections.showTreatments,
      show_documents: settings.planSections.showDocuments,
      show_overview: settings.planSections.showOverview,
    },
    page_design: {
      front_cover: {
        cover_image: settings.pageDesign.frontCover.coverImage ?? null,
        clinic_name: settings.pageDesign.frontCover.clinicName,
        title: settings.pageDesign.frontCover.title,
        subtitle: settings.pageDesign.frontCover.subtitle ?? null,
      },
      inner_pages: {
        header_text: settings.pageDesign.innerPages.headerText,
        footer_left: settings.pageDesign.innerPages.footerLeft,
        footer_right: settings.pageDesign.innerPages.footerRight,
        show_footer: settings.pageDesign.innerPages.showFooter,
      },
      back_cover: {
        back_image: settings.pageDesign.backCover.backImage ?? null,
        title: settings.pageDesign.backCover.title,
        note: settings.pageDesign.backCover.note ?? null,
      },
    },
  };
}

function persist() {
  void clinicApi.planSettings.update(toPayload(state));
}

export function usePlanSettings() {
  useEffect(() => {
    void loadSettings();
  }, []);
  return useSyncExternalStore(subscribe, () => state, () => state);
}

export const planSettingsStore = {
  async reload() {
    await loadSettings(true);
  },

  update(patch: Partial<PlanSettings>) {
    state = { ...state, ...patch, updatedAt: Date.now() };
    emit();
    persist();
  },

  updatePageDesign<K extends keyof PageDesign>(key: K, patch: Partial<PageDesign[K]>) {
    state = {
      ...state,
      pageDesign: {
        ...state.pageDesign,
        [key]: { ...state.pageDesign[key], ...patch },
      },
      updatedAt: Date.now(),
    };
    emit();
    persist();
  },
};
