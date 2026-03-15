'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { LaneDensityChart } from './LaneDensityChart';
import { TrafficModeIndicator } from './TrafficModeIndicator';
import type { TrafficData } from '@/hooks/useTrafficData';

interface TrafficDashboardProps {
  data: TrafficData;
}

export function TrafficDashboard({ data }: TrafficDashboardProps) {
  const tlLabels = {
    GREEN_NS: { label: '🟢 N↕S', hint: 'North–South green' },
    YELLOW_NS: { label: '🟡 N↕S', hint: 'North–South clearing' },
    GREEN_EW: { label: '🟢 E↔W', hint: 'East–West green' },
    YELLOW_EW: { label: '🟡 E↔W', hint: 'East–West clearing' },
  };
  const tl = tlLabels[data.tlState];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 40, y: 20 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 120 }}
        className="glass-card glow-cyan fixed bottom-5 right-5 z-50 flex flex-col gap-3"
        style={{ width: 340, padding: '16px 18px' }}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Live indicator */}
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: 7, height: 7, borderRadius: '50%',
                background: '#38bdf8',
                boxShadow: '0 0 6px #38bdf8',
                flexShrink: 0,
              }}
            />
            <span className="text-xs font-bold tracking-widest text-cyan-400/90">SUMO TRAFFIC MONITOR</span>
          </div>
          <span className="text-xs text-slate-500 font-mono">LIVE</span>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(56,189,248,0.15)' }} />

        {/* Traffic light state row */}
        <motion.div
          key={data.tlState}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between rounded-lg px-3 py-2"
          style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.14)' }}
        >
          <div>
            <p className="text-xs text-slate-500 tracking-widest">SIGNAL · J9</p>
            <p className="text-sm font-semibold text-slate-200 mt-0.5">{tl.hint}</p>
          </div>
          <motion.span
            key={data.tlState}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-sm font-bold px-2 py-1 rounded-md"
            style={{ background: 'rgba(56,189,248,0.12)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.25)' }}
          >
            {tl.label}
          </motion.span>
        </motion.div>

        {/* Lane density chart */}
        <LaneDensityChart lanes={data.lanes} />

        {/* Traffic mode indicator */}
        <TrafficModeIndicator mode={data.trafficMode} simTime={data.simTime} />

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-slate-600">traffic.sumocfg · J9 intersection</span>
          <motion.span
            key={data.timestamp}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs font-mono text-slate-600"
          >
            {new Date(data.timestamp).toLocaleTimeString()}
          </motion.span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
