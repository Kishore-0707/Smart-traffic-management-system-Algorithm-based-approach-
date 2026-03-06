import random
from itertools import count
import traci

# -------------------------------------------------
# VEHICLE ID GENERATOR
# -------------------------------------------------

_VEHICLE_SEQ = count()

def _next_vehicle_id(lane_id):
    return f"veh_{lane_id}_{next(_VEHICLE_SEQ)}"


# -------------------------------------------------
# ADD VEHICLE TO LANE
# -------------------------------------------------

def add_vehicle_to_lane(lane_id, route_id):

    vehicle_types = ["car", "bus", "bike", "truck"]

    vehicle_colors = {
        "car": (0, 0, 255),
        "bus": (255, 0, 0),
        "bike": (0, 255, 0),
        "truck": (255, 165, 0),
    }

    vehicle_id = _next_vehicle_id(lane_id)

    vehicle_type = random.choice(vehicle_types)

    lane_index = lane_id.split("_")[1]

    try:

        traci.vehicle.add(
            vehID=vehicle_id,
            routeID=route_id,
            typeID=vehicle_type,
            departLane=lane_index,
            departSpeed="max",
        )

        # prevent lane changes
        traci.vehicle.setLaneChangeMode(vehicle_id, 0)

        # assign color
        traci.vehicle.setColor(vehicle_id, vehicle_colors[vehicle_type])

    except traci.TraCIException as e:
        print(f"ERROR adding vehicle {vehicle_id}: {e}")


# -------------------------------------------------
# GENERATE USER REQUEST VEHICLES
# -------------------------------------------------

def generate_user_defined_vehicles(vehicle_requests):

    for request in vehicle_requests:

        lane_id = request["lane_id"]
        route_id = request["route_id"]
        count_value = int(request.get("count", 1))

        for _ in range(max(0, count_value)):
            add_vehicle_to_lane(lane_id, route_id)


# -------------------------------------------------
# SCENARIO BASED TRAFFIC
# -------------------------------------------------

def generate_scenario_traffic(lane_to_routes, scenario):

    requests = []

    for lane_id, routes in lane_to_routes.items():

        edge = lane_id.split("_")[0]

        vehicle_count = scenario.get(edge, 0)

        route_id = random.choice(routes)

        requests.append(
            {
                "lane_id": lane_id,
                "route_id": route_id,
                "count": vehicle_count,
            }
        )

    generate_user_defined_vehicles(requests)


# -------------------------------------------------
# COUNT VEHICLES PER LANE
# -------------------------------------------------

def count_vehicles_per_lane(lane_ids, current_step, interval=10, history=None):

    if history is None:
        history = []

    if current_step % interval != 0:
        return history

    for lane_id in lane_ids:

        try:
            vehicle_count = traci.lane.getLastStepVehicleNumber(lane_id)
        except traci.TraCIException:
            vehicle_count = 0

        history.append(
            {
                "step": current_step,
                "lane_id": lane_id,
                "vehicle_count": vehicle_count,
            }
        )

    return history


# -------------------------------------------------
# TOTAL VEHICLE COUNT (FOR ADAPTIVE GENERATION)
# -------------------------------------------------

def get_total_vehicle_count(lane_ids):

    total = 0

    for lane in lane_ids:
        try:
            total += traci.lane.getLastStepVehicleNumber(lane)
        except traci.TraCIException:
            pass

    return total


# -------------------------------------------------
# ADAPTIVE TRAFFIC GENERATION RATE
# -------------------------------------------------

def adaptive_vehicle_generation(step, lane_ids, lane_to_routes, scenario):

    total_vehicles = sum(
        traci.lane.getLastStepVehicleNumber(l) for l in lane_ids
    )

    # Lower generation pressure as congestion grows.
    if total_vehicles < 20:
        injection_rate = 3
        batch_size = 3
    elif total_vehicles < 40:
        injection_rate = 5
        batch_size = 2
    elif total_vehicles < 70:
        injection_rate = 8
        batch_size = 1
    else:
        injection_rate = 12
        batch_size = 0

    if batch_size == 0 or step % injection_rate != 0:
        return

    available_lanes = list(lane_to_routes.keys())
    chosen_lanes = random.sample(
        available_lanes,
        k=min(batch_size, len(available_lanes))
    )

    requests = []
    for lane_id in chosen_lanes:
        route_id = lane_to_routes[lane_id][0]
        requests.append({
            "lane_id": lane_id,
            "route_id": route_id,
            "count": 1
        })

    generate_user_defined_vehicles(requests)
