import React, { useState, useEffect, useMemo } from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Node,
  Edge,
  Handle,
  Position
} from "reactflow";
import "reactflow/dist/style.css";
import {
  Search,
  GitFork,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  HelpCircle,
  Network,
  X,
  Play,
  ArrowRight
} from "lucide-react";

// Register custom node type with clean styled handles for horizontal left-to-right flow
const CustomArchNode = ({ data, selected }: any) => {
  return (
    <div className={`p-4 rounded-xl border text-center transition-all flex flex-col items-center gap-2 min-w-[160px] font-sans ${
      selected
        ? "bg-indigo-650 text-white border-indigo-800 ring-4 ring-indigo-100 dark:ring-indigo-900/50 scale-105 z-20 shadow-md"
        : data.isTraceTarget
          ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700/50 text-emerald-950 dark:text-emerald-100 ring-4 ring-emerald-100 dark:ring-emerald-900/50 scale-102 border-2 z-10"
          : data.isTraceSource
            ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/50 text-amber-955 dark:text-amber-100 ring-4 ring-amber-100 dark:ring-amber-900/50 scale-102 border-2 z-10"
            : data.isDimmed
              ? "opacity-35 bg-slate-50 dark:bg-[#1A120C] border-slate-200 dark:border-[#3D2E24] text-slate-400 dark:text-slate-500"
              : data.isMatch
                ? "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-400 dark:border-indigo-600/50 text-indigo-950 dark:text-indigo-100 scale-105 border-2 animate-pulse"
                : "bg-white dark:bg-[#1C1410] border-slate-200 dark:border-[#3D2E24] text-slate-800 dark:text-[#ECE4DE] hover:border-slate-350 dark:hover:border-[#4D3D33] hover:shadow-2xs"
    }`}>
      {/* Handles with standardized sizing and styled colors */}
      <Handle type="target" position={Position.Left} className="w-2.5 h-2.5 !bg-slate-300 hover:!bg-indigo-500 border border-white dark:border-[#1A120C]" />
      <Handle type="source" position={Position.Right} className="w-2.5 h-2.5 !bg-slate-300 hover:!bg-indigo-500 border border-white dark:border-[#1A120C]" />
      
      <div className="flex items-center gap-1.5">
        <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded uppercase leading-none ${
          selected ? "bg-indigo-800 text-white" : "bg-slate-100 dark:bg-[#251A13] text-slate-500 dark:text-slate-400"
        }`}>
          {data.type}
        </span>
        {data.isMatch && (
          <span className="text-[8px] font-bold bg-indigo-600 dark:bg-indigo-500 text-white px-1.5 py-0.2 rounded-full font-mono">
            MATCH
          </span>
        )}
      </div>

      <span className="text-xs font-bold tracking-tight leading-tight block whitespace-pre-line">
        {data.label}
      </span>

      {/* Tracing Sub-tags */}
      {data.isTraceTarget && (
        <span className="text-[8px] font-mono font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100/50 dark:bg-emerald-900/30 px-1.5 py-0.2 rounded border border-emerald-150 dark:border-emerald-800/50 uppercase block">
          Downstream Impact
        </span>
      )}
      {data.isTraceSource && (
        <span className="text-[8px] font-mono font-black text-amber-800 dark:text-amber-300 bg-amber-100/50 dark:bg-amber-900/30 px-1.5 py-0.2 rounded border border-amber-150 dark:border-amber-800/50 uppercase block">
          Upstream Dependency
        </span>
      )}
    </div>
  );
};

const nodeTypes = {
  customNode: CustomArchNode,
};

interface ArchitectureGraphProps {
  architecture: {
    nodes: any[];
    edges: any[];
  };
  activeNodeId: string | null;
  setActiveNodeId: (id: string | null) => void;
}

export default function ArchitectureGraph({
  architecture,
  activeNodeId,
  setActiveNodeId
}: ArchitectureGraphProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isTracing, setIsTracing] = useState(true); // Toggle to turn trace automatic updates on/off

  const nodesList = architecture?.nodes || [];
  const edgesList = architecture?.edges || [];

  // 1. Trace Helper: BFS downstream dependents
  const downstreamNodeIds = useMemo(() => {
    if (!activeNodeId) return new Set<string>();
    const visited = new Set<string>();
    const queue = [activeNodeId];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      edgesList.forEach(edge => {
        const fromVal = edge.from || edge.source;
        const toVal = edge.to || edge.target;
        if (fromVal === curr && !visited.has(toVal)) {
          visited.add(toVal);
          queue.push(toVal);
        }
      });
    }
    return visited;
  }, [activeNodeId, edgesList]);

  // 2. Trace Helper: BFS upstream dependencies
  const upstreamNodeIds = useMemo(() => {
    if (!activeNodeId) return new Set<string>();
    const visited = new Set<string>();
    const queue = [activeNodeId];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      edgesList.forEach(edge => {
        const fromVal = edge.from || edge.source;
        const toVal = edge.to || edge.target;
        if (toVal === curr && !visited.has(fromVal)) {
          visited.add(fromVal);
          queue.push(fromVal);
        }
      });
    }
    return visited;
  }, [activeNodeId, edgesList]);

  // 3. Search Helper: Identify searching match sets
  const searchQueryMatches = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>();
    const q = searchQuery.toLowerCase();
    const matches = new Set<string>();
    nodesList.forEach(node => {
      if (
        node.label.toLowerCase().includes(q) ||
        node.type.toLowerCase().includes(q)
      ) {
        matches.add(node.id);
      }
    });
    return matches;
  }, [searchQuery, nodesList]);

  // Map state to React Flow Node objects
  const initialNodes = useMemo(() => {
    return nodesList.map((node) => {
      const isSelected = activeNodeId === node.id;
      const isMatch = searchQueryMatches.has(node.id);
      
      const hasTrace = activeNodeId !== null && isTracing;
      const isTraceTarget = hasTrace && downstreamNodeIds.has(node.id);
      const isTraceSource = hasTrace && upstreamNodeIds.has(node.id);
      const isDimmed = hasTrace && !isSelected && !isTraceTarget && !isTraceSource;

      return {
        id: node.id,
        type: "customNode",
        position: { x: node.x, y: node.y },
        selected: isSelected,
        data: {
          label: node.label.replace("\\n", "\n"),
          type: node.type,
          isMatch,
          isDimmed,
          isTraceTarget,
          isTraceSource
        }
      };
    });
  }, [nodesList, activeNodeId, searchQueryMatches, downstreamNodeIds, upstreamNodeIds, isTracing]);

  // Map state to React Flow Edge objects
  const initialEdges = useMemo(() => {
    return edgesList.map((edge, idx) => {
      const fromVal = edge.from || edge.source;
      const toVal = edge.to || edge.target;

      const isSourceSelected = activeNodeId === fromVal;
      const isTargetSelected = activeNodeId === toVal;
      
      // Determine if this specific edge belongs to the matched tracer path
      const hasTrace = activeNodeId !== null && isTracing;
      
      // Is an active trace connection?
      const isDownstreamEdge = hasTrace && fromVal === activeNodeId && downstreamNodeIds.has(toVal);
      const isUpstreamEdge = hasTrace && toVal === activeNodeId && upstreamNodeIds.has(fromVal);
      const isIntermediateTraceEdge = hasTrace && 
        (downstreamNodeIds.has(fromVal) && downstreamNodeIds.has(toVal)) ||
        (upstreamNodeIds.has(fromVal) && upstreamNodeIds.has(toVal));

      const isActiveTrace = isSourceSelected || isTargetSelected || isDownstreamEdge || isUpstreamEdge || isIntermediateTraceEdge;
      const isDimmed = hasTrace && !isActiveTrace;

      return {
        id: `edge-${idx}`,
        source: fromVal,
        target: toVal,
        animated: isActiveTrace,
        label: edge.label,
        type: "smoothstep",
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isActiveTrace ? "#4f46e5" : isDimmed ? "#e2e8f0" : "#94a3b8",
          width: 20,
          height: 20
        },
        style: {
          stroke: isActiveTrace ? "#4f46e5" : isDimmed ? "#f1f5f9" : "#cbd5e1",
          strokeWidth: isActiveTrace ? 2.5 : 1.5,
          opacity: isDimmed ? 0.3 : 1
        },
        labelStyle: {
          fill: isActiveTrace ? "#4f46e5" : isDimmed ? "#cbd5e1" : "#64748b",
          fontWeight: isActiveTrace ? "bold" : "normal",
          fontSize: "9px"
        }
      };
    });
  }, [edgesList, activeNodeId, downstreamNodeIds, upstreamNodeIds, isTracing]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync state mutations to React Flow states
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // Click handler to select node and dispatch to parent
  const onNodeClick = (event: any, node: any) => {
    setActiveNodeId(node.id === activeNodeId ? null : node.id);
  };

  const onPaneClick = () => {
    setActiveNodeId(null);
  };

  // Perform auto-focus selection when only one node matches query
  useEffect(() => {
    if (searchQueryMatches.size === 1) {
      const matchId = Array.from(searchQueryMatches)[0];
      if (typeof matchId === "string") {
        setActiveNodeId(matchId);
      }
    }
  }, [searchQueryMatches, setActiveNodeId]);

  return (
    <div className="flex flex-col gap-4 font-sans">
      
      {/* Top Search Controls Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-[#1A120C] p-4 rounded-xl border border-slate-150/70 dark:border-[#3D2E24]">
        
        {/* Search input field widget */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search API route path, microservice namespace, or storage node..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2 bg-white dark:bg-[#251A13] border border-slate-205 dark:border-[#3D2E24] text-slate-800 dark:text-[#ECE4DE] text-xs rounded-lg shadow-3xs focus:outline-hidden focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 focus:border-indigo-500 font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-100 dark:hover:bg-[#1C1410] rounded text-slate-450 dark:text-slate-500"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Action Tracing controller status */}
        <div className="flex items-center gap-2">
          
          {/* Automatic tracing toggle button */}
          <button
            onClick={() => setIsTracing(!isTracing)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              isTracing
                ? "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/50 text-indigo-750 dark:text-indigo-300"
                : "bg-white dark:bg-[#1C1410] border-slate-200 dark:border-[#3D2E24] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-[#ECE4DE]"
            }`}
            title="When active, selecting any microservice highlights all dependents and providers automatically."
          >
            <GitFork className="h-3.5 w-3.5 shrink-0" />
            {isTracing ? "Trace Flow Enabled" : "Tracing Suspended"}
          </button>

          {/* Reset highlights button */}
          {(activeNodeId || searchQuery) && (
            <button
              onClick={() => {
                setActiveNodeId(null);
                setSearchQuery("");
              }}
              className="px-3 py-1.5 bg-white dark:bg-[#1C1410] hover:bg-slate-50 dark:hover:bg-[#251A13] border border-slate-200 dark:border-[#3D2E24] text-slate-650 dark:text-slate-300 hover:text-slate-900 dark:hover:text-[#ECE4DE] font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* Tracing Context State banner */}
      {activeNodeId && isTracing && (
        <div className="p-3 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-lg border border-indigo-150 dark:border-indigo-900/50 flex items-start justify-between gap-3 text-left">
          <div className="flex items-start gap-2.5">
            <Sparkles className="h-4.5 w-4.5 text-indigo-650 dark:text-indigo-400 mt-0.5 shrink-0 animate-pulse" />
            <div>
              <span className="block text-[9px] font-mono font-bold text-slate-450 dark:text-slate-500 uppercase leading-none">ACTIVE IMPACT AUDIT</span>
              <p className="text-xs text-slate-650 dark:text-slate-300 mt-1">
                Tracing dependencies of <strong className="text-slate-850 dark:text-white font-bold">{nodesList.find(n => n.id === activeNodeId)?.label.replace("\\n", " ")}</strong>:
                <span className="inline-block mx-1">/</span>
                <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{downstreamNodeIds.size} downstream services</strong> may experience cascading outages if modified.
                <span className="inline-block mx-1">/</span>
                <span className="text-amber-805 dark:text-amber-500 font-medium">Binds on <strong className="text-amber-800 dark:text-amber-400 font-bold">{upstreamNodeIds.size} upstream providers</strong>.</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveNodeId(null)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-[#ECE4DE] mt-0.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* REACT FLOW CANVAS CONTAINER BLOCK */}
      <div className="w-full border border-slate-150 dark:border-[#3D2E24] rounded-xl bg-slate-50/40 dark:bg-[#1A120C]/40 overflow-hidden relative shadow-inner">
        <div className="w-full h-[380px] [&_.react-flow\_\_background]:dark:bg-[#1A120C]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.5}
            maxZoom={1.5}
          >
            {/* Background grids */}
            <Background color="#cbd5e1" gap={16} size={1} />
            {/* Interactive maps */}
            <MiniMap
              className="!border !border-slate-200 dark:!border-[#3D2E24] !rounded-lg !shadow-xs"
              nodeColor={(n) => {
                if (n.selected) return '#4f46e5';
                if (n.data?.isTraceTarget) return '#10b981';
                if (n.data?.isTraceSource) return '#f59e0b';
                return '#e2e8f0';
              }}
              style={{
                background: '#fafafa',
                height: 80,
                width: 120,
              }}
            />
            {/* Control suites */}
            <Controls className="!bg-white dark:!bg-[#1C1410] !shadow-xs !border !border-slate-200 dark:!border-[#3D2E24] !rounded-lg [&_button]:dark:!border-b-[#3D2E24] [&_button]:dark:!bg-[#1C1410] [&_button_svg]:dark:!fill-white" />
          </ReactFlow>
        </div>

        {/* Legend in corner */}
        <div className="absolute bottom-3 left-3 bg-white/95 dark:bg-[#1C1410]/95 border border-slate-150 dark:border-[#3D2E24] rounded-lg p-2.5 shadow-2xs text-[10px] text-slate-550 dark:text-slate-400 flex flex-col gap-1 z-10 font-mono text-left select-none pointer-events-none">
          <span className="font-bold text-slate-800 dark:text-slate-200 uppercase block tracking-wider mb-1 text-[8.5px]">Diagram Legend</span>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-indigo-600 block"></span>
            <span>Target Node Selected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-305 dark:border-emerald-700/50 block"></span>
            <span>Downstream Dependents</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded bg-amber-100 dark:bg-amber-900/30 border border-amber-305 dark:border-amber-700/50 block"></span>
            <span>Upstream Dependencies</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-305 dark:border-indigo-700/50 block"></span>
            <span>Regex/Text Matched Node</span>
          </div>
        </div>
      </div>

    </div>
  );
}
