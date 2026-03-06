import traci


def run_adaptive_signal(
    traffic_light_id,
    threshold=20,
    base_green=10,
    factor=0.5,
    max_green=40
):

    # Two green phases in this intersection
    edge_to_phase = {
        "E1": 0,
        "E2": 2,
        "E3": 0,
        "E4": 2,
    }

    edges = {
        "E1": ["E1_0", "E1_1", "E1_2"],
        "E2": ["E2_0", "E2_1", "E2_2"],
        "E3": ["E3_0", "E3_1", "E3_2"],
        "E4": ["E4_0", "E4_1", "E4_2"],
    }

    lane_data = {}

    # -------------------------------------
    # Step 1: Read sensor data
    # -------------------------------------

    for edge, lanes in edges.items():

        vehicle_count = sum(
            traci.lane.getLastStepVehicleNumber(l) for l in lanes
        )

        lane_data[edge] = vehicle_count

    print("Lane Data:", lane_data)

    counts = list(lane_data.values())

    # -------------------------------------
    # Step 2: Check congestion threshold
    # -------------------------------------

    if all(c < threshold for c in counts):

        print("Mode: NORMAL TRAFFIC")

        # Sequential signal rotation
        for phase in [0, 2]:

            traci.trafficlight.setPhase(traffic_light_id, phase)

            for _ in range(base_green):
                traci.simulationStep()

    # CONGESTION MODE
    else:

        # -------------------------------------
        # CONGESTION MODE
        # -------------------------------------
        print("Mode: CONGESTION TRAFFIC")

        phase_load = {
            0: lane_data["E2"] + lane_data["E4"],
            2: lane_data["E1"] + lane_data["E3"]
        }

        selected_phase = max(phase_load, key=phase_load.get)

        vehicle_count = phase_load[selected_phase]

        green_time = min(
            base_green + int(vehicle_count * factor),
            max_green
        )

        print(f"Priority phase -> {selected_phase} ({vehicle_count})")

        traci.trafficlight.setPhase(traffic_light_id, selected_phase)

        for _ in range(green_time):
            traci.simulationStep()