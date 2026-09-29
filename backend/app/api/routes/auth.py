"""Authentication and OTP verification endpoints."""
from datetime import UTC, datetime
import logging
import random
from typing import Literal
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

# In-memory store for active OTP codes: identifier -> {code, expires_at}
OTP_STORE: dict[str, dict[str, object]] = {}


class SendOtpRequest(BaseModel):
    identifier: str = Field(..., description="Mobile number (e.g. +91 98765 43210) or Email address")
    name: str | None = Field(None, description="User full name")


class VerifyOtpRequest(BaseModel):
    identifier: str = Field(..., description="Mobile number or Email address")
    code: str = Field(..., min_length=4, max_length=10, description="Verification code")
    password: str = Field(..., min_length=6, description="User password")
    name: str | None = Field(None, description="User full name")


def normalize_id(val: str) -> str:
    clean = val.strip().lower()
    if "@" in clean:
        return clean
    # strip spaces, dashes, brackets
    return "".join(c for c in clean if c.isalnum() or c == "+")


@router.post("/send-otp")
def send_otp(payload: SendOtpRequest):
    raw = payload.identifier.strip()
    if not raw or len(raw) < 4:
        raise HTTPException(status_code=400, detail={"code": "INVALID_IDENTIFIER", "message": "Please enter a valid mobile number or email address."})

    norm = normalize_id(raw)
    id_type: Literal["email", "phone"] = "email" if "@" in norm else "phone"

    # Generate 6-digit random code
    code = f"{random.randint(100000, 999999)}"
    expires_at = datetime.now(UTC).timestamp() + 600  # 10 minutes

    OTP_STORE[norm] = {
        "code": code,
        "expires_at": expires_at,
        "identifier": norm,
        "raw_identifier": raw,
        "id_type": id_type,
    }

    # Print prominent banner in server log for developer/user visibility
    print("\n" + "=" * 60)
    print(f" [MEMORA OTP DISPATCH] Verification code for {raw} ({id_type.upper()}):")
    print(f"   CODE: >>> {code} <<<  (Valid for 10 minutes)")
    print("=" * 60 + "\n")
    logger.info("Generated OTP for %s: %s", norm, code)

    return {
        "success": True,
        "data": {
            "identifier": raw,
            "normalized_identifier": norm,
            "identifier_type": id_type,
            "code": code,  # Returned for seamless local testing
            "expires_in_seconds": 600,
            "message": f"Verification code sent to {raw}",
        },
        "message": f"Verification code sent to {raw}",
        "timestamp": datetime.now(UTC).isoformat(),
    }


@router.post("/verify-otp")
def verify_otp(payload: VerifyOtpRequest):
    norm = normalize_id(payload.identifier)
    code = payload.code.strip()

    record = OTP_STORE.get(norm)
    now = datetime.now(UTC).timestamp()

    # Universal bypass code 123456 for effortless automated/demo verification
    is_master = code == "123456"

    if not is_master:
        if not record:
            raise HTTPException(status_code=400, detail={"code": "NO_OTP_FOUND", "message": "No verification code requested for this contact. Please request a new code."})
        if now > float(record["expires_at"]):
            raise HTTPException(status_code=400, detail={"code": "OTP_EXPIRED", "message": "Verification code has expired. Please request a new code."})
        if str(record["code"]).strip() != code:
            raise HTTPException(status_code=400, detail={"code": "INVALID_OTP", "message": "Incorrect verification code. Please check and try again (or use master code 123456)."})

    # Clean up OTP record on success
    OTP_STORE.pop(norm, None)

    return {
        "success": True,
        "data": {
            "verified": True,
            "identifier": payload.identifier,
            "name": payload.name or "User",
            "message": "Verification successful. Account is ready.",
        },
        "message": "Verification successful",
        "timestamp": datetime.now(UTC).isoformat(),
    }
