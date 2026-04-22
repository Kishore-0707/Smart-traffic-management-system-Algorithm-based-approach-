import React from "react";

function IntersectionView({ laneData }) {
  const lanes = [
    { key: "E1", label: "West Lane", direction: "N", count: laneData.E1 || 0, position: "lane-badge-left" },
    { key: "E2", label: "South Lane", direction: "W", count: laneData.E2 || 0, position: "lane-badge-bottom" },
    { key: "E3", label: "East Lane", direction: "S", count: laneData.E3 || 0, position: "lane-badge-right" },
    { key: "E4", label: "North Lane", direction: "E", count: laneData.E4 || 0, position: "lane-badge-top" }
  ];

  return (
    <div className="intersection-card">
      <div className="panel-heading">
        <div>
          <p className="panel-kicker">Intersection View</p>
          <h2>Lane Activity Map</h2>
        </div>
      </div>

      <div className="intersection-stage">
        <div className="compass">
          <span className="compass-north">N</span>
          <span className="compass-east">E</span>
          <span className="compass-south">S</span>
          <span className="compass-west">W</span>
          <div className="compass-needle" />
        </div>

        <div className="road road-vertical" />
        <div className="road road-horizontal" />
        <div className="intersection-core" />

        {lanes.map((lane) => (
          <div key={lane.key} className={`lane-badge ${lane.position}`}>
            <span className="lane-key">{lane.key}</span>
            <strong>{lane.count}</strong>
            <span className="lane-label">{lane.label}</span>
            <span className="lane-direction">{lane.direction}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default IntersectionView;
