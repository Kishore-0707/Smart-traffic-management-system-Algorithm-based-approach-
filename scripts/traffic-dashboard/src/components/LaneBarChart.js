import React from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

function LaneBarChart({ laneData }) {
  const lanes = [
    { key: "E4", label: "North", count: laneData.E4 || 0, color: "#00ffff" },
    { key: "E3", label: "East", count: laneData.E3 || 0, color: "#f97316" },
    { key: "E1", label: "West", count: laneData.E1 || 0, color: "#facc15" },
    { key: "E2", label: "South", count: laneData.E2 || 0, color: "#ff0000" }
  ];

  const laneCounts = lanes.map((lane) => lane.count);

  const data = {
    labels: lanes.map((lane) => lane.label),
    datasets: [
      {
        label: "Vehicle Count",
        data: laneCounts,
        backgroundColor: lanes.map((lane) => lane.color),
        borderRadius: 12,
        borderSkipped: false,
        maxBarThickness: 48
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: "#0f172acc",
        titleColor: "#f8fafc",
        bodyColor: "#e2e8f0",
        padding: 12
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: "#cbd5e1",
          font: {
            size: 13,
            weight: "600"
          }
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(148, 163, 184, 0.16)"
        },
        ticks: {
          color: "#94a3b8",
          precision: 0
        }
      }
    }
  };

  return (
    <div className="chart-card">
      <div className="panel-heading">
        <div>
          <p className="panel-kicker">Traffic Analysis</p>
          <h2>Vehicle Count by Lane</h2>
        </div>

        <div className="chart-total">
          <span>Total Vehicles</span>
          <strong>{laneCounts.reduce((sum, value) => sum + value, 0)}</strong>
        </div>
      </div>

      <div className="chart-wrap">
        <Bar data={data} options={options} />
      </div>

      <div className="lane-summary-grid">
        {lanes.map((lane) => (
          <div key={lane.key} className="lane-summary-card">
            <span>{lane.label}</span>
            <strong>{lane.count}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LaneBarChart;
