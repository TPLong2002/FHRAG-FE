"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { fetchDocumentGraph, fetchRelatedDocuments, fetchChunkGraph } from "@/lib/api";
import type { GraphData, RelatedDocument } from "@/types";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

interface GraphNode2D {
  id: string;
  label: string;
  type: "document" | "chunk";
  isExternal?: boolean;
  isSelected?: boolean;
  properties: Record<string, unknown>;
  x?: number;
  y?: number;
}

interface GraphLink2D {
  source: string;
  target: string;
  type: string;
  score?: number;
}

function toForceData(data: GraphData, selectedDoc?: string | null) {
  const nodes: GraphNode2D[] = data.nodes.map((n) => ({
    id: n.id,
    label: n.label,
    type: n.type,
    isExternal: n.properties.external as boolean,
    isSelected: n.id === selectedDoc,
    properties: n.properties,
  }));

  const links: GraphLink2D[] = data.edges.map((e) => ({
    source: e.source,
    target: e.target,
    type: e.type,
    score: e.properties.score as number | undefined,
  }));

  return { nodes, links };
}

const COLORS = {
  docNode: "#6366f1",
  docNodeSelected: "#f59e0b",
  chunkNode: "#22d3ee",
  chunkExternal: "#f97316",
  edgeRelated: "#6366f180",
  edgeNext: "#22d3ee60",
  edgeSimilar: "#f9731680",
  text: "#e2e8f0",
  textMuted: "#94a3b8",
};

