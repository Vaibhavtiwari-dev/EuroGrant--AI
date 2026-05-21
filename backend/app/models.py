from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Enum, Text, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from .database import Base

class RoleEnum(str, enum.Enum):
    ADMIN = "admin"
    WRITER = "writer"
    VIEWER = "viewer"

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    subscription_tier = Column(String, default="growth") # growth, scale, agency
    sector = Column(String)
    headcount_range = Column(String)
    revenue_tier = Column(String)
    legal_entity_type = Column(String)
    countries_of_operation = Column(Text) # JSON string
    core_technologies = Column(Text) # JSON string
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    users = relationship("User", back_populates="organization")
    proposals = relationship("Proposal", back_populates="organization")
    documents = relationship("CompanyDocument", back_populates="organization")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    is_active = Column(Boolean, default=True)
    role = Column(Enum(RoleEnum), default=RoleEnum.VIEWER)
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    organization = relationship("Organization", back_populates="users")

class Grant(Base):
    __tablename__ = "grants"

    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String, unique=True, index=True) # ID from the portal
    title = Column(String, index=True)
    description = Column(Text)
    deadline = Column(DateTime)
    funding_range = Column(String)
    eligibility_criteria = Column(Text)
    scoring_rubric = Column(Text)
    source_url = Column(String)
    sector_tags = Column(Text) # JSON string array
    created_at = Column(DateTime(timezone=True), server_default=func.now())

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

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    file_name = Column(String)
    s3_key = Column(String)
    content_type = Column(String)
    status = Column(Enum(DocumentStatus), default=DocumentStatus.PENDING)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    organization = relationship("Organization", back_populates="documents")

class Proposal(Base):
    __tablename__ = "proposals"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    grant_id = Column(Integer, ForeignKey("grants.id"))
    status = Column(Enum(ProposalStatus), default=ProposalStatus.PENDING)
    content = Column(Text) # The generated proposal text/markdown
    compatibility_score = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    organization = relationship("Organization", back_populates="proposals")
    grant = relationship("Grant")
