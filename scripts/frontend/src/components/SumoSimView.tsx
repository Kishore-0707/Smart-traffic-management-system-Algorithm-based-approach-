'use client';

import { useEffect, useRef } from 'react';
import type { TrafficData } from '@/hooks/useTrafficData';

interface SumoSimViewProps {
  data: TrafficData;
}

// -----------------------------------------------------------------------
// Network constants derived from traffic.net.xml
// Bounding box: x: -1200 to -500  (width 700), y: 0 to 600 (height 600)
// Central junction J9 at (-800, 300)
// Arm lengths: E1/E3 ≈ 386 (horizontal), E2/E4 ≈ 286 (vertical)
// 3 lanes per arm, lane width = 3.2 (SUMO default)
// -----------------------------------------------------------------------
const NET_X_MIN = -1200;
const NET_Y_MIN = 0;
const NET_W = 700;
const NET_H = 600;

// We keep track of vehicle "particles" per lane
interface Vehicle {
  id: string;
  progress: number; // 0..1 along the lane towards intersection
  speed: number;    // fraction per tick
  laneId: string;
}

// Map edge id → lane IDs
const EDGE_LANES: Record<string, string[]> = {
  E1: ['E1_0', 'E1_1', 'E1_2'],
  E2: ['E2_0', 'E2_1', 'E2_2'],
  E3: ['E3_0', 'E3_1', 'E3_2'],
  E4: ['E4_0', 'E4_1', 'E4_2'],
};

// Convert SUMO network coords → canvas coords
function toCanvas(nx: number, ny: number, cw: number, ch: number) {
  const px = ((nx - NET_X_MIN) / NET_W) * cw;
  const py = ((NET_H - (ny - NET_Y_MIN)) / NET_H) * ch; // flip Y
  return { x: px, y: py };
}

// Draw the road background, lanes, markings
function drawNetwork(ctx: CanvasRenderingContext2D, cw: number, ch: number) {
  const ROAD_W = Math.max(cw * 0.055, 36); // width for all 3 lanes of one arm

  ctx.clearRect(0, 0, cw, ch);

  // Background
  const bg = ctx.createLinearGradient(0, 0, cw, ch);
  bg.addColorStop(0, '#020810');
  bg.addColorStop(0.5, '#040d1a');
  bg.addColorStop(1, '#020810');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, cw, ch);

  // Grid (very faint city grid feel)
  ctx.strokeStyle = 'rgba(30,50,80,0.4)';
  ctx.lineWidth = 0.5;
  const GRID = 60;
  for (let gx = 0; gx < cw; gx += GRID) {
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, ch); ctx.stroke();
  }
  for (let gy = 0; gy < ch; gy += GRID) {
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(cw, gy); ctx.stroke();
  }

  const J9 = toCanvas(-800, 300, cw, ch);

  // Endpoints
  const J8  = toCanvas(-1200, 300, cw, ch); // west
  const J11 = toCanvas(-500,  300, cw, ch); // east
  const J10 = toCanvas(-800,  600, cw, ch); // north (canvas-flipped)
  const J12 = toCanvas(-800,  0,   cw, ch); // south (canvas-flipped)

  const armRoads = [
    { from: J8,  to: J9, horizontal: true },
    { from: J11, to: J9, horizontal: true },
    { from: J10, to: J9, horizontal: false },
    { from: J12, to: J9, horizontal: false },
  ];

  // Draw road fills
  armRoads.forEach(({ from, to, horizontal }) => {
    ctx.save();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = ROAD_W;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.restore();
  });

  // Intersection box
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(J9.x - ROAD_W * 0.5, J9.y - ROAD_W * 0.5, ROAD_W, ROAD_W);

  // Lane markings (dashed white lines)
  const laneW = ROAD_W / 3;
  armRoads.forEach(({ from, to, horizontal }) => {
    ctx.save();
    ctx.strokeStyle = 'rgba(250,204,21,0.35)';
    ctx.lineWidth = 0.8;
    ctx.setLineDash([12, 14]);
    ctx.lineDashOffset = 0;

    if (horizontal) {
      for (let i = 1; i < 3; i++) {
        const offsetY = (i - 1.5) * laneW;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y + offsetY);
        ctx.lineTo(to.x, to.y + offsetY);
        ctx.stroke();
      }
    } else {
      for (let i = 1; i < 3; i++) {
        const offsetX = (i - 1.5) * laneW;
        ctx.beginPath();
        ctx.moveTo(from.x + offsetX, from.y);
        ctx.lineTo(to.x + offsetX, to.y);
        ctx.stroke();
      }
    }
    ctx.restore();
  });

  // Road edge lines
  armRoads.forEach(({ from, to, horizontal }) => {
    ctx.save();
    ctx.strokeStyle = 'rgba(148,163,184,0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);

    const halfW = ROAD_W / 2;
    if (horizontal) {
      ctx.beginPath(); ctx.moveTo(from.x, from.y - halfW); ctx.lineTo(to.x, to.y - halfW); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(from.x, from.y + halfW); ctx.lineTo(to.x, to.y + halfW); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(from.x - halfW, from.y); ctx.lineTo(to.x - halfW, to.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(from.x + halfW, from.y); ctx.lineTo(to.x + halfW, to.y); ctx.stroke();
    }
    ctx.restore();
  });

  return { J9, J8, J11, J10, J12, ROAD_W, laneW };
}

