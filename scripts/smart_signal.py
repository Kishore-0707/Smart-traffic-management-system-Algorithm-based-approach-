import os

import sumolib
import traci

from generate import count_vehicles_per_lane, generate_user_defined_vehicles

print("SMART SIGNAL SCRIPT STARTED")

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUMO_CFG = os.path.join(PROJECT_ROOT, "traffic.sumocfg")
SUMO_BINARY = sumolib.checkBinary("sumo-gui")

MAX_STEPS = None
INJECT_EVERY_STEPS = 1
COUNT_INTERVAL = 10

lane_ids = [
    "E1_0", "E1_1", "E1_2",
    "E2_0", "E2_1", "E2_2",
    "E3_0", "E3_1", "E3_2",
    "E4_0", "E4_1", "E4_2",
]

route_defs = {
    "route_E1_to_mE2": ["E1", "-E2"],
    "route_E1_to_mE3": ["E1", "-E3"],
    "route_E1_to_mE4": ["E1", "-E4"],
    "route_E2_to_mE1": ["E2", "-E1"],
    "route_E2_to_mE3": ["E2", "-E3"],
    "route_E2_to_mE4": ["E2", "-E4"],
    "route_E3_to_mE1": ["E3", "-E1"],
    "route_E3_to_mE2": ["E3", "-E2"],
    "route_E3_to_mE4": ["E3", "-E4"],
    "route_E4_to_mE1": ["E4", "-E1"],
    "route_E4_to_mE2": ["E4", "-E2"],
    "route_E4_to_mE3": ["E4", "-E3"],
}

lane_to_routes = {
    "E1_0": ["route_E1_to_mE4"],
    "E1_1": ["route_E1_to_mE3"],
    "E1_2": ["route_E1_to_mE2"],
    "E2_0": ["route_E2_to_mE1"],
    "E2_1": ["route_E2_to_mE4"],
    "E2_2": ["route_E2_to_mE3"],
    "E3_0": ["route_E3_to_mE2"],
    "E3_1": ["route_E3_to_mE1"],
    "E3_2": ["route_E3_to_mE4"],
    "E4_0": ["route_E4_to_mE3"],
    "E4_1": ["route_E4_to_mE2"],
    "E4_2": ["route_E4_to_mE1"],
}


def ensure_routes_created():
    existing = set(traci.route.getIDList())
    for route_id, edges in route_defs.items():
        if route_id not in existing:
            traci.route.add(route_id, edges)


def build_continuous_requests():
    requests = []
    for lane_id, route_ids in lane_to_routes.items():
        for route_id in route_ids:
            requests.append(
                {
                    "lane_id": lane_id,
                    "route_id": route_id,
                    "count": 1,
                }
            )
    return requests


traci.start([SUMO_BINARY, "-c", SUMO_CFG])
print("Simulation loop started (Ctrl+C to stop)")

step = 0
lane_count_history = []

try:
    while MAX_STEPS is None or step < MAX_STEPS:
        traci.simulationStep()
        ensure_routes_created()

        if step % INJECT_EVERY_STEPS == 0:
            generate_user_defined_vehicles(build_continuous_requests())

        lane_count_history = count_vehicles_per_lane(
            lane_ids=lane_ids,
            current_step=step,
            interval=COUNT_INTERVAL,
            history=lane_count_history,
        )

        e1 = sum(traci.lane.getLastStepVehicleNumber(l) for l in ("E1_0", "E1_1", "E1_2"))
        e2 = sum(traci.lane.getLastStepVehicleNumber(l) for l in ("E2_0", "E2_1", "E2_2"))
        e3 = sum(traci.lane.getLastStepVehicleNumber(l) for l in ("E3_0", "E3_1", "E3_2"))
        e4 = sum(traci.lane.getLastStepVehicleNumber(l) for l in ("E4_0", "E4_1", "E4_2"))
        print(f"step={step} | E1={e1} E2={e2} E3={e3} E4={e4} | samples={len(lane_count_history)}")

        step += 1
except KeyboardInterrupt:
    print("Simulation stopped by user.")
finally:
    traci.close()