export default function GraphPage() {
  const searchParams = useSearchParams();
  const docId = searchParams.get("doc");

  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [relatedDocs, setRelatedDocs] = useState<RelatedDocument[]>([]);
  const [chunkGraph, setChunkGraph] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "chunks">("overview");
  const [selectedDoc, setSelectedDoc] = useState<string | null>(docId);
  const [hoveredNode, setHoveredNode] = useState<GraphNode2D | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      setDimensions({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

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

  const overviewForceData = useMemo(
    () => (graphData ? toForceData(graphData, selectedDoc) : null),
    [graphData, selectedDoc],
  );

  const chunkForceData = useMemo(
    () => (chunkGraph ? toForceData(chunkGraph, selectedDoc) : null),
    [chunkGraph, selectedDoc],
  );

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
        <div className="flex gap-1 ml-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-3 py-1 rounded text-xs ${activeTab === "overview" ? "bg-primary text-primary-text" : "bg-surface text-muted"}`}
          >
            Documents
          </button>
          {selectedDoc && (
            <button
              onClick={() => setActiveTab("chunks")}
              className={`px-3 py-1 rounded text-xs ${activeTab === "chunks" ? "bg-primary text-primary-text" : "bg-surface text-muted"}`}
            >
              Chunks
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-muted text-sm">Loading graph...</div>
      ) : (
        <div className="flex-1 flex">
          {/* Graph canvas */}
          <div ref={containerRef} className="flex-1 relative bg-background">
            {activeTab === "overview" && overviewForceData && overviewForceData.nodes.length > 0 ? (
              <ForceGraph2D
                width={dimensions.width}
                height={dimensions.height}
                graphData={overviewForceData}
                nodeRelSize={8}
                nodeCanvasObject={(node: GraphNode2D, ctx: CanvasRenderingContext2D, globalScale: number) => {
                  const r = node.isSelected ? 12 : 8;
                  ctx.beginPath();
                  ctx.arc(node.x!, node.y!, r, 0, 2 * Math.PI);
                  ctx.fillStyle = node.isSelected ? COLORS.docNodeSelected : COLORS.docNode;
                  ctx.fill();
                  ctx.strokeStyle = "#fff";
                  ctx.lineWidth = 1.5;
                  ctx.stroke();

                  const fontSize = Math.max(10 / globalScale, 3);
                  ctx.font = `${fontSize}px Sans-Serif`;
                  ctx.textAlign = "center";
                  ctx.textBaseline = "top";
                  ctx.fillStyle = COLORS.text;
                  const label = node.label.length > 25 ? node.label.slice(0, 22) + "..." : node.label;
                  ctx.fillText(label, node.x!, node.y! + r + 3);
                }}
                linkColor={() => COLORS.edgeRelated}
                linkWidth={2}
                linkDirectionalArrowLength={6}
                linkDirectionalArrowRelPos={1}
                linkLabel={(link: GraphLink2D) =>
                  link.score != null ? `${link.type} (${link.score.toFixed(3)})` : link.type
                }
                onNodeClick={(node: GraphNode2D) => setSelectedDoc(node.id)}
                onNodeHover={(node: GraphNode2D | null) => setHoveredNode(node)}
                cooldownTicks={100}
                d3AlphaDecay={0.02}
                d3VelocityDecay={0.3}
              />
            ) : activeTab === "chunks" && chunkForceData && chunkForceData.nodes.length > 0 ? (
              <ForceGraph2D
                width={dimensions.width}
                height={dimensions.height}
                graphData={chunkForceData}
                nodeRelSize={6}
                nodeCanvasObject={(node: GraphNode2D, ctx: CanvasRenderingContext2D, globalScale: number) => {
                  const r = node.isExternal ? 5 : 6;
                  ctx.beginPath();
                  ctx.arc(node.x!, node.y!, r, 0, 2 * Math.PI);
                  ctx.fillStyle = node.isExternal ? COLORS.chunkExternal : COLORS.chunkNode;
                  ctx.fill();

                  const fontSize = Math.max(9 / globalScale, 2.5);
                  ctx.font = `${fontSize}px Sans-Serif`;
                  ctx.textAlign = "center";
                  ctx.textBaseline = "top";
                  ctx.fillStyle = COLORS.textMuted;
                  ctx.fillText(node.label, node.x!, node.y! + r + 2);
                }}
                linkColor={(link: GraphLink2D) =>
                  link.type === "NEXT_CHUNK" ? COLORS.edgeNext : COLORS.edgeSimilar
                }
                linkWidth={(link: GraphLink2D) => (link.type === "NEXT_CHUNK" ? 1.5 : 2)}
                linkDirectionalArrowLength={4}
                linkDirectionalArrowRelPos={1}
                linkLineDash={(link: GraphLink2D) =>
                  link.type === "SIMILAR_TO" ? [4, 2] : undefined
                }
                linkLabel={(link: GraphLink2D) =>
                  link.score != null ? `${link.type} (${link.score.toFixed(3)})` : link.type
                }
                cooldownTicks={100}
                d3AlphaDecay={0.02}
                d3VelocityDecay={0.3}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted text-sm h-full">
                {activeTab === "chunks" && !selectedDoc
                  ? "Select a document to view its chunk graph."
                  : "No graph data. Upload documents to see relationships."}
              </div>
            )}

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-surface/90 backdrop-blur border border-border rounded-lg p-3 text-xs space-y-1.5">
              {activeTab === "overview" ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ background: COLORS.docNode }} />
                    Document
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ background: COLORS.docNodeSelected }} />
                    Selected
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-0.5 inline-block" style={{ background: COLORS.edgeRelated }} />
                    RELATED_TO
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ background: COLORS.chunkNode }} />
                    Chunk
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ background: COLORS.chunkExternal }} />
                    External
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-0.5 inline-block" style={{ background: COLORS.edgeNext }} />
                    NEXT_CHUNK
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-0.5 inline-block border-t border-dashed" style={{ borderColor: COLORS.edgeSimilar }} />
                    SIMILAR_TO
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Side panel */}
          <div className="w-72 border-l border-border bg-surface overflow-y-auto p-4 space-y-4">
            {/* Hover info */}
            {hoveredNode && (
              <div className="p-3 bg-accent rounded-lg border border-border">
                <div className="text-sm font-medium mb-1">{hoveredNode.label}</div>
                {hoveredNode.type === "document" && (
                  <div className="text-xs text-muted space-y-0.5">
                    <div>Type: {hoveredNode.properties.fileType as string}</div>
                    <div>Chunks: {hoveredNode.properties.totalChunks as number}</div>
                  </div>
                )}
                {hoveredNode.type === "chunk" && hoveredNode.properties.textPreview && (
                  <div className="text-xs text-muted mt-1">{String(hoveredNode.properties.textPreview)}</div>
                )}
              </div>
            )}

            {/* Stats */}
            {activeTab === "overview" && graphData && (
              <div className="space-y-2">
                <h3 className="text-xs font-medium uppercase text-muted">Overview</h3>
                <div className="text-sm">
                  <span className="text-muted">Nodes:</span> {graphData.nodes.length}
                </div>
                <div className="text-sm">
                  <span className="text-muted">Edges:</span> {graphData.edges.length}
                </div>
              </div>
            )}

            {activeTab === "chunks" && chunkGraph && (
              <div className="space-y-2">
                <h3 className="text-xs font-medium uppercase text-muted">Chunk Graph</h3>
                <div className="text-sm">
                  <span className="text-muted">Chunks:</span>{" "}
                  {chunkGraph.nodes.filter((n) => !n.properties.external).length}
                </div>
                <div className="text-sm">
                  <span className="text-muted">External:</span>{" "}
                  {chunkGraph.nodes.filter((n) => n.properties.external).length}
                </div>
                <div className="text-sm">
                  <span className="text-muted">Sequential:</span>{" "}
                  {chunkGraph.edges.filter((e) => e.type === "NEXT_CHUNK").length}
                </div>
                <div className="text-sm">
                  <span className="text-muted">Similar:</span>{" "}
                  {chunkGraph.edges.filter((e) => e.type === "SIMILAR_TO").length}
                </div>
              </div>
            )}

            {/* Related documents table */}
            {relatedDocs.length > 0 && activeTab === "overview" && (
              <div className="space-y-2">
                <h3 className="text-xs font-medium uppercase text-muted">Related Documents</h3>
                {relatedDocs.map((doc) => (
                  <button
                    key={doc.documentId}
                    onClick={() => setSelectedDoc(doc.documentId)}
                    className="w-full text-left p-2 rounded-lg hover:bg-surface-hover transition-colors border border-border"
                  >
                    <div className="text-sm font-medium truncate">{doc.fileName}</div>
                    <div className="text-xs text-muted">
                      Score: {doc.score.toFixed(3)} | {doc.connectionCount} connections
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Document list */}
            {activeTab === "overview" && graphData && graphData.nodes.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-medium uppercase text-muted">Documents</h3>
                {graphData.nodes.map((node) => (
                  <button
                    key={node.id}
                    onClick={() => setSelectedDoc(node.id)}
                    className={`w-full text-left p-2 rounded-lg transition-colors border ${
                      node.id === selectedDoc
                        ? "border-amber-500 bg-amber-500/10"
                        : "border-border hover:bg-surface-hover"
                    }`}
                  >
                    <div className="text-sm font-medium truncate">{node.label}</div>
                    <div className="text-xs text-muted">
                      {node.properties.fileType as string} | {node.properties.totalChunks as number} chunks
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
