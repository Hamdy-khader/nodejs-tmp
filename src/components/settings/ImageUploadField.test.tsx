import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { clinicApi } from "@/lib/admin/api";
import { resizeImage } from "@/lib/image-resize";
import { toast } from "sonner";
import { ImageUploadField } from "./ImageUploadField";

vi.mock("@/lib/admin/api", () => ({ clinicApi: { planSettings: { uploadImage: vi.fn() } } }));
vi.mock("@/lib/image-resize", () => ({ resizeImage: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const RESIZE = { maxSize: 1754, type: "image/jpeg" as const };
const picked = new File(["photo"], "cover.png", { type: "image/png" });
const resized = new File(["small"], "cover.jpg", { type: "image/jpeg" });

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resizeImage).mockResolvedValue(resized);
});

it("uploads the picked image after shrinking it and hands back its URL", async () => {
  vi.mocked(clinicApi.planSettings.uploadImage).mockResolvedValue({ url: "/storage/plan-settings/1/cover.jpg" });
  const onChange = vi.fn();
  render(<ImageUploadField label="Cover image" onChange={onChange} resize={RESIZE} />);
  await act(async () => {
    fireEvent.change(screen.getByLabelText("Upload cover image"), { target: { files: [picked] } });
  });
  expect(resizeImage).toHaveBeenCalledWith(picked, RESIZE);
  expect(clinicApi.planSettings.uploadImage).toHaveBeenCalledWith(resized);
  expect(onChange).toHaveBeenCalledWith("/storage/plan-settings/1/cover.jpg");
});

it("accepts a dropped image and ignores files that are not images", async () => {
  vi.mocked(clinicApi.planSettings.uploadImage).mockResolvedValue({ url: "/cover.jpg" });
  const onChange = vi.fn();
  render(<ImageUploadField label="Cover image" onChange={onChange} resize={RESIZE} />);
  const box = screen.getByText("Click or drop an image").closest("button")!.parentElement!;
  await act(async () => {
    fireEvent.drop(box, { dataTransfer: { files: [new File(["x"], "notes.pdf", { type: "application/pdf" })] } });
  });
  expect(toast.error).toHaveBeenCalledWith("Choose an image file (JPEG, PNG, WEBP or GIF).");
  expect(clinicApi.planSettings.uploadImage).not.toHaveBeenCalled();
  await act(async () => {
    fireEvent.drop(box, { dataTransfer: { files: [picked] } });
  });
  expect(onChange).toHaveBeenCalledWith("/cover.jpg");
});

it("shows the server message when the upload fails and keeps the current image", async () => {
  vi.mocked(clinicApi.planSettings.uploadImage).mockRejectedValue(new Error("The image must not exceed 10 MB."));
  const onChange = vi.fn();
  render(<ImageUploadField label="Cover image" value="/old.jpg" onChange={onChange} resize={RESIZE} />);
  await act(async () => {
    fireEvent.change(screen.getByLabelText("Upload cover image"), { target: { files: [picked] } });
  });
  expect(toast.error).toHaveBeenCalledWith("The image must not exceed 10 MB.");
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.getByAltText("Cover image")).toHaveAttribute("src", "/old.jpg");
});

it("removes the image", () => {
  const onChange = vi.fn();
  render(<ImageUploadField label="Header logo" value="/logo.png" onChange={onChange} resize={RESIZE} />);
  expect(screen.getByRole("button", { name: "Change image" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Remove" }));
  expect(onChange).toHaveBeenCalledWith(undefined);
});
