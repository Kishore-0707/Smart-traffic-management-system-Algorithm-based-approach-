import traci

def calculate_vehicle_count(edges) :
    lane_data = {}
    for edge, lanes in edges.items():

        vehicle_count = sum(
            traci.lane.getLastStepVehicleNumber(l) for l in lanes
        )

        lane_data[edge] = vehicle_count
        
    return lane_data