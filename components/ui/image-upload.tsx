"use client";

import * as React from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { uploadCoffeeImageAction } from "@/actions/images";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

type UploadState =
  | { status: "idle"; message?: string }
  | { status: "uploading"; progress: number }
  | { status: "uploaded"; path: string; url: string }
  | { status: "error"; message: string };

type ImageUploadProps = {
  name?: string;
  label?: string;
  description?: string;
  onUploaded?: (path: string) => void;
};

function validateFile(file: File) {
  if (!file.type.startsWith("image/")) {
    return "الملف يجب أن يكون صورة.";
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return "حجم الصورة يجب ألا يتجاوز 5 ميجابايت.";
  }

  return null;
}

export function ImageUpload({
  name = "imagePath",
  label = "صورة المحصول",
  description = "اسحب الصورة هنا أو اخترها من جهازك. الحد الأقصى 5 ميجابايت.",
  onUploaded,
}: ImageUploadProps) {
  const inputId = React.useId();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [state, setState] = React.useState<UploadState>({ status: "idle" });

  React.useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  React.useEffect(() => {
    if (state.status !== "uploading") return;

    const interval = window.setInterval(() => {
      setState((current) => {
        if (current.status !== "uploading") return current;
        return {
          status: "uploading",
          progress: Math.min(current.progress + 12, 88),
        };
      });
    }, 250);

    return () => window.clearInterval(interval);
  }, [state.status]);

  function setPreview(file: File) {
    setPreviewUrl((currentPreview) => {
      if (currentPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(currentPreview);
      }
      return URL.createObjectURL(file);
    });
  }

  async function uploadFile(file: File) {
    const validationError = validateFile(file);
    if (validationError) {
      setState({ status: "error", message: validationError });
      return;
    }

    setPreview(file);
    setState({ status: "uploading", progress: 8 });

    const formData = new FormData();
    formData.set("file", file);

    const result = await uploadCoffeeImageAction(formData);

    if ("error" in result) {
      setState({ status: "error", message: result.error });
      return;
    }

    setPreviewUrl(result.url);
    setState({ status: "uploaded", path: result.path, url: result.url });
    onUploaded?.(result.path);
  }

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    void uploadFile(file);
  }

  function resetUpload() {
    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setState({ status: "idle" });
    onUploaded?.("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  const isUploading = state.status === "uploading";
  const uploadedPath = state.status === "uploaded" ? state.path : "";
  const errorMessage = state.status === "error" ? state.message : null;

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor={inputId} className="block text-sm font-bold text-stone-950">
          {label}
        </label>
        <p className="mt-1 text-sm leading-6 text-stone-500">{description}</p>
      </div>

      <input type="hidden" name={name} value={uploadedPath} />
      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => handleFiles(event.target.files)}
        disabled={isUploading}
      />

      <div
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
        className={cn(
          "relative overflow-hidden rounded-lg border border-dashed bg-white p-4 transition",
          isDragging ? "border-amber-700 bg-amber-50" : "border-stone-300 hover:border-amber-700",
        )}
      >
        {previewUrl ? (
          <div className="space-y-4">
            <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-stone-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="معاينة الصورة" className="h-full w-full object-cover" />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm">
                {state.status === "uploaded" ? (
                  <>
                    <p className="font-bold text-emerald-700">تم رفع الصورة بنجاح.</p>
                    <p className="mt-1 break-all text-xs text-stone-500" dir="ltr">
                      {state.path}
                    </p>
                  </>
                ) : (
                  <p className="font-semibold text-stone-600">الصورة جاهزة للرفع.</p>
                )}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={resetUpload} disabled={isUploading}>
                <X className="h-4 w-4" />
                إزالة
              </Button>
            </div>
          </div>
        ) : (
          <label
            htmlFor={inputId}
            className="flex cursor-pointer flex-col items-center justify-center gap-3 px-4 py-12 text-center"
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-amber-100 text-amber-800">
              <ImagePlus className="h-6 w-6" />
            </span>
            <span className="text-sm font-bold text-stone-900">اسحب الصورة هنا أو اضغط للاختيار</span>
            <span className="text-xs text-stone-500">PNG أو JPG أو WEBP أو أي صيغة صورة مدعومة</span>
          </label>
        )}

        {isUploading ? (
          <div className="mt-4 space-y-2" role="status" aria-label="جاري رفع الصورة">
            <div className="flex items-center gap-2 text-sm font-bold text-amber-800">
              <Loader2 className="h-4 w-4 animate-spin" />
              جاري رفع الصورة...
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-stone-100">
              <div className="h-full rounded-full bg-amber-700 transition-all" style={{ width: `${state.progress}%` }} />
            </div>
          </div>
        ) : null}
      </div>

      {errorMessage ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
