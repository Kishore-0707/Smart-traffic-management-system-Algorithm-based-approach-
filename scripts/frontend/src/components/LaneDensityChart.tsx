'use client';

import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { LaneDensity } from '@/hooks/useTrafficData';

interface LaneDensityChartProps {
  lanes: LaneDensity[];
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  const density = payload[0].value;
  const level = density < 25 ? 'Low' : density < 50 ? 'Medium' : 'High';
  const color = density < 25 ? '#4ade80' : density < 50 ? '#facc15' : '#f87171';

  return (
    <div
      className="rounded-lg px-3 py-2 text-xs"
      style={{
        background: 'rgba(10,18,30,0.92)',
        border: '1px solid rgba(56,189,248,0.25)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <p className="font-semibold text-slate-300 mb-1">{label}</p>
      <p style={{ color }} className="font-bold text-sm">{density} <span className="font-normal text-slate-400">veh/km</span></p>
      <p className="text-slate-500">{level} congestion</p>
    </div>
  );
};

function getDensityColor(density: number): string {
  if (density < 25) return '#4ade80';
  if (density < 50) return '#facc15';
  return '#f87171';
}

export function LaneDensityChart({ lanes }: LaneDensityChartProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold tracking-widest text-cyan-400/80">LANE DENSITY</span>
        <span className="text-xs text-slate-500">veh/km</span>
      </div>

      <motion.div layout transition={{ duration: 0.4 }}>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart
            data={lanes}
            margin={{ top: 4, right: 4, left: -22, bottom: 0 }}
            barCategoryGap="20%"
          >
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(56,189,248,0.08)"
              vertical={false}
            />
            <XAxis
              dataKey="id"
              tick={{ fill: 'rgba(148,163,184,0.7)', fontSize: 9, fontFamily: 'Outfit' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 80]}
              tick={{ fill: 'rgba(148,163,184,0.5)', fontSize: 9, fontFamily: 'Outfit' }}
              axisLine={false}
              tickLine={false}
              tickCount={5}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(56,189,248,0.05)' }}
            />
            <Bar
              dataKey="density"
              radius={[3, 3, 0, 0]}
              isAnimationActive={true}
              animationDuration={600}
              animationEasing="ease-out"
              filter="url(#glow)"
            >
              {lanes.map((lane) => (
                <Cell
                  key={lane.id}
                  fill={getDensityColor(lane.density)}
                  fillOpacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-1 justify-center">
        {[
          { color: '#4ade80', label: '< 25' },
          { color: '#facc15', label: '25–50' },
          { color: '#f87171', label: '> 50' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div style={{ width: 8, height: 8, borderRadius: 2, background: color, opacity: 0.85 }} />
            <span className="text-xs text-slate-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
