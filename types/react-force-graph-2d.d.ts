declare module "react-force-graph-2d" {
  import { Component } from "react";

  interface ForceGraphProps {
    width?: number;
    height?: number;
    graphData?: { nodes: any[]; links: any[] };
    nodeRelSize?: number;
    nodeCanvasObject?: (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => void;
    nodeCanvasObjectMode?: string | ((node: any) => string);
    linkColor?: string | ((link: any) => string);
    linkWidth?: number | ((link: any) => number);
    linkDirectionalArrowLength?: number | ((link: any) => number);
    linkDirectionalArrowRelPos?: number;
    linkLabel?: string | ((link: any) => string);
    linkLineDash?: number[] | ((link: any) => number[] | null | undefined);
    onNodeClick?: (node: any, event: MouseEvent) => void;
    onNodeHover?: (node: any | null, prevNode: any | null) => void;
    cooldownTicks?: number;
    d3AlphaDecay?: number;
    d3VelocityDecay?: number;
    [key: string]: any;
  }

  export default class ForceGraph2D extends Component<ForceGraphProps> {}
}
