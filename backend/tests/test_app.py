import os
import sys
import tempfile

import pytest

# Configure a temporary SQLite database before importing the app.
# This prevents tests from modifying your PostgreSQL database.
db_fd, db_path = tempfile.mkstemp(suffix=".db")
os.close(db_fd)

os.environ["DATABASE_URL"] = f"sqlite:///{db_path}"

sys.path.insert(
    0,
    os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
)

from app import app
from models import db


@pytest.fixture()
def client():
    app.config.update(
        TESTING=True,
        SQLALCHEMY_DATABASE_URI=f"sqlite:///{db_path}",
    )

    with app.app_context():
        db.drop_all()
        db.create_all()

    with app.test_client() as test_client:
        yield test_client

    with app.app_context():
        db.session.remove()
        db.drop_all()


def test_health_endpoint(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.get_json()["status"] == "healthy"


def test_create_application(client):
    response = client.post(
        "/api/v1/applications",
        json={
            "company": "Example Technologies",
            "role": "DevOps Engineer",
            "status": "Applied",
        },
    )

    assert response.status_code == 201

    data = response.get_json()
    assert data["company"] == "Example Technologies"
    assert data["role"] == "DevOps Engineer"
    assert data["status"] == "Applied"
    assert "id" in data


def test_create_application_requires_company(client):
    response = client.post(
        "/api/v1/applications",
        json={"role": "DevOps Engineer"},
    )

    assert response.status_code == 400
    assert response.get_json()["error"] == "Company is required"


def test_create_application_rejects_invalid_status(client):
    response = client.post(
        "/api/v1/applications",
        json={
            "company": "Example Technologies",
            "role": "DevOps Engineer",
            "status": "In Progress",
        },
    )

    assert response.status_code == 400


def test_get_applications(client):
    client.post(
        "/api/v1/applications",
        json={
            "company": "Example Technologies",
            "role": "DevOps Engineer",
        },
    )

    response = client.get("/api/v1/applications")

    assert response.status_code == 200

    applications = response.get_json()
    assert len(applications) == 1
    assert applications[0]["company"] == "Example Technologies"


def test_update_application_status(client):
    create_response = client.post(
        "/api/v1/applications",
        json={
            "company": "Example Technologies",
            "role": "DevOps Engineer",
        },
    )

    application_id = create_response.get_json()["id"]

    response = client.put(
        f"/api/v1/applications/{application_id}",
        json={"status": "Interview"},
    )

    assert response.status_code == 200
    assert response.get_json()["status"] == "Interview"


def test_delete_application(client):
    create_response = client.post(
        "/api/v1/applications",
        json={
            "company": "Example Technologies",
            "role": "DevOps Engineer",
        },
    )

    application_id = create_response.get_json()["id"]

    response = client.delete(
        f"/api/v1/applications/{application_id}"
    )

    assert response.status_code == 204

    get_response = client.get(
        f"/api/v1/applications/{application_id}"
    )

    assert get_response.status_code == 404


def test_dashboard_statistics(client):
    client.post(
        "/api/v1/applications",
        json={
            "company": "Company One",
            "role": "DevOps Engineer",
            "status": "Applied",
        },
    )

    client.post(
        "/api/v1/applications",
        json={
            "company": "Company Two",
            "role": "Cloud Engineer",
            "status": "Interview",
        },
    )

    response = client.get("/api/v1/dashboard")

    assert response.status_code == 200

    data = response.get_json()
    assert data["total_applications"] == 2
    assert data["applied"] == 1
    assert data["interviews"] == 1
