import traci
from calculate import calculate_vehicle_count
from apiCalling import send_to_server


# Change the name of the road like north east west south
# Change the color of the vehicle to a particular lane like north entering vehicles should be in single color

def run_adaptive_signal(
    traffic_light_id,
    threshold=20,
    base_green=10,
    factor=0.5,
    max_green=40,
    balance_margin=10
):
    mode = ""

    edges = {
        "E1": ["E1_0", "E1_1", "E1_2"],
        "E2": ["E2_0", "E2_1", "E2_2"],
        "E3": ["E3_0", "E3_1", "E3_2"],
        "E4": ["E4_0", "E4_1", "E4_2"],
    }
    # ---------------------------
    # Step 1: Read vehicle counts
    # ---------------------------

    lane_data = calculate_vehicle_count(edges)

    print("Lane Data:", lane_data)

    # lane data -> Flask api

    counts = list(lane_data.values())

    priority_lane = None
    simulation_time = traci.simulation.getTime()

    phase0 = lane_data["E2"] + lane_data["E4"]
    phase2 = lane_data["E1"] + lane_data["E3"]

    # ---------------------------
    # NORMAL TRAFFIC
    # ---------------------------

    if all(c < threshold for c in counts):

        print("Mode: NORMAL TRAFFIC")
        mode = "NORMAL TRAFFIC"
        priority_lane = "None"

        # Send the decision immediately so the dashboard does not trail the simulation.
        send_to_server(lane_data, mode, priority_lane, simulation_time)

        for phase in [0, 2]:

            traci.trafficlight.setPhase(traffic_light_id, phase)

            for _ in range(base_green):
                traci.simulationStep()

    # ---------------------------
    # BALANCED TRAFFIC
    # ---------------------------

    elif abs(phase0 - phase2) < balance_margin:

        print("Mode: BALANCED TRAFFIC")

        mode = "BALANCED TRAFFIC"
        priority_lane = "None"

        # Send the decision immediately so the dashboard does not trail the simulation.
        send_to_server(lane_data, mode, priority_lane, simulation_time)

        for phase in [0, 2]:

            traci.trafficlight.setPhase(traffic_light_id, phase)

            for _ in range(base_green):
                traci.simulationStep()

    # ---------------------------
    # CONGESTION TRAFFIC
    # ---------------------------

    else:

        print("Mode: CONGESTION TRAFFIC")
        mode = "CONGESTION TRAFFIC"

        phase_load = {
            0: phase0,
            2: phase2
        }

        selected_phase = max(phase_load, key=phase_load.get)

        if selected_phase == 0:
            priority_lane = "E2_E4"
        else:
            priority_lane = "E1_E3"

        # Send the decision immediately so the dashboard does not trail the simulation.
        send_to_server(lane_data, mode, priority_lane, simulation_time)

        vehicle_count = phase_load[selected_phase]

        green_time = min(
            base_green + int(vehicle_count * factor),
            max_green
        )

        print(f"Priority phase -> {selected_phase} ({vehicle_count})")

        traci.trafficlight.setPhase(traffic_light_id, selected_phase)

        for _ in range(green_time):
            traci.simulationStep()
