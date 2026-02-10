"use client";

import { deleteDocument } from "@/lib/api";
import type { DocumentMeta } from "@/types";

interface Props {
  documents: DocumentMeta[];
  loading: boolean;
  onDelete: () => void;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentList({ documents, loading, onDelete }: Props) {
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this document and all its chunks?")) return;
    try {
      await deleteDocument(id);
      onDelete();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  if (loading) {
    return <div className="text-sm text-muted py-8 text-center">Loading documents...</div>;
  }

  if (!documents.length) {
    return <div className="text-sm text-muted py-8 text-center">No documents uploaded yet</div>;
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface border-b border-border">
            <th className="text-left px-4 py-2.5 font-medium">File</th>
            <th className="text-left px-4 py-2.5 font-medium">Type</th>
            <th className="text-left px-4 py-2.5 font-medium">Size</th>
            <th className="text-left px-4 py-2.5 font-medium">Chunks</th>
            <th className="text-left px-4 py-2.5 font-medium">Embedding</th>
            <th className="text-left px-4 py-2.5 font-medium">Uploaded</th>
            <th className="px-4 py-2.5"></th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr key={doc.id} className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors">
              <td className="px-4 py-2.5 font-medium truncate max-w-[200px]">{doc.fileName}</td>
              <td className="px-4 py-2.5 text-muted uppercase">{doc.fileType}</td>
              <td className="px-4 py-2.5 text-muted">{formatSize(doc.fileSize)}</td>
              <td className="px-4 py-2.5 text-muted">{doc.totalChunks}</td>
              <td className="px-4 py-2.5 text-muted text-xs">{doc.embeddingModel}</td>
              <td className="px-4 py-2.5 text-muted text-xs">
                {new Date(doc.uploadedAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-2.5">
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="text-red-500 hover:text-red-600 text-xs"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
