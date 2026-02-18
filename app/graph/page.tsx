"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { fetchDocumentGraph, fetchRelatedDocuments, fetchChunkGraph } from "@/lib/api";
import type { GraphData, GraphNode, GraphEdge, RelatedDocument } from "@/types";

export default function GraphPage() {
  const searchParams = useSearchParams();
  const docId = searchParams.get("doc");

  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [relatedDocs, setRelatedDocs] = useState<RelatedDocument[]>([]);
  const [chunkGraph, setChunkGraph] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "chunks">("overview");
  const [selectedDoc, setSelectedDoc] = useState<string | null>(docId);

  const loadGraph = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDocumentGraph(selectedDoc || undefined);
      setGraphData(data);

      if (selectedDoc) {
        const { related } = await fetchRelatedDocuments(selectedDoc);
        setRelatedDocs(related);
      } else {
        setRelatedDocs([]);
      }
    } catch (err) {
      console.error("Failed to load graph:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedDoc]);

  const loadChunkGraph = useCallback(async () => {
    if (!selectedDoc) return;
    setLoading(true);
    try {
      const data = await fetchChunkGraph(selectedDoc);
      setChunkGraph(data);
    } catch (err) {
      console.error("Failed to load chunk graph:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedDoc]);

  useEffect(() => {
    if (activeTab === "overview") loadGraph();
    else if (activeTab === "chunks" && selectedDoc) loadChunkGraph();
  }, [activeTab, loadGraph, loadChunkGraph, selectedDoc]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border px-6 py-3 flex items-center gap-4">
        <h2 className="text-lg font-semibold">Document Graph</h2>
        {selectedDoc && (
          <button
            onClick={() => { setSelectedDoc(null); setActiveTab("overview"); }}
            className="text-xs text-primary-text hover:text-primary-hover"
          >
            View All
          </button>
        )}
        {selectedDoc && (
          <div className="flex gap-1 ml-auto">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-3 py-1 rounded text-xs ${activeTab === "overview" ? "bg-primary text-primary-text" : "bg-surface text-muted"}`}
            >
              Relationships
            </button>
            <button
              onClick={() => setActiveTab("chunks")}
              className={`px-3 py-1 rounded text-xs ${activeTab === "chunks" ? "bg-primary text-primary-text" : "bg-surface text-muted"}`}
            >
              Chunks
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-muted text-sm">Loading graph...</div>
      ) : activeTab === "overview" ? (
        <OverviewView
          graphData={graphData}
          relatedDocs={relatedDocs}
          selectedDoc={selectedDoc}
          onSelectDoc={setSelectedDoc}
        />
      ) : (
        <ChunkView chunkGraph={chunkGraph} />
      )}
    </div>
  );
}

function OverviewView({
  graphData,
  relatedDocs,
  selectedDoc,
  onSelectDoc,
}: {
  graphData: GraphData | null;
  relatedDocs: RelatedDocument[];
  selectedDoc: string | null;
  onSelectDoc: (id: string) => void;
}) {
  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted text-sm">
        No documents in graph yet. Upload documents to see relationships.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      {/* Document Nodes */}
      <div>
        <h3 className="text-sm font-medium mb-3">
          {selectedDoc ? "Selected Document & Related" : "All Documents"}
          <span className="text-muted ml-2">({graphData.nodes.length})</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {graphData.nodes.map((node) => (
            <button
              key={node.id}
              onClick={() => onSelectDoc(node.id)}
              className={`text-left p-4 rounded-xl border transition-colors ${
                node.id === selectedDoc
                  ? "border-primary bg-accent"
                  : "border-border bg-surface hover:bg-surface-hover"
              }`}
            >
              <div className="font-medium text-sm truncate">{node.label}</div>
              <div className="text-xs text-muted mt-1">
                {node.properties.fileType as string} &middot; {node.properties.totalChunks as number} chunks
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Edges */}
      {graphData.edges.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3">
            Relationships
            <span className="text-muted ml-2">({graphData.edges.length})</span>
          </h3>
          <div className="space-y-2">
            {graphData.edges.map((edge, i) => {
              const sourceNode = graphData.nodes.find((n) => n.id === edge.source);
              const targetNode = graphData.nodes.find((n) => n.id === edge.target);
              return (
                <div key={i} className="flex items-center gap-3 p-3 bg-surface rounded-lg border border-border text-sm">
                  <span className="font-medium truncate max-w-[200px]">{sourceNode?.label}</span>
                  <span className="text-primary-text bg-accent px-2 py-0.5 rounded text-xs shrink-0">
                    {edge.type}
                  </span>
                  <span className="font-medium truncate max-w-[200px]">{targetNode?.label}</span>
                  {edge.properties.score != null && (
                    <span className="text-xs text-muted ml-auto">
                      score: {(edge.properties.score as number).toFixed(3)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Related Documents Detail */}
      {relatedDocs.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3">Related Documents</h3>
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface border-b border-border">
                  <th className="text-left px-4 py-2.5 font-medium">File</th>
                  <th className="text-left px-4 py-2.5 font-medium">Score</th>
                  <th className="text-left px-4 py-2.5 font-medium">Connections</th>
                </tr>
              </thead>
              <tbody>
                {relatedDocs.map((doc) => (
                  <tr
                    key={doc.documentId}
                    onClick={() => onSelectDoc(doc.documentId)}
                    className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-2.5 font-medium">{doc.fileName}</td>
                    <td className="px-4 py-2.5 text-muted">{doc.score.toFixed(3)}</td>
                    <td className="px-4 py-2.5 text-muted">{doc.connectionCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ChunkView({ chunkGraph }: { chunkGraph: GraphData | null }) {
  if (!chunkGraph || chunkGraph.nodes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted text-sm">
        No chunk graph data available.
      </div>
    );
  }

  const internalChunks = chunkGraph.nodes.filter((n) => !(n.properties.external as boolean));
  const externalChunks = chunkGraph.nodes.filter((n) => n.properties.external as boolean);
  const nextEdges = chunkGraph.edges.filter((e) => e.type === "NEXT_CHUNK");
  const simEdges = chunkGraph.edges.filter((e) => e.type === "SIMILAR_TO");

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      {/* Chunk sequence */}
      <div>
        <h3 className="text-sm font-medium mb-3">
          Chunks <span className="text-muted">({internalChunks.length})</span>
          {nextEdges.length > 0 && (
            <span className="text-muted ml-2">| {nextEdges.length} sequential links</span>
          )}
        </h3>
        <div className="flex flex-wrap gap-2">
          {internalChunks.map((chunk) => (
            <div
              key={chunk.id}
              className="p-3 bg-surface border border-border rounded-lg w-48"
              title={chunk.properties.textPreview as string}
            >
              <div className="text-xs font-medium">{chunk.label}</div>
              <div className="text-xs text-muted mt-1 line-clamp-3">
                {chunk.properties.textPreview as string}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cross-doc similar */}
      {simEdges.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3">
            Cross-Document Similarities <span className="text-muted">({simEdges.length})</span>
          </h3>
          <div className="space-y-2">
            {simEdges.map((edge, i) => {
              const from = chunkGraph.nodes.find((n) => n.id === edge.source);
              const to = chunkGraph.nodes.find((n) => n.id === edge.target);
              return (
                <div key={i} className="flex items-center gap-3 p-3 bg-surface rounded-lg border border-border text-sm">
                  <span className="font-medium text-xs">{from?.label}</span>
                  <span className="text-primary-text bg-accent px-2 py-0.5 rounded text-xs">SIMILAR_TO</span>
                  <span className="font-medium text-xs truncate">{to?.label}</span>
                  {edge.properties.score != null && (
                    <span className="text-xs text-muted ml-auto">
                      {(edge.properties.score as number).toFixed(3)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* External chunks */}
      {externalChunks.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3">
            Linked External Chunks <span className="text-muted">({externalChunks.length})</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {externalChunks.map((chunk) => (
              <div key={chunk.id} className="p-3 bg-accent border border-primary rounded-lg w-48">
                <div className="text-xs font-medium">{chunk.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
