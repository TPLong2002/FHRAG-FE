"use client";

import { useState, useRef } from "react";
import { uploadFiles } from "@/lib/api";

interface Props {
  embeddingProvider: string;
  embeddingModel: string;
  onUploadComplete: () => void;
}

const ACCEPTED = ".pdf,.docx,.doc,.csv,.txt";

export default function FileUpload({ embeddingProvider, embeddingModel, onUploadComplete }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
      setError("");
    }
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true);
    setError("");

    try {
      await uploadFiles(files, embeddingProvider, embeddingModel);
      setFiles([]);
      if (inputRef.current) inputRef.current.value = "";
      onUploadComplete();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border border-border rounded-xl p-4 bg-surface">
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          onChange={handleSelect}
          className="text-sm file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-primary file:text-primary-text file:text-sm file:cursor-pointer hover:file:bg-primary-hover"
        />
        <button
          onClick={handleUpload}
          disabled={!files.length || uploading}
          className="px-4 py-1.5 rounded-lg bg-primary text-primary-text text-sm hover:bg-primary-hover disabled:opacity-50 transition-colors"
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </div>

      {files.length > 0 && (
        <div className="mt-2 text-xs text-muted">
          {files.map((f) => f.name).join(", ")}
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  );
}
