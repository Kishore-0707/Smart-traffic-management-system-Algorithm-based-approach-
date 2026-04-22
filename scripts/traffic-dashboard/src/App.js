import React, { useEffect, useState } from "react";
import IntersectionView from "./components/IntersectionView";
import LaneBarChart from "./components/LaneBarChart";
import SignalModeCard from "./components/SignalModeCard";
import { getTrafficData } from "./api";
import "./App.css";

function App() {
  const [trafficData, setTrafficData] = useState({
    lane_data: {},
    mode: "",
    priority_lane: "",
    simulation_time: null,
    server_received_at: ""
  });

  useEffect(() => {
    let isMounted = true;
    let timeoutId;

    const loadTrafficData = async () => {
      try {
        const data = await getTrafficData();

        if (isMounted) {
          setTrafficData((previous) => ({
            ...previous,
            ...data,
            lane_data: data?.lane_data || {}
          }));
        }
      } catch (error) {
        console.error("Failed to fetch traffic data", error);
      } finally {
        if (isMounted) {
          timeoutId = setTimeout(loadTrafficData, 400);
        }
      }
    };

    loadTrafficData();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <main className="dashboard-shell">
      <section className="dashboard-hero">
        <p className="dashboard-eyebrow">Live Junction Monitoring</p>
        <h1>Smart Traffic Dashboard</h1>
        <p className="dashboard-subtitle">
          A clearer view of lane pressure, direction flow, and vehicle load at the intersection.
        </p>
      </section>

      <SignalModeCard
        mode={trafficData.mode}
        priorityLane={trafficData.priority_lane}
        simulationTime={trafficData.simulation_time}
        serverReceivedAt={trafficData.server_received_at}
      />

      <section className="dashboard-grid">
        <div className="dashboard-panel">
          <IntersectionView laneData={trafficData.lane_data} />
        </div>

        <div className="dashboard-panel dashboard-panel-chart">
          <LaneBarChart laneData={trafficData.lane_data} />
        </div>
      </section>
    </main>
  );
}

export default App;
