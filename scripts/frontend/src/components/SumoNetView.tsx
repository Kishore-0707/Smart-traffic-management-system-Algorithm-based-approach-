'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { TrafficData } from '@/hooks/useTrafficData';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedLane {
  id: string;
  index: number;
  speed: number;
  length: number;
  shape: Array<[number, number]>; // SUMO coords
  edgeId: string;
  isInternal: boolean;
}

interface ParsedEdge {
  id: string;
  from?: string;
  to?: string;
  priority?: number;
  isInternal: boolean;
  lanes: ParsedLane[];
}

interface ParsedJunction {
  id: string;
  type: string;
  x: number;
  y: number;
  shape: Array<[number, number]>;
}

interface NetworkData {
  edges: ParsedEdge[];
  junctions: ParsedJunction[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

// ─── XML parsing helpers ──────────────────────────────────────────────────────

function parseShape(shapeStr: string): Array<[number, number]> {
  return shapeStr.trim().split(' ').map((pt) => {
    const [x, y] = pt.split(',').map(Number);
    return [x, y] as [number, number];
  });
}

function parseNetwork(xml: Document): NetworkData {
  const edges: ParsedEdge[] = [];
  const junctions: ParsedJunction[] = [];

  // Parse edges + lanes
  xml.querySelectorAll('edge').forEach((edgeEl) => {
    const id = edgeEl.getAttribute('id') || '';
    const isInternal = edgeEl.getAttribute('function') === 'internal';
    const edge: ParsedEdge = {
      id,
      from: edgeEl.getAttribute('from') || undefined,
      to: edgeEl.getAttribute('to') || undefined,
      isInternal,
      lanes: [],
    };

    edgeEl.querySelectorAll('lane').forEach((laneEl) => {
      const shapeStr = laneEl.getAttribute('shape') || '';
      edge.lanes.push({
        id: laneEl.getAttribute('id') || '',
        index: parseInt(laneEl.getAttribute('index') || '0', 10),
        speed: parseFloat(laneEl.getAttribute('speed') || '0'),
        length: parseFloat(laneEl.getAttribute('length') || '0'),
        shape: shapeStr ? parseShape(shapeStr) : [],
        edgeId: id,
        isInternal,
      });
    });

    edges.push(edge);
  });

  // Parse junctions
  xml.querySelectorAll('junction').forEach((jEl) => {
    const shapeStr = jEl.getAttribute('shape') || '';
    junctions.push({
      id: jEl.getAttribute('id') || '',
      type: jEl.getAttribute('type') || '',
      x: parseFloat(jEl.getAttribute('x') || '0'),
      y: parseFloat(jEl.getAttribute('y') || '0'),
      shape: shapeStr ? parseShape(shapeStr) : [],
    });
  });

  // Compute bounding box from all lane shapes
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  edges.forEach((e) =>
    e.lanes.forEach((l) =>
      l.shape.forEach(([x, y]) => {
        minX = Math.min(minX, x); minY = Math.min(minY, y);
        maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      })
    )
  );

  return { edges, junctions, bounds: { minX, minY, maxX, maxY } };
}

// ─── Vehicle particle system ──────────────────────────────────────────────────

interface Vehicle {
  id: string;
  laneId: string;
  progress: number; // 0..1 along lane shape
  speed: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface SumoNetViewProps {
  data: TrafficData;
}

export function SumoNetView({ data }: SumoNetViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const netRef = useRef<NetworkData | null>(null);
  const vehiclesRef = useRef<Vehicle[]>([]);
  const animRef = useRef<number>(0);
  const dataRef = useRef<TrafficData>(data);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  // Keep data ref current
  useEffect(() => { dataRef.current = data; }, [data]);

  // Load + parse traffic.net.xml
  useEffect(() => {
    fetch('/traffic.net.xml')
      .then((r) => r.text())
      .then((text) => {
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'application/xml');
        netRef.current = parseNetwork(xml);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, []);

  // Update vehicle population when data changes
  useEffect(() => {
    if (!netRef.current) return;
    const next: Vehicle[] = [];

    dataRef.current.lanes.forEach((lane) => {
      const targetCount = Math.round(lane.density / 9);
      const existing = vehiclesRef.current.filter((v) => v.laneId === lane.id);
      existing.slice(0, targetCount).forEach((v) => next.push(v));
      for (let i = existing.length; i < targetCount; i++) {
        next.push({
          id: `${lane.id}_${i}_${Math.random().toString(36).slice(2)}`,
          laneId: lane.id,
          progress: Math.random(),
          speed: 0.002 + Math.random() * 0.003,
        });
      }
    });

    vehiclesRef.current = next;
  }, [data]);

  // Canvas drawing loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const net = netRef.current;
    if (!canvas || !net) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const { bounds } = net;
    const netW = bounds.maxX - bounds.minX;
    const netH = bounds.maxY - bounds.minY;
    const pad = 40;
    const scaleX = (W - pad * 2) / netW;
    const scaleY = (H - pad * 2) / netH;
    const scale = Math.min(scaleX, scaleY);
    const offX = pad + (W - pad * 2 - netW * scale) / 2;
    const offY = pad + (H - pad * 2 - netH * scale) / 2;

    // Convert SUMO coord → canvas coord (Y-flip)
    const toC = (x: number, y: number) => ({
      x: offX + (x - bounds.minX) * scale,
      y: H - (offY + (y - bounds.minY) * scale),
    });

    // ── Background ──
    ctx.clearRect(0, 0, W, H);
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#010b15');
    bg.addColorStop(1, '#020d1c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // ── Grid ──
    ctx.strokeStyle = 'rgba(20,50,80,0.35)';
    ctx.lineWidth = 0.5;
    for (let gx = 0; gx < W; gx += 55) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
    for (let gy = 0; gy < H; gy += 55) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }

    // ── Junction shapes ──
    net.junctions.forEach((j) => {
      if (j.type === 'internal' || j.shape.length < 3) return;
      ctx.beginPath();
      j.shape.forEach((pt, i) => {
        const { x, y } = toC(pt[0], pt[1]);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = j.type === 'traffic_light' ? '#1a3050' : '#152035';
      ctx.fill();
      if (j.type === 'traffic_light') {
        ctx.strokeStyle = 'rgba(56,189,248,0.3)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    });

    // ── Density overlay lookup ──
    const densityMap = new Map<string, number>();
    dataRef.current.lanes.forEach((l) => densityMap.set(l.id, l.density));

    // ── Edges (internal first, then normal so normal roads draw on top) ──
    const drawEdges = (internal: boolean) => {
      net.edges
        .filter((e) => e.isInternal === internal)
        .forEach((edge) => {
          edge.lanes.forEach((lane) => {
            if (lane.shape.length < 2) return;
            const density = densityMap.get(lane.id) ?? 0;
            const norm = Math.min(density / 80, 1);

            // Road fill colour
            const roadColor = internal
              ? 'rgba(28,55,85,0.8)'
              : '#1e3a5f';

            ctx.beginPath();
            lane.shape.forEach((pt, i) => {
              const { x, y } = toC(pt[0], pt[1]);
              i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            });
            ctx.strokeStyle = roadColor;
            ctx.lineWidth = Math.max(scale * 3.0, 4);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();

            // Density heat overlay
            if (!internal && density > 0) {
              const r = norm < 0.5 ? Math.round(norm * 2 * 220) : 220;
              const g = norm < 0.5 ? 180 : Math.round((1 - norm) * 2 * 180);
              ctx.beginPath();
              lane.shape.forEach((pt, i) => {
                const { x, y } = toC(pt[0], pt[1]);
                i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
              });
              ctx.strokeStyle = `rgba(${r},${g},30,${0.1 + norm * 0.25})`;
              ctx.lineWidth = Math.max(scale * 2.8, 3.5);
              ctx.stroke();
            }

            // Lane centre-line marking
            if (!internal) {
              ctx.beginPath();
              lane.shape.forEach((pt, i) => {
                const { x, y } = toC(pt[0], pt[1]);
                i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
              });
              ctx.strokeStyle = 'rgba(250,204,21,0.18)';
              ctx.lineWidth = 0.7;
              ctx.setLineDash([6, 9]);
              ctx.stroke();
              ctx.setLineDash([]);
            }
          });
        });
    };

    drawEdges(true);
    drawEdges(false);

    // ── Traffic light dots at J9 ──
    const tlJunction = net.junctions.find((j) => j.id === 'J9');
    if (tlJunction) {
      const cj = toC(tlJunction.x, tlJunction.y);
      const tl = dataRef.current.tlState;
      const nsColor = tl === 'GREEN_NS' ? '#4ade80' : tl === 'YELLOW_NS' ? '#facc15' : '#f87171';
      const ewColor = tl === 'GREEN_EW' ? '#4ade80' : tl === 'YELLOW_EW' ? '#facc15' : '#f87171';
      const r = Math.max(scale * 2, 5);

      const tlDots = [
        { x: cj.x, y: cj.y - r * 4, color: nsColor },
        { x: cj.x, y: cj.y + r * 4, color: nsColor },
        { x: cj.x - r * 4, y: cj.y, color: ewColor },
        { x: cj.x + r * 4, y: cj.y, color: ewColor },
      ];

      tlDots.forEach(({ x, y, color }) => {
        // Outer glow
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2);
        grad.addColorStop(0, color + 'aa');
        grad.addColorStop(1, color + '00');
        ctx.beginPath();
        ctx.arc(x, y, r * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(x, y, r * 0.65, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      });
    }

    // ── Advance & draw vehicles ──
    const laneMap = new Map<string, ParsedLane>();
    net.edges.forEach((e) => e.lanes.forEach((l) => laneMap.set(l.id, l)));

    vehiclesRef.current = vehiclesRef.current.map((v) => {
      const lane = laneMap.get(v.laneId);
      if (!lane || lane.shape.length < 2) return v;

      // Interpolate position along polyline
      const totalLen = lane.length;
      const targetDist = v.progress * totalLen;
      let accumulated = 0;
      let px = lane.shape[0][0], py = lane.shape[0][1];

      for (let i = 0; i < lane.shape.length - 1; i++) {
        const [x1, y1] = lane.shape[i];
        const [x2, y2] = lane.shape[i + 1];
        const segLen = Math.hypot(x2 - x1, y2 - y1);
        if (accumulated + segLen >= targetDist) {
          const t = (targetDist - accumulated) / segLen;
          px = x1 + (x2 - x1) * t;
          py = y1 + (y2 - y1) * t;
          break;
        }
        accumulated += segLen;
        px = x2; py = y2;
      }

      const { x, y } = toC(px, py);
      const vr = Math.max(scale * 1.0, 3);

      // Glow
      const aura = ctx.createRadialGradient(x, y, 0, x, y, vr * 3);
      aura.addColorStop(0, 'rgba(56,189,248,0.4)');
      aura.addColorStop(1, 'rgba(56,189,248,0)');
      ctx.beginPath();
      ctx.arc(x, y, vr * 3, 0, Math.PI * 2);
      ctx.fillStyle = aura;
      ctx.fill();

      // Vehicle dot
      ctx.beginPath();
      ctx.arc(x, y, vr * 0.65, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 5;
      ctx.fill();
      ctx.shadowBlur = 0;

      return { ...v, progress: (v.progress + v.speed) % 1 };
    });

    // ── Junction labels ──
    const terminalJunctions = net.junctions.filter(
      (j) => j.type === 'dead_end' || j.type === 'traffic_light'
    );
    const jLabels: Record<string, string> = {
      J8: 'J8 (W)', J9: 'J9 ●', J10: 'J10 (N)', J11: 'J11 (E)', J12: 'J12 (S)',
    };
    ctx.font = `600 ${Math.max(scale * 5, 10)}px Outfit, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    terminalJunctions.forEach((j) => {
      const { x, y } = toC(j.x, j.y);
      const label = jLabels[j.id] || j.id;
      ctx.fillStyle = j.type === 'traffic_light' ? 'rgba(56,189,248,0.9)' : 'rgba(148,163,184,0.6)';
      ctx.fillText(label, x, y - Math.max(scale * 6, 14));
    });

    // ── Edge ID labels on road arms ──
    const armEdges = [
      { id: 'E1', label: 'E1 →J9' },
      { id: 'E2', label: 'E2 →J9' },
      { id: 'E3', label: 'E3 →J9' },
      { id: 'E4', label: 'E4 →J9' },
    ];

    ctx.font = `400 ${Math.max(scale * 3.5, 9)}px Outfit, sans-serif`;
    ctx.fillStyle = 'rgba(100,130,160,0.6)';

    armEdges.forEach(({ id, label }) => {
      const edge = net.edges.find((e) => e.id === id);
      const midLane = edge?.lanes[1];
      if (!midLane || midLane.shape.length < 2) return;
      const midPt = midLane.shape[Math.floor(midLane.shape.length / 2)];
      const { x, y } = toC(midPt[0], midPt[1]);
      ctx.fillText(label, x, y - 8);
    });

    // ── Sim time watermark ──
    ctx.font = `400 ${Math.max(W * 0.011, 10)}px Outfit, mono`;
    ctx.fillStyle = 'rgba(56,189,248,0.4)';
    ctx.textAlign = 'left';
    ctx.fillText(`SIM  t=${dataRef.current.simTime}s  ·  ${dataRef.current.tlState}`, 14, 22);

    animRef.current = requestAnimationFrame(draw);
  }, []);

  // Canvas resize observer + animation loop
  useEffect(() => {
    if (status !== 'ready') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, [status, draw]);

  return (
    <div className="absolute inset-0 w-full h-full">
      {/* SUMO-style dark chrome header bar */}
      <div
        className="absolute top-0 left-0 right-0 z-20 flex items-center gap-3 px-4 py-2"
        style={{
          background: 'rgba(1,14,28,0.88)',
          borderBottom: '1px solid rgba(56,189,248,0.14)',
          backdropFilter: 'blur(8px)',
        }}
      >
        {/* SUMO logo-like badge */}
        <div
          className="flex items-center gap-2 px-3 py-1 rounded"
          style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)' }}
        >
          <span style={{ color: '#38bdf8', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em' }}>SUMO</span>
          <span style={{ color: 'rgba(148,163,184,0.7)', fontSize: 11 }}>1.25.0</span>
        </div>

        {/* Config file name */}
        <div className="flex items-center gap-1.5">
          <span style={{ color: 'rgba(100,116,139,1)', fontSize: 11 }}>▶</span>
          <span style={{ color: 'rgba(148,163,184,0.85)', fontSize: 12, fontFamily: 'monospace' }}>
            traffic.sumocfg
          </span>
        </div>

        <div style={{ width: 1, height: 18, background: 'rgba(56,189,248,0.15)' }} />

        {/* Network stats */}
        <span style={{ color: 'rgba(100,116,139,0.9)', fontSize: 11 }}>Net: traffic.net.xml</span>
        <span style={{ color: 'rgba(100,116,139,0.9)', fontSize: 11 }}>|</span>
        <span style={{ color: 'rgba(100,116,139,0.9)', fontSize: 11 }}>Edges: 8</span>
        <span style={{ color: 'rgba(100,116,139,0.9)', fontSize: 11 }}>|</span>
        <span style={{ color: 'rgba(100,116,139,0.9)', fontSize: 11 }}>Lanes: 12</span>
        <span style={{ color: 'rgba(100,116,139,0.9)', fontSize: 11 }}>|</span>
        <span style={{ color: 'rgba(100,116,139,0.9)', fontSize: 11 }}>Junctions: 5</span>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Live indicator */}
        {status === 'ready' && (
          <div className="flex items-center gap-2">
            <div
              style={{
                width: 7, height: 7, borderRadius: '50%',
                background: '#4ade80',
                boxShadow: '0 0 6px #4ade80',
                animation: 'pulse 1s ease-in-out infinite',
              }}
            />
            <span style={{ color: 'rgba(74,222,128,0.85)', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em' }}>
              RUNNING
            </span>
          </div>
        )}

        {status === 'loading' && (
          <span style={{ color: 'rgba(250,204,21,0.8)', fontSize: 11 }}>Loading network…</span>
        )}
      </div>

      {/* Main canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ paddingTop: '36px' }}
      />

      {/* Error state */}
      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="glass-card px-8 py-6 text-center">
            <p className="text-red-400 font-semibold mb-1">Failed to load traffic.net.xml</p>
            <p className="text-slate-500 text-sm">Make sure the dev server can serve /traffic.net.xml</p>
          </div>
        </div>
      )}

      {/* Bottom status bar (SUMO-style) */}
      {status === 'ready' && (
        <div
          className="absolute bottom-0 left-0 right-0 z-20 flex items-center gap-4 px-4 py-1"
          style={{
            background: 'rgba(1,14,28,0.88)',
            borderTop: '1px solid rgba(56,189,248,0.12)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span style={{ color: 'rgba(100,116,139,0.8)', fontSize: 10, fontFamily: 'monospace' }}>
            Coord: -800.00, 300.00 (J9)
          </span>
          <span style={{ color: 'rgba(56,189,248,0.3)', fontSize: 10 }}>|</span>
          <span style={{ color: 'rgba(100,116,139,0.8)', fontSize: 10, fontFamily: 'monospace' }}>
            Zoom: fit
          </span>
          <span style={{ color: 'rgba(56,189,248,0.3)', fontSize: 10 }}>|</span>
          <span style={{ color: 'rgba(100,116,139,0.8)', fontSize: 10, fontFamily: 'monospace' }}>
            Route: vehicles.rou.xml
          </span>
          <div style={{ flex: 1 }} />
          <span style={{ color: 'rgba(100,116,139,0.6)', fontSize: 10 }}>
            © Eclipse SUMO — netedit 1.25.0
          </span>
        </div>
      )}
    </div>
  );
}
