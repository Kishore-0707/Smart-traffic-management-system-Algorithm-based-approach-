'use client';

import { useEffect, useState, useCallback } from 'react';

export type TrafficMode = 'LOW' | 'MEDIUM' | 'HIGH';

export interface LaneDensity {
  id: string;
  density: number;
  edge: string;
}

export interface TrafficData {
  lanes: LaneDensity[];
  trafficMode: TrafficMode;
  timestamp: number;
  tlState: 'GREEN_NS' | 'YELLOW_NS' | 'GREEN_EW' | 'YELLOW_EW';
  simTime: number;
}

// Real lane IDs from traffic.net.xml
const REAL_LANES: { id: string; edge: string }[] = [
  { id: 'E1_0', edge: 'E1' },
  { id: 'E1_1', edge: 'E1' },
  { id: 'E1_2', edge: 'E1' },
  { id: 'E2_0', edge: 'E2' },
  { id: 'E2_1', edge: 'E2' },
  { id: 'E2_2', edge: 'E2' },
  { id: 'E3_0', edge: 'E3' },
  { id: 'E3_1', edge: 'E3' },
  { id: 'E3_2', edge: 'E3' },
  { id: 'E4_0', edge: 'E4' },
  { id: 'E4_1', edge: 'E4' },
  { id: 'E4_2', edge: 'E4' },
];

// Traffic light cycle: 42s GREEN_NS → 3s YELLOW_NS → 42s GREEN_EW → 3s YELLOW_EW = 90s total
const TL_CYCLE = 90;

function getTLState(simTime: number): TrafficData['tlState'] {
  const phase = simTime % TL_CYCLE;
  if (phase < 42) return 'GREEN_NS';
  if (phase < 45) return 'YELLOW_NS';
  if (phase < 87) return 'GREEN_EW';
  return 'YELLOW_EW';
}

function generateDensities(simTime: number): LaneDensity[] {
  const tlState = getTLState(simTime);
  // NS = E2/E4, EW = E1/E3
  const nsGreen = tlState === 'GREEN_NS';
  const ewGreen = tlState === 'GREEN_EW';

  return REAL_LANES.map(({ id, edge }) => {
    const isNS = edge === 'E2' || edge === 'E4';
    const isEW = edge === 'E1' || edge === 'E3';
    let baseDensity = 10 + Math.random() * 15;

    if (isNS && nsGreen) baseDensity += 20 + Math.random() * 25;
    if (isEW && ewGreen) baseDensity += 20 + Math.random() * 25;
    // Queuing on red
    if (isNS && !nsGreen) baseDensity += 10 + Math.random() * 20;
    if (isEW && !ewGreen) baseDensity += 10 + Math.random() * 20;

    return { id, edge, density: Math.round(Math.min(baseDensity, 80)) };
  });
}

function getTrafficMode(lanes: LaneDensity[]): TrafficMode {
  const avg = lanes.reduce((s, l) => s + l.density, 0) / lanes.length;
  if (avg < 22) return 'LOW';
  if (avg < 42) return 'MEDIUM';
  return 'HIGH';
}

export function useTrafficData(): TrafficData {
  const [data, setData] = useState<TrafficData>(() => {
    const lanes = generateDensities(0);
    return {
      lanes,
      trafficMode: getTrafficMode(lanes),
      timestamp: Date.now(),
      tlState: 'GREEN_NS',
      simTime: 0,
    };
  });

  const tick = useCallback((simTime: number) => {
    const lanes = generateDensities(simTime);
    setData({
      lanes,
      trafficMode: getTrafficMode(lanes),
      timestamp: Date.now(),
      tlState: getTLState(simTime),
      simTime,
    });
  }, []);

  useEffect(() => {
    let simTime = 0;
    const id = setInterval(() => {
      simTime += 1;
      tick(simTime);
    }, 1000);
    return () => clearInterval(id);
  }, [tick]);

  return data;
}
