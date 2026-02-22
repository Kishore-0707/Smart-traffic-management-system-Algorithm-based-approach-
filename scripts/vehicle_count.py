import traci


def get_lane_statistics(edge_ids):
    stats = {}
    for edge in edge_ids:
        edge_total = 0
        edge_waiting = 0
        for lane_idx in range(4):
            lane_id = f"{edge}_{lane_idx}"
            try:
                total = traci.lane.getLastStepVehicleNumber(lane_id)
                waiting = traci.lane.getWaitingNumber(lane_id)
                stats[lane_id] = {"total": total, "waiting": waiting}
                edge_total += total
                edge_waiting += waiting
            except traci.TraCIException:
                stats[lane_id] = {"total": 0, "waiting": 0}

        stats[f"{edge}_summary"] = {"total": edge_total, "waiting": edge_waiting}

    return stats
