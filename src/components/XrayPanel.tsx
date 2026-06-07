import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft, ChevronRight, Maximize2, UploadCloud, X, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { patientsStore, type XrayImage } from "@/lib/patients-store";
import { cn } from "@/lib/utils";

interface XrayPanelProps {
  planId: string;
  xrays: XrayImage[];
  onClose: () => void;
}

interface ImageAdjust {
  zoom: number;
  brightness: number;
  contrast: number;
}

const DEFAULT_ADJUST: ImageAdjust = { zoom: 100, brightness: 100, contrast: 100 };

export function XrayPanel({ planId, xrays, onClose }: XrayPanelProps) {
  const [index, setIndex] = useState(0);
  const [adjust, setAdjust] = useState<ImageAdjust>(DEFAULT_ADJUST);
  const [fullscreen, setFullscreen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (index >= xrays.length) setIndex(Math.max(0, xrays.length - 1));
  }, [xrays.length, index]);

  useEffect(() => {
    setAdjust(DEFAULT_ADJUST);
  }, [index]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const images = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!images.length) return;
    setUploading(true);
    try {
      await patientsStore.addXrays(planId, images);
      setIndex(xrays.length);
    } finally {
      setUploading(false);
    }
  };

  const remove = () => {
    const target = xrays[index];
    if (!target) return;
    void patientsStore.removeXray(planId, target.id);
  };

  const current = xrays[index];
  const filterStyle = {
    filter: `brightness(${adjust.brightness}%) contrast(${adjust.contrast}%)`,
    transform: `scale(${adjust.zoom / 100})`,
    transformOrigin: "center center",
    transition: "transform 0.15s ease",
  } as React.CSSProperties;

  return (
    <>
      <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-[var(--shadow-soft)]">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary">X-ray</h3>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={uploading} onClick={() => fileInput.current?.click()}>
              <UploadCloud className="h-4 w-4" /> {uploading ? "Uploading…" : "Upload"}
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onClose}>
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
              "relative flex aspect-[4/3] min-h-[260px] items-center justify-center overflow-hidden rounded-xl bg-[oklch(0.18_0.01_240)] text-white/70",
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
                  src={current.url}
                  alt={`X-ray ${index + 1}`}
                  className="max-h-full max-w-full select-none object-contain"
                  style={filterStyle}
                  draggable={false}
                />
                <button
                  type="button"
                  onClick={() => setFullscreen(true)}
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
                      onClick={() => setIndex((i) => (i - 1 + xrays.length) % xrays.length)}
                      className="absolute bottom-3 left-1/2 -translate-x-[3.25rem] grid h-9 w-9 place-items-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-xs text-white backdrop-blur">
                      {index + 1} / {xrays.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIndex((i) => (i + 1) % xrays.length)}
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
              disabled={!current}
              onChange={(v) => setAdjust((a) => ({ ...a, zoom: v }))}
            />
            <AdjustSlider
              label="Brightness"
              value={adjust.brightness}
              min={20}
              max={200}
              disabled={!current}
              onChange={(v) => setAdjust((a) => ({ ...a, brightness: v }))}
            />
            <AdjustSlider
              label="Contrast"
              value={adjust.contrast}
              min={20}
              max={200}
              disabled={!current}
              onChange={(v) => setAdjust((a) => ({ ...a, contrast: v }))}
            />
            <Button
              variant="ghost"
              size="sm"
              disabled={!current}
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
                    onClick={() => setIndex(i)}
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

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-w-[96vw] border-0 bg-black p-0 sm:max-w-[96vw]">
          <div className="relative flex h-[90vh] w-full items-center justify-center overflow-hidden">
            {current && (
              <img
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
                  onClick={() => setIndex((i) => (i - 1 + xrays.length) % xrays.length)}
                  className="absolute left-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/25"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIndex((i) => (i + 1) % xrays.length)}
                  className="absolute right-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/25"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs text-white backdrop-blur">
                  {index + 1} / {xrays.length}
                </span>
              </>
            )}
            <div className="absolute right-4 top-4 flex flex-col gap-3 rounded-2xl bg-white/10 p-4 text-white backdrop-blur w-[240px]">
              <AdjustSlider
                label="Zoom"
                value={adjust.zoom}
                min={50}
                max={300}
                disabled={!current}
                onChange={(v) => setAdjust((a) => ({ ...a, zoom: v }))}
                dark
              />
              <AdjustSlider
                label="Brightness"
                value={adjust.brightness}
                min={20}
                max={200}
                disabled={!current}
                onChange={(v) => setAdjust((a) => ({ ...a, brightness: v }))}
                dark
              />
              <AdjustSlider
                label="Contrast"
                value={adjust.contrast}
                min={20}
                max={200}
                disabled={!current}
                onChange={(v) => setAdjust((a) => ({ ...a, contrast: v }))}
                dark
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAdjust(DEFAULT_ADJUST)}
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
