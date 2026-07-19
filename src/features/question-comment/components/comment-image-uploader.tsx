"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { getCommentImageUploadSignatureAction } from "../actions";

const MAX_IMAGES = 4;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

async function uploadToCloudinary(file: File): Promise<string> {
  const { signature, timestamp, apiKey, cloudName, folder } =
    await getCommentImageUploadSignatureAction();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  formData.append("folder", folder);

  // Uploads straight to Cloudinary from the browser — never through our server.
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Upload gambar gagal.");
  }

  const data: { secure_url: string } = await response.json();
  return data.secure_url;
}

export function CommentImageUploader({
  value,
  onChange,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);

    const remainingSlots = MAX_IMAGES - value.length;
    if (remainingSlots <= 0) {
      setError(`Maksimal ${MAX_IMAGES} gambar.`);
      return;
    }

    const selected = Array.from(files).slice(0, remainingSlots);
    setIsUploading(true);

    for (const file of selected) {
      if (!file.type.startsWith("image/")) {
        setError("File harus berupa gambar.");
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError("Ukuran gambar maksimal 5MB.");
        continue;
      }

      try {
        const url = await uploadToCloudinary(file);
        onChange([...value, url]);
      } catch {
        setError("Upload gambar gagal, coba lagi.");
      }
    }

    setIsUploading(false);
  }

  function removeImage(url: string) {
    onChange(value.filter((existing) => existing !== url));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {value.map((url) => (
          <div key={url} className="group relative size-16 overflow-hidden rounded-md border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="size-full object-cover" />
            <button
              type="button"
              onClick={() => removeImage(url)}
              className="absolute top-0.5 right-0.5 rounded-full bg-background/80 p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="Hapus gambar"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}
        {value.length < MAX_IMAGES && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="flex size-16 items-center justify-center rounded-md border border-dashed text-muted-foreground hover:bg-muted disabled:opacity-50"
            aria-label="Tambah gambar"
          >
            {isUploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ImagePlus className="size-4" />
            )}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          void handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}