// Draw traffic light indicator at intersection
function drawTrafficLight(
  ctx: CanvasRenderingContext2D,
  J9: { x: number; y: number },
  tlState: TrafficData['tlState'],
  cw: number
) {
  const r = Math.max(cw * 0.008, 6);
  const nsColor = tlState === 'GREEN_NS' ? '#4ade80' : tlState === 'YELLOW_NS' ? '#facc15' : '#f87171';
  const ewColor = tlState === 'GREEN_EW' ? '#4ade80' : tlState === 'YELLOW_EW' ? '#facc15' : '#f87171';

  // NS light (above/below intersection)
  [J9.y - r * 4, J9.y + r * 4].forEach((y) => {
    ctx.beginPath();
    ctx.arc(J9.x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = nsColor;
    ctx.shadowColor = nsColor;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  // EW light (left/right)
  [J9.x - r * 4, J9.x + r * 4].forEach((x) => {
    ctx.beginPath();
    ctx.arc(x, J9.y, r, 0, Math.PI * 2);
    ctx.fillStyle = ewColor;
    ctx.shadowColor = ewColor;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
  });
}

// Draw vehicles along their lanes
function drawVehicles(
  ctx: CanvasRenderingContext2D,
  vehicles: Vehicle[],
  cw: number,
  ch: number,
  ROAD_W: number,
  laneW: number,
  J9: { x: number; y: number },
  J8: { x: number; y: number },
  J11: { x: number; y: number },
  J10: { x: number; y: number },
  J12: { x: number; y: number }
) {
  // Lane index → perpendicular offset from road centre
  const laneOffset = (laneIdx: number) => (laneIdx - 1) * laneW;

  // For each edge, define start and end points and orientation
  const edgeInfo: Record<string, { start: typeof J9; end: typeof J9; horizontal: boolean; dir: 1 | -1 }> = {
    E1: { start: J8,  end: J9, horizontal: true,  dir: 1 },
    E2: { start: J12, end: J9, horizontal: false, dir: -1 },
    E3: { start: J11, end: J9, horizontal: true,  dir: -1 },
    E4: { start: J10, end: J9, horizontal: false, dir: 1 },
  };

  vehicles.forEach((v) => {
    const edge = v.laneId.split('_')[0] as keyof typeof edgeInfo;
    const laneIdx = parseInt(v.laneId.split('_')[1], 10);
    const info = edgeInfo[edge];
    if (!info) return;

    const t = v.progress;
    let x: number, y: number;

    if (info.horizontal) {
      x = info.start.x + (info.end.x - info.start.x) * t;
      y = info.start.y + laneOffset(laneIdx);
    } else {
      x = info.start.x + laneOffset(laneIdx);
      y = info.start.y + (info.end.y - info.start.y) * t;
    }

    const vSize = Math.max(cw * 0.007, 5);

    // Glow aura
    ctx.beginPath();
    ctx.arc(x, y, vSize * 1.8, 0, Math.PI * 2);
    const aura = ctx.createRadialGradient(x, y, 0, x, y, vSize * 1.8);
    aura.addColorStop(0, 'rgba(56,189,248,0.35)');
    aura.addColorStop(1, 'rgba(56,189,248,0)');
    ctx.fillStyle = aura;
    ctx.fill();

    // Vehicle body
    ctx.beginPath();
    ctx.arc(x, y, vSize * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.shadowBlur = 0;
  });
}

// Draw lane density colour overlay on roads
function drawDensityOverlay(
  ctx: CanvasRenderingContext2D,
  data: TrafficData,
  cw: number,
  ch: number,
  ROAD_W: number,
  laneW: number,
  J9: { x: number; y: number },
  J8: { x: number; y: number },
  J11: { x: number; y: number },
  J10: { x: number; y: number },
  J12: { x: number; y: number }
) {
  const edgePts: Record<string, { from: typeof J9; to: typeof J9; horiz: boolean }> = {
    E1: { from: J8,  to: J9, horiz: true },
    E2: { from: J12, to: J9, horiz: false },
    E3: { from: J11, to: J9, horiz: true },
    E4: { from: J10, to: J9, horiz: false },
  };

  data.lanes.forEach((lane) => {
    const edge = lane.id.split('_')[0];
    const laneIdx = parseInt(lane.id.split('_')[1], 10);
    const ep = edgePts[edge];
    if (!ep) return;

    const norm = Math.min(lane.density / 80, 1); // 0..1
    // Color: green → yellow → red
    const r = Math.round(norm < 0.5 ? norm * 2 * 200 : 200);
    const g = Math.round(norm < 0.5 ? 180 : (1 - norm) * 2 * 180);
    const alpha = 0.12 + norm * 0.22;

    const offset = (laneIdx - 1) * laneW;
    ctx.save();
    ctx.strokeStyle = `rgba(${r},${g},30,${alpha})`;
    ctx.lineWidth = laneW * 0.85;
    ctx.beginPath();
    if (ep.horiz) {
      ctx.moveTo(ep.from.x, ep.from.y + offset);
      ctx.lineTo(ep.to.x, ep.to.y + offset);
    } else {
      ctx.moveTo(ep.from.x + offset, ep.from.y);
      ctx.lineTo(ep.to.x + offset, ep.to.y);
    }
    ctx.stroke();
    ctx.restore();
  });
}

// Draw edge/arm labels
function drawLabels(
  ctx: CanvasRenderingContext2D,
  J8: { x: number; y: number },
  J11: { x: number; y: number },
  J10: { x: number; y: number },
  J12: { x: number; y: number },
  cw: number
) {
  const fontSize = Math.max(cw * 0.013, 11);
  ctx.font = `600 ${fontSize}px Outfit, sans-serif`;
  ctx.fillStyle = 'rgba(148,163,184,0.7)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const labels: Array<{ pt: typeof J8; text: string; dx: number; dy: number }> = [
    { pt: J8,  text: 'W · E1', dx: 40, dy: 0 },
    { pt: J11, text: 'E · E3', dx: -40, dy: 0 },
    { pt: J10, text: 'N · E4', dx: 0, dy: 20 },
    { pt: J12, text: 'S · E2', dx: 0, dy: -20 },
  ];

  labels.forEach(({ pt, text, dx, dy }) => {
    ctx.fillText(text, pt.x + dx, pt.y + dy);
  });
}

export function SumoSimView({ data }: SumoSimViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vehiclesRef = useRef<Vehicle[]>([]);
  const animRef = useRef<number>(0);
  const lastDataRef = useRef<TrafficData>(data);

  // Sync data ref
  useEffect(() => {
    lastDataRef.current = data;
  }, [data]);

  // Spawn / update vehicles based on density
  useEffect(() => {
    const existing = new Map(vehiclesRef.current.map((v) => [v.id, v]));
    const next: Vehicle[] = [];

    data.lanes.forEach((lane) => {
      const targetCount = Math.round(lane.density / 8); // scale 0-80 → 0-10 vehicles
      const laneVehicles = vehiclesRef.current.filter((v) => v.laneId === lane.id);

      // Keep existing
      laneVehicles.slice(0, targetCount).forEach((v) => next.push(v));

      // Add new
      for (let i = laneVehicles.length; i < targetCount; i++) {
        next.push({
          id: `${lane.id}_${i}_${Math.random()}`,
          progress: Math.random() * 0.9,
          speed: 0.003 + Math.random() * 0.003,
          laneId: lane.id,
        });
      }
    });

    vehiclesRef.current = next;
  }, [data]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const cw = canvas.width;
      const ch = canvas.height;

      const { J9, J8, J11, J10, J12, ROAD_W, laneW } = drawNetwork(ctx, cw, ch);

      drawDensityOverlay(ctx, lastDataRef.current, cw, ch, ROAD_W, laneW, J9, J8, J11, J10, J12);

      // Advance vehicles
      vehiclesRef.current = vehiclesRef.current.map((v) => {
        let newProg = v.progress + v.speed;
        if (newProg > 1) newProg = 0.01; // loop
        return { ...v, progress: newProg };
      });

      drawVehicles(ctx, vehiclesRef.current, cw, ch, ROAD_W, laneW, J9, J8, J11, J10, J12);
      drawTrafficLight(ctx, J9, lastDataRef.current.tlState, cw);
      drawLabels(ctx, J8, J11, J10, J12, cw);

      // Sim-time watermark
      const fontSize = Math.max(cw * 0.011, 10);
      ctx.font = `400 ${fontSize}px Outfit, sans-serif`;
      ctx.fillStyle = 'rgba(56,189,248,0.45)';
      ctx.textAlign = 'left';
      ctx.fillText(`SIM  t=${lastDataRef.current.simTime}s`, 14, 20);

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full scanlines"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
