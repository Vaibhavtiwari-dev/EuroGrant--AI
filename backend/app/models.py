from sqlalchemy import String, Boolean, ForeignKey, DateTime, Enum, Text, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
import enum
from datetime import datetime
from typing import List, Optional
from .database import Base

class RoleEnum(str, enum.Enum):
    ADMIN = "admin"
    WRITER = "writer"
    VIEWER = "viewer"

class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    subscription_tier: Mapped[str] = mapped_column(String(50), default="growth")
    sector: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    headcount_range: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    revenue_tier: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    legal_entity_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    countries_of_operation: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # JSON string
    core_technologies: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # JSON string
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    users: Mapped[List["User"]] = relationship(back_populates="organization")
    proposals: Mapped[List["Proposal"]] = relationship(back_populates="organization")
    documents: Mapped[List["CompanyDocument"]] = relationship(back_populates="organization")

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    role: Mapped[RoleEnum] = mapped_column(Enum(RoleEnum), default=RoleEnum.VIEWER)
    organization_id: Mapped[Optional[int]] = mapped_column(ForeignKey("organizations.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    organization: Mapped[Optional["Organization"]] = relationship(back_populates="users")

class Grant(Base):
    __tablename__ = "grants"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    external_id: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(255), index=True)
    description: Mapped[str] = mapped_column(Text)
    deadline: Mapped[datetime] = mapped_column(DateTime)
    funding_range: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    eligibility_criteria: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    scoring_rubric: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    sector_tags: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # JSON string array
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class ProposalStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class DocumentStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSED = "processed"
    FAILED = "failed"

class CompanyDocument(Base):
    __tablename__ = "company_documents"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"))
    file_name: Mapped[str] = mapped_column(String(255))
    s3_key: Mapped[str] = mapped_column(String(500))
    content_type: Mapped[str] = mapped_column(String(100))
    status: Mapped[DocumentStatus] = mapped_column(Enum(DocumentStatus), default=DocumentStatus.PENDING)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    organization: Mapped["Organization"] = relationship(back_populates="documents")

class Proposal(Base):
    __tablename__ = "proposals"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"))
    grant_id: Mapped[int] = mapped_column(ForeignKey("grants.id"))
    status: Mapped[ProposalStatus] = mapped_column(Enum(ProposalStatus), default=ProposalStatus.PENDING)
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    compatibility_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    organization: Mapped["Organization"] = relationship(back_populates="proposals")
    grant: Mapped["Grant"] = relationship()
