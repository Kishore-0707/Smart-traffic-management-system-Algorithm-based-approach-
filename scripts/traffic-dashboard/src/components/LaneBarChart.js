import React from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement);

function LaneBarChart({ laneData }) {

  const data = {
    labels: ["E1", "E2", "E3", "E4"],
    datasets: [
      {
        label: "Vehicle Count",
        data: [
          laneData.E1 || 0,
          laneData.E2 || 0,
          laneData.E3 || 0,
          laneData.E4 || 0
        ]
      }
    ]
  };

  return (
    <div style={{width:"300px"}}>
      <Bar data={data}/>
    </div>
  );
}

export default LaneBarChart;