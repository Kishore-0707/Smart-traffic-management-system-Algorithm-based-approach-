import React from "react";

function formatModeLabel(mode) {
  if (!mode) {
    return "Waiting for live data";
  }

  return mode
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatPriorityLane(priorityLane) {
  if (!priorityLane || priorityLane === "None") {
    return "Balanced flow";
  }

  return priorityLane.replace("_", " + ");
}

function formatRelativeTime(timestamp) {
  if (!timestamp) {
    return "Not yet synced";
  }

  const parsed = new Date(timestamp);

  if (Number.isNaN(parsed.getTime())) {
    return "Not yet synced";
  }

  const elapsedMs = Date.now() - parsed.getTime();

  if (elapsedMs < 1000) {
    return "Just now";
  }

  return `${(elapsedMs / 1000).toFixed(1)}s ago`;
}

function SignalModeCard({ mode, priorityLane, simulationTime, serverReceivedAt }) {
  const normalizedMode = mode || "NO DATA";
  const modeClassName = normalizedMode.toLowerCase().replace(/\s+/g, "-");

  return (
    <section className={`signal-mode-card mode-${modeClassName}`}>
      <div className="panel-heading">
        <div>
          <p className="panel-kicker">Signal Status</p>
          <h2>Algorithm Mode</h2>
        </div>

        <div className="mode-pill">{formatModeLabel(mode)}</div>
      </div>

      <p className="mode-description">
        The controller is currently prioritizing <strong>{formatPriorityLane(priorityLane)}</strong>.
      </p>

      <div className="mode-metrics">
        <div className="mode-metric-card">
          <span>Priority</span>
          <strong>{formatPriorityLane(priorityLane)}</strong>
        </div>

        <div className="mode-metric-card">
          <span>Simulation Time</span>
          <strong>{simulationTime ?? "--"}s</strong>
        </div>

        <div className="mode-metric-card">
          <span>Last Update</span>
          <strong>{formatRelativeTime(serverReceivedAt)}</strong>
        </div>
      </div>
    </section>
  );
}

export default SignalModeCard;
