import type { DentalMark, DentalVisual } from "./dental-visuals";

/** Conditions already drawn by the original detailed tooth, without an icon overlay. */
export const ORIGINAL_TOOTH_NOTES: Partial<Record<DentalMark, string>> = {
  intact: "",
  missing: "Missing",
  caries: "Caries",
  discolored: "Discolored",
  worn: "Worn",
  fractured: "Fractured",
  fracturedRoot: "Fractured root",
  radix: "Radix",
  resorption: "Root resorption",
  mobility: "Mobility",
  necrosis: "Necrosis",
  composite: "Filled (composite)",
  amalgam: "Filled (amalgam)",
  inlay: "Inlay",
  root: "Root treated",
  post: "Post",
  pin: "Parapulpal pin",
  implant: "Implant",
  abutment: "Implant + abutment",
  crown: "Crown",
  veneer: "Veneer",
  bridge: "Bridge",
  dentures: "Dentures",
  plaque: "Plaque",
  gingivitis: "Gingivitis",
  periodontitis: "Periodontitis",
  recession: "Gingival recession",
  overgrowth: "Gingival overgrowth",
  boneLoss: "Bone loss",
  gummy: "Gummy smile",
  forward: "Drifted (front)",
  backward: "Drifted (back)",
  apical: "Apical lesion",
  cyst: "Cyst",
  granuloma: "Granuloma",
  impacted: "Impacted",
  malocclusion: "Malocclusion",
};

/** Extend the original enamel / gold / titanium / gum palette to newer procedures. */
export function detailedDentalStyle(visual: DentalVisual): DentalVisual {
  const mark = visual.mark;
  let color = "#6C8EB4";
  if (
    ["root", "rootOne", "rootTwo", "rootThree", "retreatment", "apicoectomy", "necrosis"].includes(
      mark,
    )
  )
    color = "#C05030";
  else if (["implant", "abutment", "screw", "post", "pin", "bar"].includes(mark)) color = "#5C7FA0";
  else if (["crown", "inlay", "onlay"].includes(mark)) color = "#C8980C";
  else if (
    ["bridge", "malocclusion", "forward", "backward", "impacted", "aligner", "braces"].includes(
      mark,
    )
  )
    color = "#7C4AC9";
  else if (
    [
      "caries",
      "fractured",
      "fracturedRoot",
      "missing",
      "extraction",
      "surgical",
      "crownRemoval",
      "bridgeRemoval",
      "implantRemoval",
      "apical",
      "cyst",
      "granuloma",
    ].includes(mark)
  )
    color = "#C0776A";
  else if (
    [
      "dentures",
      "gingivitis",
      "periodontitis",
      "overgrowth",
      "recession",
      "gummy",
      "graft",
      "gingivectomy",
      "pocket",
      "lengthening",
      "boneLoss",
    ].includes(mark)
  )
    color = "#D76B76";
  else if (["amalgam", "temporary", "medicated", "composite", "core"].includes(mark))
    color = "#687F91";
  else if (mark === "veneer") color = "#83C7CB";
  else if (mark === "plaque") color = "#D8BC54";
  return { ...visual, color, background: `${color}18`, border: `${color}55` };
}
