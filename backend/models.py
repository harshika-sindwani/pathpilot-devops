from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timezone

db = SQLAlchemy()


class JobApplication(db.Model):
    __tablename__ = "job_applications"

    id = db.Column(db.Integer, primary_key=True)

    company = db.Column(
        db.String(150),
        nullable=False
    )

    role = db.Column(
        db.String(150),
        nullable=False
    )

    status = db.Column(
        db.String(30),
        nullable=False,
        default="Applied"
    )

    application_date = db.Column(
        db.Date,
        nullable=False,
        default=lambda: datetime.now(timezone.utc).date()
    )

    job_url = db.Column(
        db.String(500),
        nullable=True
    )

    notes = db.Column(
        db.Text,
        nullable=True
    )

    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc)
    )

    def to_dict(self):
        return {
            "id": self.id,
            "company": self.company,
            "role": self.role,
            "status": self.status,
            "application_date": self.application_date.isoformat(),
            "job_url": self.job_url,
            "notes": self.notes,
            "created_at": self.created_at.isoformat()
        }
