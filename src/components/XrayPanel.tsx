import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Contrast,
  Loader2,
  Maximize2,
  Minimize2,
  RotateCcw,
  RotateCw,
  UploadCloud,
  X,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { patientsStore, type XrayImage } from "@/lib/patients-store";
import { cn } from "@/lib/utils";
import { clinicApi } from "@/lib/admin/api";
import {
  DEFAULT_XRAY_ADJUST as DEFAULT_ADJUST,
  renderXrayImage,
  xrayStyle,
  type ImageAdjust,
} from "@/lib/xray-image";
import { toast } from "sonner";

interface XrayPanelProps {
  ref?: Ref<XrayPanelHandle>;
  planId: string;
  xrays: XrayImage[];
}

export interface XrayPanelHandle {
  /** Bakes pending adjustments into the image; false when that failed. */
  save: () => Promise<boolean>;
}

/**
 * The X-ray viewer under the chart, laid out like the reference planner: the
 * image with its bar (fullscreen, upload, delete, previous/next) on the left,
 * zoom, brightness, contrast, invert, rotate and reset on the right. Changes
 * are written into the image when the user moves on (another image, closing,
 * another step, saving the plan), so reports and the PDF show them too.
 */
export function XrayPanel({ planId, xrays, ref }: XrayPanelProps) {
  const [index, setIndex] = useState(0);
  const [adjust, setAdjust] = useState<ImageAdjust>(DEFAULT_ADJUST);
  const [fullscreen, setFullscreen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const inlineImage = useRef<HTMLImageElement>(null);
  const fullscreenImage = useRef<HTMLImageElement>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [deleting, setDeleting] = useState(false);
  const deletingRef = useRef(false);
  const busy = saving || deleting || uploading;
  const current = xrays[index];
  const dirty = (Object.keys(DEFAULT_ADJUST) as (keyof ImageAdjust)[]).some(
    (key) => adjust[key] !== DEFAULT_ADJUST[key],
  );

  const save = async (): Promise<boolean> => {
    if (savingRef.current || deletingRef.current || uploading) return false;
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

  const remove = async () => {
    if (savingRef.current || deletingRef.current || uploading) return;
    const target = xrays[index];
    if (!target) return;
    deletingRef.current = true;
    setDeleting(true);
    try {
      await patientsStore.removeXray(planId, target.id);
      setAdjust(DEFAULT_ADJUST);
      setIndex(Math.max(0, Math.min(index, xrays.length - 2)));
      if (xrays.length === 1) setFullscreen(false);
      toast.success("X-ray deleted.");
    } catch {
      toast.error("Could not delete the X-ray. Please try again.");
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  };

  const viewer = (large: boolean) => (
    <Viewer
      large={large}
      xrays={xrays}
      index={index}
      adjust={adjust}
      busy={busy}
      status={saving ? "Saving…" : uploading ? "Uploading…" : deleting ? "Deleting…" : null}
      imageRef={large ? fullscreenImage : inlineImage}
      onMove={(offsetX, offsetY) => setAdjust((a) => ({ ...a, offsetX, offsetY }))}
      onUpload={() => fileInput.current?.click()}
      onDrop={(files) => void handleFiles(files)}
      onDelete={() => setConfirmDelete(true)}
      onSelect={(next) => void selectImage(next)}
      onFullscreen={async () => {
        if (await save()) setFullscreen(!large);
      }}
    />
  );
  const controls = (dark: boolean) => (
    <Controls dark={dark} adjust={adjust} disabled={!current || busy} onChange={setAdjust} />
  );

  return (
    <>
      <div
        aria-busy={busy}
        aria-label="X-ray"
        role="region"
        className="grid grid-cols-1 gap-4 rounded-md bg-card p-4 shadow-[var(--shadow-soft)] lg:grid-cols-[minmax(0,3fr)_minmax(220px,2fr)]"
      >
        {viewer(false)}
        {controls(false)}
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        aria-label="Upload OPG X-ray"
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <Dialog open={fullscreen} onOpenChange={async (open) => { if (open || await save()) setFullscreen(open); }}>
        <DialogContent className="max-w-[96vw] border-0 bg-[#0e1216] p-4 sm:max-w-[96vw]">
          <DialogTitle className="sr-only">X-ray</DialogTitle>
          <div className="grid h-[86vh] grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
            {viewer(true)}
            {controls(true)}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this X-ray?</AlertDialogTitle>
            <AlertDialogDescription>The image is removed from the plan. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDelete(false);
                void remove();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Viewer({
  large,
  xrays,
  index,
  adjust,
  busy,
  status,
  imageRef,
  onMove,
  onUpload,
  onDrop,
  onDelete,
  onSelect,
  onFullscreen,
}: {
  large: boolean;
  xrays: XrayImage[];
  index: number;
  adjust: ImageAdjust;
  busy: boolean;
  status: string | null;
  imageRef: Ref<HTMLImageElement>;
  onMove: (offsetX: number, offsetY: number) => void;
  onUpload: () => void;
  onDrop: (files: FileList) => void;
  onDelete: () => void;
  onSelect: (index: number) => void;
  onFullscreen: () => void;
}) {
  const current = xrays[index];
  const drag = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const barButton =
    "grid h-8 w-8 place-items-center rounded-full text-white transition hover:bg-white/15 disabled:opacity-40";

  return (
    <div
      className={cn(
        "relative min-w-0 overflow-hidden rounded-md",
        large ? "h-full" : "aspect-[2/1] min-h-[220px]",
        current ? "bg-[#0e1216]" : "bg-muted",
      )}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(e.dataTransfer.files);
      }}
    >
      {current ? (
        <>
          <div
            className={cn("flex h-full w-full items-center justify-center", !busy && "cursor-grab active:cursor-grabbing")}
            onPointerDown={(e) => {
              if (busy || e.button !== 0) return;
              e.currentTarget.setPointerCapture?.(e.pointerId);
              drag.current = { x: e.clientX, y: e.clientY, offsetX: adjust.offsetX, offsetY: adjust.offsetY };
            }}
            onPointerMove={(e) => {
              const start = drag.current;
              if (!start) return;
              onMove(start.offsetX + e.clientX - start.x, start.offsetY + e.clientY - start.y);
            }}
            onPointerUp={() => {
              drag.current = null;
            }}
            onPointerCancel={() => {
              drag.current = null;
            }}
          >
            <img
              ref={imageRef}
              src={current.url}
              alt={`X-ray ${index + 1}`}
              className="max-h-full max-w-full select-none object-contain"
              style={xrayStyle(adjust)}
              draggable={false}
            />
          </div>
          <div className="absolute inset-x-0 bottom-0 flex h-11 items-center bg-gradient-to-t from-black/70 to-transparent px-2">
            <div className="flex items-center gap-1">
              <button type="button" className={barButton} disabled={busy} onClick={onFullscreen} aria-label={large ? "Exit fullscreen" : "Fullscreen"} title={large ? "Exit fullscreen" : "Fullscreen"}>
                {large ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button type="button" className={barButton} disabled={busy} onClick={onUpload} aria-label="Upload X-ray" title="Upload X-ray">
                <UploadCloud className="h-4 w-4" />
              </button>
              <button type="button" className={barButton} disabled={busy} onClick={onDelete} aria-label="Delete X-ray" title="Delete X-ray">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1 text-xs text-white">
              <button type="button" className={barButton} disabled={busy || xrays.length < 2} onClick={() => onSelect((index - 1 + xrays.length) % xrays.length)} aria-label="Previous X-ray">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-10 text-center tabular-nums">
                {index + 1} / {xrays.length}
              </span>
              <button type="button" className={barButton} disabled={busy || xrays.length < 2} onClick={() => onSelect((index + 1) % xrays.length)} aria-label="Next X-ray">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            {status && (
              <span role="status" className="ml-auto flex items-center gap-1.5 pr-2 text-xs text-white">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> {status}
              </span>
            )}
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={onUpload}
          disabled={busy}
          className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground transition hover:text-foreground"
        >
          {busy ? <Loader2 className="h-9 w-9 animate-spin" /> : <UploadCloud className="h-10 w-10" />}
          <span className="text-sm">{status ?? "Upload OPG X-ray"}</span>
        </button>
      )}
    </div>
  );
}

function Controls({
  dark,
  adjust,
  disabled,
  onChange,
}: {
  dark: boolean;
  adjust: ImageAdjust;
  disabled: boolean;
  onChange: (update: (adjust: ImageAdjust) => ImageAdjust) => void;
}) {
  const toolButton = cn(
    "flex h-9 flex-1 items-center justify-center rounded-md border transition disabled:opacity-40",
    dark ? "border-white/20 text-white hover:bg-white/10" : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
  );
  return (
    <div className={cn("flex flex-col justify-center gap-5 rounded-md p-4", dark ? "bg-white/5" : "bg-muted/60")}>
      <AdjustSlider label="Zoom" value={adjust.zoom} min={50} max={300} dark={dark} disabled={disabled} onChange={(zoom) => onChange((a) => ({ ...a, zoom }))} />
      <AdjustSlider label="Brightness" value={adjust.brightness} min={20} max={200} dark={dark} disabled={disabled} onChange={(brightness) => onChange((a) => ({ ...a, brightness }))} />
      <AdjustSlider label="Contrast" value={adjust.contrast} min={20} max={200} dark={dark} disabled={disabled} onChange={(contrast) => onChange((a) => ({ ...a, contrast }))} />
      <div className="flex gap-2" role="group" aria-label="Image tools">
        <button
          type="button"
          className={cn(toolButton, adjust.invert && (dark ? "bg-white/15 text-white" : "bg-primary/10 text-primary"))}
          disabled={disabled}
          aria-pressed={adjust.invert}
          aria-label="Invert colors"
          title="Invert colors"
          onClick={() => onChange((a) => ({ ...a, invert: !a.invert }))}
        >
          <Contrast className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={toolButton}
          disabled={disabled}
          aria-label="Rotate 90°"
          title="Rotate 90°"
          onClick={() => onChange((a) => ({ ...a, rotation: (a.rotation + 90) % 360 }))}
        >
          <RotateCw className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={toolButton}
          disabled={disabled}
          aria-label="Reset"
          title="Reset"
          onClick={() => onChange(() => DEFAULT_ADJUST)}
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </div>
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
      <div className={cn("mb-1.5 text-sm", dark ? "text-white" : "text-foreground")}>
        {label} ({value}%)
      </div>
      <Slider
        min={min}
        max={max}
        step={1}
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
        disabled={disabled}
        aria-label={label}
      />
    </div>
  );
}
