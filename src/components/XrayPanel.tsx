import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import {
  ChevronLeft, ChevronRight, Maximize2, UploadCloud, X, RotateCcw, Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { patientsStore, type XrayImage } from "@/lib/patients-store";
import { cn } from "@/lib/utils";
import { clinicApi } from "@/lib/admin/api";
import { DEFAULT_XRAY_ADJUST as DEFAULT_ADJUST, renderXrayImage, type ImageAdjust } from "@/lib/xray-image";
import { toast } from "sonner";

interface XrayPanelProps {
  ref?: Ref<XrayPanelHandle>;
  planId: string;
  xrays: XrayImage[];
  onClose: () => void;
}

export interface XrayPanelHandle {
  save: () => Promise<boolean>;
}

export function XrayPanel({ planId, xrays, onClose, ref }: XrayPanelProps) {
  const [index, setIndex] = useState(0);
  const [adjust, setAdjust] = useState<ImageAdjust>(DEFAULT_ADJUST);
  const [fullscreen, setFullscreen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const inlineImage = useRef<HTMLImageElement>(null);
  const fullscreenImage = useRef<HTMLImageElement>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const current = xrays[index];
  const dirty = Object.keys(DEFAULT_ADJUST).some((key) => adjust[key as keyof ImageAdjust] !== DEFAULT_ADJUST[key as keyof ImageAdjust]);

  const save = async (): Promise<boolean> => {
    if (savingRef.current) return false;
    if (!current || !dirty) return true;
    const image = fullscreen ? fullscreenImage.current : inlineImage.current;
    const frame = image?.parentElement;
    if (!image?.complete || !image.naturalWidth || !frame) {
      toast.error("Wait for the X-ray to load before saving.");
      return false;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      const view = { width: frame.clientWidth, height: frame.clientHeight, imageWidth: image.clientWidth, imageHeight: image.clientHeight };
      const source = await clinicApi.plans.downloadXray(planId, current.id);
      const file = await renderXrayImage(source, adjust, view);
      await patientsStore.replaceXray(planId, current.id, file);
      setAdjust(DEFAULT_ADJUST);
      toast.success("X-ray image saved.");
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the X-ray. Your adjustments are still here; please retry.");
      return false;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const selectImage = async (next: number) => {
    if (await save()) setIndex(next);
  };
  const close = async () => {
    if (await save()) onClose();
  };
  useImperativeHandle(ref, () => ({ save }));

  useEffect(() => {
    void patientsStore.loadXrays(planId);
  }, [planId]);

  useEffect(() => {
    if (index >= xrays.length) setIndex(Math.max(0, xrays.length - 1));
  }, [xrays.length, index]);

  useEffect(() => {
    setAdjust(DEFAULT_ADJUST);
  }, [current?.id, planId]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const images = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!images.length) return;
    if (!await save()) return;
    setUploading(true);
    try {
      await patientsStore.addXrays(planId, images);
      setIndex(xrays.length);
    } catch {
      toast.error("Could not upload the X-ray. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const remove = () => {
    if (savingRef.current) return;
    const target = xrays[index];
    if (!target) return;
    void patientsStore.removeXray(planId, target.id);
  };

  const filterStyle = {
    filter: `brightness(${adjust.brightness}%) contrast(${adjust.contrast}%)`,
    transform: `scale(${adjust.zoom / 100})`,
    transformOrigin: "center center",
    transition: "transform 0.15s ease",
  } as React.CSSProperties;

  return (
    <>
      <div aria-busy={saving} className="rounded-2xl border border-border/60 bg-card p-4 shadow-[var(--shadow-soft)]">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary">X-ray</h3>
          <div className="flex items-center gap-2">
            <Button size="sm" disabled={!current || !dirty || saving || uploading} onClick={() => void save()}>
              <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save image"}
            </Button>
            <Button size="sm" variant="outline" disabled={uploading || saving} onClick={() => fileInput.current?.click()}>
              <UploadCloud className="h-4 w-4" /> {uploading ? "Uploading…" : "Upload"}
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" disabled={saving} aria-label="Close X-ray" onClick={() => void close()}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          {/* Image area */}
          <div
            className={cn(
              "relative flex aspect-[4/3] min-h-[260px] items-center justify-center overflow-hidden rounded-xl bg-[#0e1216] text-white/70",
              !current && "border-2 border-dashed border-border/60 bg-muted/40 text-muted-foreground",
            )}
            onDragOver={(e) => {
              e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              handleFiles(e.dataTransfer.files);
            }}
          >
            {current ? (
              <>
                <img
                  ref={inlineImage}
                  src={current.url}
                  alt={`X-ray ${index + 1}`}
                  className="max-h-full max-w-full select-none object-contain"
                  style={filterStyle}
                  draggable={false}
                />
                <button
                  type="button"
                  disabled={saving}
                  onClick={async () => { if (await save()) setFullscreen(true); }}
                  className="absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75"
                  title="Fullscreen"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="absolute left-14 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75"
                  title="Upload more"
                >
                  <UploadCloud className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={remove}
                  className="absolute left-[6.25rem] top-3 grid h-9 w-9 place-items-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-destructive"
                  title="Remove"
                >
                  <X className="h-4 w-4" />
                </button>

                {xrays.length > 1 && (
                  <>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void selectImage((index - 1 + xrays.length) % xrays.length)}
                      className="absolute bottom-3 left-1/2 -translate-x-[3.25rem] grid h-9 w-9 place-items-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-xs text-white backdrop-blur">
                      {index + 1} / {xrays.length}
                    </span>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void selectImage((index + 1) % xrays.length)}
                      className="absolute bottom-3 left-1/2 translate-x-[1.5rem] grid h-9 w-9 place-items-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="flex flex-col items-center gap-2 px-6 py-10 text-center"
              >
                <UploadCloud className="h-10 w-10 text-muted-foreground" />
                <span className="text-sm font-medium">Click or drop images here</span>
                <span className="text-xs text-muted-foreground">PNG, JPG, WEBP — multiple allowed</span>
              </button>
            )}
          </div>

          {/* Controls */}
          <div className="space-y-5">
            <AdjustSlider
              label="Zoom"
              value={adjust.zoom}
              min={50}
              max={300}
              disabled={!current || saving}
              onChange={(v) => setAdjust((a) => ({ ...a, zoom: v }))}
            />
            <AdjustSlider
              label="Brightness"
              value={adjust.brightness}
              min={20}
              max={200}
              disabled={!current || saving}
              onChange={(v) => setAdjust((a) => ({ ...a, brightness: v }))}
            />
            <AdjustSlider
              label="Contrast"
              value={adjust.contrast}
              min={20}
              max={200}
              disabled={!current || saving}
              onChange={(v) => setAdjust((a) => ({ ...a, contrast: v }))}
            />
            <Button
              variant="ghost"
              size="sm"
              disabled={!current || saving}
              onClick={() => setAdjust(DEFAULT_ADJUST)}
              className="w-full"
            >
              <RotateCcw className="h-4 w-4" /> Reset adjustments
            </Button>

            {xrays.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {xrays.map((xray, i) => (
                  <button
                    key={xray.id}
                    type="button"
                    disabled={saving}
                    onClick={() => void selectImage(i)}
                    className={cn(
                      "h-12 w-16 overflow-hidden rounded-md border-2 transition",
                      i === index ? "border-primary" : "border-border/60 opacity-70 hover:opacity-100",
                    )}
                  >
                    <img src={xray.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={fullscreen} onOpenChange={async (open) => { if (open || await save()) setFullscreen(open); }}>
        <DialogContent className="max-w-[96vw] border-0 bg-black p-0 sm:max-w-[96vw]">
          <DialogTitle className="sr-only">Edit X-ray</DialogTitle>
          <div className="relative flex h-[90vh] w-full items-center justify-center overflow-hidden bg-[#0e1216]">
            {current && (
              <img
                ref={fullscreenImage}
                src={current.url}
                alt={`X-ray ${index + 1}`}
                className="max-h-full max-w-full object-contain"
                style={filterStyle}
                draggable={false}
              />
            )}
            {xrays.length > 1 && (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void selectImage((index - 1 + xrays.length) % xrays.length)}
                  className="absolute left-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/25"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void selectImage((index + 1) % xrays.length)}
                  className="absolute right-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/25"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs text-white backdrop-blur">
                  {index + 1} / {xrays.length}
                </span>
              </>
            )}
            <div className="absolute right-4 top-12 flex flex-col gap-3 rounded-2xl bg-white/10 p-4 text-white backdrop-blur w-[240px]">
              <Button size="sm" disabled={!current || !dirty || saving} onClick={() => void save()}>
                <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save image"}
              </Button>
              <AdjustSlider
                label="Zoom"
                value={adjust.zoom}
                min={50}
                max={300}
                disabled={!current || saving}
                onChange={(v) => setAdjust((a) => ({ ...a, zoom: v }))}
                dark
              />
              <AdjustSlider
                label="Brightness"
                value={adjust.brightness}
                min={20}
                max={200}
                disabled={!current || saving}
                onChange={(v) => setAdjust((a) => ({ ...a, brightness: v }))}
                dark
              />
              <AdjustSlider
                label="Contrast"
                value={adjust.contrast}
                min={20}
                max={200}
                disabled={!current || saving}
                onChange={(v) => setAdjust((a) => ({ ...a, contrast: v }))}
                dark
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAdjust(DEFAULT_ADJUST)}
                disabled={saving}
                className="text-white hover:bg-white/15 hover:text-white"
              >
                <RotateCcw className="h-4 w-4" /> Reset
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AdjustSlider({
  label, value, min, max, onChange, disabled, dark,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  dark?: boolean;
}) {
  return (
    <div className={cn(disabled && "opacity-50")}>
      <div className={cn("mb-1.5 text-sm font-medium", dark ? "text-white" : "text-foreground")}>
        {label} ({value}%)
      </div>
      <Slider
        min={min}
        max={max}
        step={1}
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
        disabled={disabled}
      />
    </div>
  );
}
