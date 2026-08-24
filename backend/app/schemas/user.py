from __future__ import annotations

import re

from pydantic import BaseModel, computed_field, ConfigDict, Field, field_validator

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

ROLE_LEADER = "leader"
ROLE_ORGANIZER = "organizer"
ROLE_ADMIN = "admin"


class UserBase(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    full_name: str = Field(min_length=2, max_length=120)

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, value: str) -> str:
        value = value.strip().lower()
        if not EMAIL_RE.match(value):
            raise ValueError("enter a valid email address")
        return value


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1, max_length=128)


class RefreshRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    is_active: bool
    is_admin: bool
    role: str

    # Pulled from the ORM but never serialized; used only to derive the
    # must-change-password flag below.
    hashed_password: str = Field(repr=False, exclude=True)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def must_change_password(self) -> bool:
        """True while the account still uses the provisioned demo password."""
        from app.core.security import DEMO_PASSWORD, verify_password

        return verify_password(DEMO_PASSWORD, self.hashed_password)


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserRead