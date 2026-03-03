import random
from itertools import count

import traci

_VEHICLE_SEQ = count()


def _next_vehicle_id(lane_id):
    return f"veh_{lane_id}_{next(_VEHICLE_SEQ)}"


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
        traci.vehicle.setLaneChangeMode(vehicle_id, 0)
        traci.vehicle.setColor(vehicle_id, vehicle_colors[vehicle_type])
        
    except traci.TraCIException as e:
        print(f"ERROR adding vehicle {vehicle_id}: {e}")
        print("Loaded vehicle types:", traci.vehicletype.getIDList())


def fill_lane(lane_id, route_id, vehicle_count):
    for _ in range(vehicle_count):
        add_vehicle_to_lane(lane_id, route_id)


def generate_user_defined_vehicles(vehicle_requests):
    valid_types = {"car", "bus", "bike", "truck"}
    color_by_type = {
        "car": (0, 0, 255),
        "bus": (255, 0, 0),
        "bike": (0, 255, 0),
        "truck": (255, 165, 0),
    }

    for request in vehicle_requests:
        lane_id = request["lane_id"]
        route_id = request["route_id"]
        count = int(request.get("count", 1))
        vehicle_type = request.get("vehicle_type")

        if vehicle_type is not None and vehicle_type not in valid_types:
            raise ValueError(
                f"Invalid vehicle_type '{vehicle_type}' for lane {lane_id}. "
                f"Allowed values: {sorted(valid_types)}"
            )

        for _ in range(max(0, count)):
            if vehicle_type is None:
                add_vehicle_to_lane(lane_id, route_id)
                continue

            vehicle_id = _next_vehicle_id(lane_id)
            lane_index = lane_id.split("_")[1]

            try:
                traci.vehicle.add(
                    vehID=vehicle_id,
                    routeID=route_id,
                    typeID=vehicle_type,
                    departLane=lane_index,
                    departSpeed="max",
                )
                traci.vehicle.setLaneChangeMode(vehicle_id, 0)
                traci.vehicle.setColor(vehicle_id, color_by_type[vehicle_type])
            except traci.TraCIException as e:
                print(f"ERROR adding vehicle {vehicle_id}: {e}")


def count_vehicles_per_lane(lane_ids, current_step, interval=10, history=None):
    if history is None:
        history = []

    if interval <= 0:
        raise ValueError("interval must be > 0")

    if current_step % interval != 0:
        return history

    for lane_id in lane_ids:
        try:
            count_value = traci.lane.getLastStepVehicleNumber(lane_id)
        except traci.TraCIException:
            count_value = 0

        history.append(
            {"step": current_step, "lane_id": lane_id, "vehicle_count": count_value}
        )

    return history
