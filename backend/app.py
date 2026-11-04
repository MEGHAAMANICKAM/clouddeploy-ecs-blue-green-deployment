import logging
import os
from datetime import datetime, timezone
from flask import Flask, jsonify
from flask_cors import CORS

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger(__name__)

APP_VERSION = os.getenv("APP_VERSION", "1.0.0")
APP_ENV = os.getenv("APP_ENV", "production")

app = Flask(__name__)
CORS(app)

def now():
    return datetime.now(timezone.utc).isoformat()

@app.get("/health")
def health():
    return jsonify({"status": "ok", "service": "clouddeploy-api"})

@app.get("/api/health")
def api_health():
    return jsonify({"status": "healthy", "application": "CloudDeploy", "version": APP_VERSION, "environment": APP_ENV, "simulated": True})

@app.get("/api/version")
def version():
    return jsonify({"application": "CloudDeploy", "version": APP_VERSION, "environment": APP_ENV})

@app.get("/api/deployment")
def deployment():
    return jsonify({
        "strategy": "blue-green",
        "active_environment": "blue",
        "current_version": f"v{APP_VERSION}",
        "traffic": {"blue": 100, "green": 0},
        "updated_at": now(),
        "simulated": True,
    })

@app.get("/api/environments")
def environments():
    return jsonify({
        "blue": {"name": "BLUE", "version": "v1.0.0", "status": "active", "traffic": 100, "health": "healthy"},
        "green": {"name": "GREEN", "version": "v2.0.0", "status": "standby", "traffic": 0, "health": "ready"},
        "simulated": True,
    })

@app.get("/api/deployments/history")
def deployment_history():
    return jsonify({"deployments": [
        {"id": "dep-1048", "version": "v1.0.0", "environment": "Production", "strategy": "Blue-Green", "status": "Successful", "started_at": "2024-06-18T10:42:00Z", "completed_at": "2024-06-18T10:45:24Z", "duration": "3m 24s"},
        {"id": "dep-1047", "version": "v0.9.4", "environment": "Staging", "strategy": "Rolling", "status": "Successful", "started_at": "2024-06-17T15:10:00Z", "completed_at": "2024-06-17T15:12:41Z", "duration": "2m 41s"},
        {"id": "dep-1046", "version": "v0.9.3", "environment": "Production", "strategy": "Blue-Green", "status": "Rolled Back", "started_at": "2024-06-16T08:30:00Z", "completed_at": "2024-06-16T08:36:08Z", "duration": "6m 08s"},
    ], "simulated": True})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "8080")))
