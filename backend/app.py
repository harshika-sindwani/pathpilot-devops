
import os
import time

from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from sqlalchemy import text

from models import db, JobApplication


# Load environment variables
load_dotenv(
    os.path.join(
        os.path.dirname(__file__),
        "..",
        ".env"
    )
)

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not configured")


# Initialize Flask application
app = Flask(__name__)

app.config["SQLALCHEMY_DATABASE_URI"] = DATABASE_URL
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

CORS(app)
db.init_app(app)


# Initialize database with retry logic
def initialize_database(max_retries=10, delay=5):

    with app.app_context():

        for attempt in range(1, max_retries + 1):

            try:
                db.session.execute(text("SELECT 1"))
                db.create_all()

                app.logger.info(
                    "Database initialized successfully"
                )

                return

            except Exception:
                db.session.rollback()

                app.logger.warning(
                    "Database not ready. Attempt %s/%s",
                    attempt,
                    max_retries
                )

                if attempt == max_retries:
                    raise

                time.sleep(delay)


VALID_STATUSES = {
    "Applied",
    "Assessment",
    "Interview",
    "Offered",
    "Rejected",
    "Withdrawn"
}


# Home route
@app.route("/")
def home():

    return jsonify({
        "project": "Cloud-Native Placement Tracker",
        "message": "Placement Tracker API is running!",
        "version": "1.0.0"
    })


# Liveness check
@app.route("/health")
def health():

    return jsonify({
        "status": "healthy"
    }), 200


# Readiness check
@app.route("/ready")
def ready():

    try:
        db.session.execute(text("SELECT 1"))

        return jsonify({
            "status": "ready",
            "database": "connected"
        }), 200

    except Exception:
        db.session.rollback()

        app.logger.exception(
            "Database readiness check failed"
        )

        return jsonify({
            "status": "not_ready",
            "database": "unavailable"
        }), 503


# Create application
@app.route("/api/v1/applications", methods=["POST"])
def create_application():

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "error": "A JSON object is required"
        }), 400

    company = data.get("company")
    role = data.get("role")
    status = data.get("status", "Applied")

    if not isinstance(company, str) or not company.strip():
        return jsonify({
            "error": "Company is required"
        }), 400

    if not isinstance(role, str) or not role.strip():
        return jsonify({
            "error": "Role is required"
        }), 400

    if not isinstance(status, str) or status not in VALID_STATUSES:
        return jsonify({
            "error": "Invalid application status"
        }), 400

    application = JobApplication(
        company=company.strip(),
        role=role.strip(),
        status=status,
        job_url=data.get("job_url"),
        notes=data.get("notes")
    )

    db.session.add(application)
    db.session.commit()

    return jsonify(application.to_dict()), 201


# Get all applications
@app.route("/api/v1/applications", methods=["GET"])
def get_applications():

    applications = JobApplication.query.order_by(
        JobApplication.created_at.desc()
    ).all()

    return jsonify([
        application.to_dict()
        for application in applications
    ]), 200


# Get application by ID
@app.route("/api/v1/applications/<int:application_id>", methods=["GET"])
def get_application(application_id):

    application = db.session.get(
        JobApplication,
        application_id
    )

    if application is None:
        return jsonify({
            "error": "Application not found"
        }), 404

    return jsonify(application.to_dict()), 200


# Update application
@app.route("/api/v1/applications/<int:application_id>", methods=["PUT"])
def update_application(application_id):

    application = db.session.get(
        JobApplication,
        application_id
    )

    if application is None:
        return jsonify({
            "error": "Application not found"
        }), 404

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "error": "A JSON object is required"
        }), 400

    for field in ("company", "role"):

        if field in data:

            value = data[field]

            if not isinstance(value, str) or not value.strip():
                return jsonify({
                    "error": f"{field} must be a non-empty string"
                }), 400

            setattr(application, field, value.strip())

    if "status" in data:

        status = data["status"]

        if not isinstance(status, str) or status not in VALID_STATUSES:
            return jsonify({
                "error": "Invalid application status"
            }), 400

        application.status = status

    for field in ("job_url", "notes"):

        if field in data:

            value = data[field]

            if value is not None and not isinstance(value, str):
                return jsonify({
                    "error": f"{field} must be a string or null"
                }), 400

            setattr(application, field, value)

    db.session.commit()

    return jsonify(application.to_dict()), 200


# Delete application
@app.route("/api/v1/applications/<int:application_id>", methods=["DELETE"])
def delete_application(application_id):

    application = db.session.get(
        JobApplication,
        application_id
    )

    if application is None:
        return jsonify({
            "error": "Application not found"
        }), 404

    db.session.delete(application)
    db.session.commit()

    return "", 204


# Dashboard statistics
@app.route("/api/v1/dashboard", methods=["GET"])
def dashboard():

    applications = JobApplication.query.all()

    summary = {
        "total_applications": len(applications),
        "applied": 0,
        "assessments": 0,
        "interviews": 0,
        "offers": 0,
        "rejections": 0
    }

    for application in applications:

        if application.status == "Applied":
            summary["applied"] += 1

        elif application.status == "Assessment":
            summary["assessments"] += 1

        elif application.status == "Interview":
            summary["interviews"] += 1

        elif application.status == "Offered":
            summary["offers"] += 1

        elif application.status == "Rejected":
            summary["rejections"] += 1

    return jsonify(summary), 200


# Local development entry point
if __name__ == "__main__":

    initialize_database()

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )