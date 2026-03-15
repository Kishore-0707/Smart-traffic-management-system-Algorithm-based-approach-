import requests

def send_to_server(lane_data, mode, priority_lane):

    url = "http://127.0.0.1:5000/traffic"

    payload = {
        "lane_data": lane_data,
        "mode": mode,
        "priority_lane": priority_lane
    }

    try:
        response = requests.post(url, json=payload)
        print("Sent to server:", response.status_code)

    except Exception as e:
        print("Server not reachable:", e)