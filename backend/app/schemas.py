from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    idea: str = Field(min_length=10, max_length=5000)
    project_type: str = Field(default="AI product", max_length=40)
    goal: str = Field(default="Production plan", max_length=40)


class ProjectRead(ProjectCreate):
    model_config = ConfigDict(from_attributes=True)

    id: str
    status: str
    readiness: int
    created_at: datetime
    updated_at: datetime


class RunRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    status: str
    current_agent: Optional[str]
    error: Optional[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime


class ProductBrief(BaseModel):
    product_definition: str
    problem: str
    target_users: List[str] = Field(min_length=1, max_length=5)
    value_proposition: str
    mvp_features: List[str] = Field(min_length=3, max_length=8)
    non_goals: List[str] = Field(min_length=1, max_length=6)
    assumptions: List[str] = Field(min_length=1, max_length=6)
    success_metrics: List[str] = Field(min_length=2, max_length=6)


class ArtifactVersionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    version: int
    content: dict
    generated_by: str
    revision_instructions: Optional[str]
    created_at: datetime


class ArtifactRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    run_id: Optional[str]
    artifact_type: str
    title: str
    status: str
    current_version: int
    created_at: datetime
    updated_at: datetime
    versions: List[ArtifactVersionRead] = []


class RevisionRequest(BaseModel):
    instructions: str = Field(min_length=3, max_length=2000)


class ApprovalRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    artifact_id: str
    artifact_version: int
    action: str
    instructions: Optional[str]
    created_at: datetime


class HealthRead(BaseModel):
    status: str
    database: str
    agent_provider: str
