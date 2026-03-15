'use client';

import { SumoNetView } from '@/components/SumoNetView';
import { TrafficDashboard } from '@/components/TrafficDashboard';
import { useTrafficData } from '@/hooks/useTrafficData';

export default function Home() {
  const data = useTrafficData();

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#020810]">
      {/* SUMO network canvas — fetches + renders real traffic.net.xml */}
      <SumoNetView data={data} />

      {/* Subtle vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 40%, rgba(2,8,16,0.55) 100%)',
        }}
      />

      {/* Glass dashboard panel — fixed bottom-right */}
      <TrafficDashboard data={data} />
    </main>
  );
}
