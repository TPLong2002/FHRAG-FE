"use client";

import { useState, useEffect, useCallback } from "react";
import FileUpload from "@/components/documents/FileUpload";
import DocumentList from "@/components/documents/DocumentList";
import EmbeddingConfig from "@/components/documents/EmbeddingConfig";
import { fetchDocuments, fetchModels } from "@/lib/api";
import type { DocumentMeta, EmbeddingProvider, ModelsMap } from "@/types";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [embeddingProvider, setEmbeddingProvider] = useState<EmbeddingProvider>("openai");
  const [embeddingModel, setEmbeddingModel] = useState("text-embedding-3-large");
  const [embeddingModels, setEmbeddingModels] = useState<ModelsMap>({});

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDocuments();
      setDocuments(data.documents);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
    fetchModels("embedding")
      .then((data) => setEmbeddingModels(data.models))
      .catch(console.error);
  }, [loadDocuments]);

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-lg font-semibold">Documents</h2>
        <p className="text-sm text-muted mt-1">Upload and manage your knowledge base</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {/* Embedding config */}
        <EmbeddingConfig
          models={embeddingModels}
          provider={embeddingProvider}
          model={embeddingModel}
          onProviderChange={setEmbeddingProvider}
          onModelChange={setEmbeddingModel}
        />

        {/* Upload */}
        <FileUpload
          embeddingProvider={embeddingProvider}
          embeddingModel={embeddingModel}
          onUploadComplete={loadDocuments}
        />

        {/* Document list */}
        <DocumentList documents={documents} loading={loading} onDelete={loadDocuments} />
      </div>
    </div>
  );
}
