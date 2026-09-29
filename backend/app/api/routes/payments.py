from datetime import UTC, date, datetime
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload
from app.api.deps import get_db
from app.models.payment import Payment
from app.models.project import Project
from app.schemas.payment import PaymentCreate, PaymentRead, PaymentUpdate

router = APIRouter(prefix="/payments", tags=["payments"])


def envelope(data: object, message: str) -> dict[str, object]:
    return {"success": True, "data": data, "message": message, "timestamp": datetime.now(UTC).isoformat()}


def build_payment_reminder(payment: Payment, today: date | None = None) -> dict[str, object]:
    if today is None:
        today = date.today()

    project = getattr(payment, "project", None)
    project_name = project.name if project else "Project"
    client = getattr(project, "client", None) if project else None
    client_name = client.name if client else "Client"
    client_id = str(client.id) if client and getattr(client, "id", None) else None

    amount_val = float(payment.amount)
    formatted_amount = f"₹{amount_val:,.0f}"

    if payment.due_date is None:
        return {
            "payment_id": str(payment.id),
            "project_name": project_name,
            "client_name": client_name,
            "client_id": client_id,
            "amount": amount_val,
            "currency": "INR",
            "formatted_amount": formatted_amount,
            "type": payment.type,
            "status": payment.status,
            "due_date": None,
            "days_left": None,
            "urgency": "no_date",
            "status_label": "No due date",
            "badge_color": "gray",
            "message": f"Payment of {formatted_amount} has no due date set.",
            "reminder_draft": "",
        }

    days_left = (payment.due_date - today).days
    due_date_str = payment.due_date.strftime("%d %b %Y")

    if days_left < 0:
        urgency = "overdue"
        status_label = f"Overdue by {abs(days_left)} day{'s' if abs(days_left) != 1 else ''}"
        badge_color = "red"
        message = f"Payment of {formatted_amount} for '{project_name}' is {status_label.lower()}!"
    elif days_left == 0:
        urgency = "due_today"
        status_label = "Due today"
        badge_color = "amber"
        message = f"Payment of {formatted_amount} for '{project_name}' is due today!"
    elif days_left <= 7:
        urgency = "due_soon"
        status_label = f"Due in {days_left} day{'s' if days_left != 1 else ''}"
        badge_color = "blue"
        message = f"Payment of {formatted_amount} for '{project_name}' is due in {days_left} days ({due_date_str})."
    else:
        urgency = "upcoming"
        status_label = f"Due in {days_left} days"
        badge_color = "gray"
        message = f"Payment of {formatted_amount} for '{project_name}' is due on {due_date_str}."

    reminder_draft = (
        f"Hi {client_name}, hope you're having a good week! "
        f"This is a gentle reminder regarding the {payment.type} payment of {formatted_amount} "
        f"for '{project_name}', which is {status_label.lower()} ({due_date_str}). "
        f"Please let me know once processed. Thank you!"
    )

    return {
        "payment_id": str(payment.id),
        "project_id": str(payment.project_id) if payment.project_id else None,
        "project_name": project_name,
        "client_name": client_name,
        "client_id": client_id,
        "amount": amount_val,
        "currency": "INR",
        "formatted_amount": formatted_amount,
        "type": payment.type,
        "status": payment.status,
        "due_date": payment.due_date.isoformat(),
        "days_left": days_left,
        "urgency": urgency,
        "status_label": status_label,
        "badge_color": badge_color,
        "message": message,
        "reminder_draft": reminder_draft,
    }


def lookup(db: Session, payment_id: UUID) -> Payment:
    payment = db.get(Payment, payment_id)
    if payment is None:
        raise HTTPException(404, detail={"code": "PAYMENT_NOT_FOUND", "message": f"Payment {payment_id} was not found", "details": {}})
    return payment


@router.get("/reminders")
def list_payment_reminders(db: Session = Depends(get_db)) -> dict[str, object]:
    """Retrieve payments that require attention (overdue, due today, or due within 7 days) in Indian currency."""
    today = date.today()
    query = (
        select(Payment)
        .options(joinedload(Payment.project).joinedload(Project.client))
        .where(Payment.status != "paid", Payment.due_date.is_not(None))
        .order_by(Payment.due_date.asc())
    )
    unpaid = list(db.scalars(query))
    reminders = [build_payment_reminder(p, today) for p in unpaid]

    overdue = [r for r in reminders if r["urgency"] == "overdue"]
    due_today = [r for r in reminders if r["urgency"] == "due_today"]
    due_soon = [r for r in reminders if r["urgency"] == "due_soon"]

    return envelope({
        "reminders": reminders,
        "urgent_count": len(overdue) + len(due_today) + len(due_soon),
        "overdue_count": len(overdue),
        "due_today_count": len(due_today),
        "due_soon_count": len(due_soon),
        "total_outstanding_inr": sum(float(p.amount) for p in unpaid),
    }, "Payment reminders calculated successfully")


@router.get("")
def list_payments(db: Session = Depends(get_db), project_id: UUID | None = None, status_filter: str | None = None, limit: int = Query(100, ge=1, le=500)) -> dict[str, object]:
    query = select(Payment).order_by(Payment.created_at.desc()).limit(limit)
    if project_id is not None: query = query.where(Payment.project_id == project_id)
    if status_filter is not None: query = query.where(Payment.status == status_filter)
    return envelope([PaymentRead.model_validate(row).model_dump(mode="json") for row in db.scalars(query)], "Payments retrieved")


@router.post("", status_code=status.HTTP_201_CREATED)
def create_payment(payload: PaymentCreate, db: Session = Depends(get_db)) -> dict[str, object]:
    payment = Payment(**payload.model_dump())
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return envelope(PaymentRead.model_validate(payment).model_dump(mode="json"), "Payment created")


@router.put("/{payment_id}")
def update_payment(payment_id: UUID, payload: PaymentUpdate, db: Session = Depends(get_db)) -> dict[str, object]:
    payment = lookup(db, payment_id)
    for key, value in payload.model_dump(exclude_unset=True).items(): setattr(payment, key, value)
    db.commit()
    db.refresh(payment)
    return envelope(PaymentRead.model_validate(payment).model_dump(mode="json"), "Payment updated")
