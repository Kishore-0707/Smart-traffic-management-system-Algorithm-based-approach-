'use client';

import { motion } from 'framer-motion';
import type { TrafficMode } from '@/hooks/useTrafficData';

interface TrafficModeIndicatorProps {
  mode: TrafficMode;
  simTime: number;
}

const MODE_CONFIG = {
  LOW: {
    label: 'LOW',
    sublabel: 'Traffic flowing freely',
    color: '#4ade80',
    bgColor: 'rgba(74,222,128,0.12)',
    borderColor: 'rgba(74,222,128,0.35)',
    glowClass: 'glow-green',
    dot: '🟢',
  },
  MEDIUM: {
    label: 'MEDIUM',
    sublabel: 'Moderate congestion',
    color: '#facc15',
    bgColor: 'rgba(250,204,21,0.10)',
    borderColor: 'rgba(250,204,21,0.35)',
    glowClass: 'glow-yellow',
    dot: '🟡',
  },
  HIGH: {
    label: 'HIGH',
    sublabel: 'Heavy congestion',
    color: '#f87171',
    bgColor: 'rgba(248,113,113,0.12)',
    borderColor: 'rgba(248,113,113,0.4)',
    glowClass: 'pulse-high',
    dot: '🔴',
  },
};

export function TrafficModeIndicator({ mode, simTime }: TrafficModeIndicatorProps) {
  const cfg = MODE_CONFIG[mode];

  return (
    <motion.div
      key={mode}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, type: 'spring', stiffness: 200 }}
      className={`rounded-xl p-3 ${cfg.glowClass}`}
      style={{
        background: cfg.bgColor,
        border: `1px solid ${cfg.borderColor}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          {/* Animated status dot */}
          <motion.div
            animate={mode === 'HIGH' ? { scale: [1, 1.4, 1] } : { scale: 1 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: cfg.color,
              boxShadow: `0 0 8px ${cfg.color}`,
              flexShrink: 0,
            }}
          />
          <span
            className="text-xs font-semibold tracking-widest"
            style={{ color: cfg.color }}
          >
            CONGESTION
          </span>
        </div>
      </div>

      {/* Mode badge */}
      <motion.div
        className="flex items-center gap-2"
        layout
      >
        <span className="text-xl">{cfg.dot}</span>
        <div>
          <motion.p
            className="text-lg font-bold leading-tight"
            style={{ color: cfg.color }}
            key={mode}
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {cfg.label}
          </motion.p>
          <p className="text-xs text-slate-400 leading-tight">{cfg.sublabel}</p>
        </div>
      </motion.div>

      {/* Sim time */}
      <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between">
        <span className="text-xs text-slate-500">Sim time</span>
        <motion.span
          key={simTime}
          className="text-xs font-mono"
          style={{ color: 'rgba(148,163,184,0.8)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {simTime}s
        </motion.span>
      </div>
    </motion.div>
  );
}
