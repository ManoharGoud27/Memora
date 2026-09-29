"""Unit tests for payment reminder logic."""
from datetime import date, timedelta
from decimal import Decimal
from uuid import uuid4
from app.api.routes.payments import build_payment_reminder


class MockPayment:
    def __init__(self, id, amount, due_date, status="pending", ptype="milestone", description="Design Phase", project=None):
        self.id = id
        self.amount = Decimal(str(amount))
        self.due_date = due_date
        self.status = status
        self.type = ptype
        self.description = description
        self.project = project


class MockProject:
    def __init__(self, name="Website Revamp", client=None):
        self.name = name
        self.client = client


class MockClient:
    def __init__(self, id, name="Rohan Sharma"):
        self.id = id
        self.name = name


def test_payment_reminder_overdue():
    today = date.today()
    client = MockClient(uuid4(), "Rohan Sharma")
    project = MockProject("E-commerce Store", client)
    payment = MockPayment(uuid4(), 25000, today - timedelta(days=3), project=project)

    reminder = build_payment_reminder(payment, today)
    assert reminder["urgency"] == "overdue"
    assert reminder["days_left"] == -3
    assert "Overdue by 3 days" in reminder["status_label"]
    assert "₹25,000" in reminder["message"]
    assert "Rohan" in reminder["reminder_draft"]


def test_payment_reminder_due_soon():
    today = date.today()
    client = MockClient(uuid4(), "Pooja Patel")
    project = MockProject("Brand Identity", client)
    payment = MockPayment(uuid4(), 15000, today + timedelta(days=2), project=project)

    reminder = build_payment_reminder(payment, today)
    assert reminder["urgency"] == "due_soon"
    assert reminder["days_left"] == 2
    assert "Due in 2 days" in reminder["status_label"]
    assert "₹15,000" in reminder["message"]
    assert "Brand Identity" in reminder["reminder_draft"]
