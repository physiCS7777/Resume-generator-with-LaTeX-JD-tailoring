from typing import Any, List, Optional

from pydantic import BaseModel, Field


class Link(BaseModel):
    label: str = ""
    url: str = ""


class SkillGroup(BaseModel):
    category: str = ""
    items: List[str] = Field(default_factory=list)


class Experience(BaseModel):
    role: str = ""
    org: str = ""
    location: str = ""
    start: str = ""
    end: str = ""
    bullets: List[str] = Field(default_factory=list)


class Education(BaseModel):
    school: str = ""
    degree: str = ""
    location: str = ""
    dates: str = ""
    details: List[str] = Field(default_factory=list)


class Project(BaseModel):
    name: str = ""
    url: str = ""
    tech: str = ""
    bullets: List[str] = Field(default_factory=list)


class Profile(BaseModel):
    name: str = ""
    title: str = ""
    email: str = ""
    phone: str = ""
    location: str = ""
    links: List[Link] = Field(default_factory=list)
    summary: str = ""
    skills: List[SkillGroup] = Field(default_factory=list)
    experience: List[Experience] = Field(default_factory=list)
    education: List[Education] = Field(default_factory=list)
    projects: List[Project] = Field(default_factory=list)
    extras: str = ""


class Ranking(BaseModel):
    score: int = 0
    verdict: str = ""
    strengths: List[str] = Field(default_factory=list)
    gaps: List[str] = Field(default_factory=list)
    keywordHits: List[str] = Field(default_factory=list)
    keywordMisses: List[str] = Field(default_factory=list)
    notes: str = ""


class CompileRequest(BaseModel):
    profile: Optional[Profile] = None
    application_id: Optional[int] = None


class MatchRequest(BaseModel):
    jd: str
    profile: Optional[Profile] = None
    application_id: Optional[int] = None


class SaveProfileRequest(BaseModel):
    profile: Profile


class ApplicationOut(BaseModel):
    id: int
    jd: str
    tailored_profile: Optional[Profile] = None
    ranking: Optional[Ranking] = None
    created_at: str


empty_profile = Profile(
    links=[Link(label="LinkedIn", url=""), Link(label="GitHub", url="")],
    skills=[SkillGroup(category="Languages", items=[""])],
    experience=[Experience(bullets=[""])],
    education=[Education(details=[""])],
    projects=[Project(bullets=[""])],
)


def profile_from_json(data: Any) -> Profile:
    if not data:
        return empty_profile.model_copy(deep=True)
    return Profile.model_validate(data)
