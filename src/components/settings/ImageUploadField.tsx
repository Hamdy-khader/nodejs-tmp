import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { clinicApi } from "@/lib/admin/api";
import { resizeImage, type ResizeOptions } from "@/lib/image-resize";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value?: string;
  onChange: (url: string | undefined) => void;
  resize: ResizeOptions;
  /** Shown in the empty box, e.g. what is used when nothing is uploaded. */
  hint?: string;
  previewClassName?: string;
}

/**
 * Picks or drops an image, shrinks it for the PDF, uploads it and hands back
 * its URL. Used for the covers and the header logo of the plan settings.
 */
export function ImageUploadField({ label, value, onChange, resize, hint, previewClassName }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const upload = async (files: FileList | null) => {
    const file = Array.from(files ?? []).find((candidate) => candidate.type.startsWith("image/"));
    if (!file) {
      if (files?.length) toast.error("Choose an image file (JPEG, PNG, WEBP or GIF).");
      return;
    }
    setUploading(true);
    try {
      const { url } = await clinicApi.planSettings.uploadImage(await resizeImage(file, resize));
      onChange(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload the image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-muted/40",
          dragging && "border-primary bg-primary/5",
          previewClassName ?? "h-40",
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void upload(event.dataTransfer.files);
        }}
      >
        {value ? (
          <img src={value} alt={label} className="max-h-full max-w-full object-contain" />
        ) : (
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={uploading}
            className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-muted-foreground transition hover:text-foreground"
          >
            <ImagePlus className="h-7 w-7" />
            <span className="text-sm">Click or drop an image</span>
            {hint && <span className="text-[11px]">{hint}</span>}
          </button>
        )}
        {uploading && (
          <div role="status" className="absolute inset-0 grid place-items-center bg-background/70 text-sm">
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
            </span>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" className="gap-1.5" disabled={uploading} onClick={() => input.current?.click()}>
          <UploadCloud className="h-4 w-4" /> {value ? "Change image" : "Upload image"}
        </Button>
        {value && (
          <Button type="button" size="sm" variant="ghost" className="gap-1.5 text-muted-foreground" disabled={uploading} onClick={() => onChange(undefined)}>
            <Trash2 className="h-4 w-4" /> Remove
          </Button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        aria-label={`Upload ${label.toLowerCase()}`}
        onChange={(event) => {
          void upload(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}
