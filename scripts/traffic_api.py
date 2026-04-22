from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, timezone

app = Flask(__name__)
CORS(app)

traffic_data = {}   # store latest traffic data

@app.route("/")
def home():
    return "Traffic API Running"


@app.route("/traffic", methods=["GET", "POST"])
def traffic():

    global traffic_data

    # SUMO sends data
    if request.method == "POST":

        traffic_data = request.json
        traffic_data["server_received_at"] = datetime.now(timezone.utc).isoformat()

        lane_data = traffic_data.get("lane_data")
        mode = traffic_data.get("mode")
        priority_lane = traffic_data.get("priority_lane")

        print("Lane Data:", lane_data)
        print("Mode:", mode)
        print("Priority Lane:", priority_lane)

        return jsonify({"status": "received"})

    # React dashboard reads data
    if request.method == "GET":
        return jsonify(traffic_data)


if __name__ == "__main__":
    app.run(port=5000, debug=True)
