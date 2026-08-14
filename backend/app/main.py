from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import List, Union

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from .compile import compile_pdf
from .db import ApplicationRow, ProfileRow, SessionLocal, init_db
from .latex_util import render_tex
from .llm import rank_profile, tailor_profile
from .schemas import (
    ApplicationOut,
    CompileRequest,
    MatchRequest,
    Profile,
    Ranking,
    SaveProfileRequest,
    empty_profile,
    profile_from_json,
)

app = FastAPI(title="Resume Agent")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    init_db()


def _load_profile() -> Profile:
    with SessionLocal() as session:
        row = session.get(ProfileRow, 1)
        if row is None:
            return empty_profile.model_copy(deep=True)
        return profile_from_json(json.loads(row.json or "{}"))


def _save_profile(profile: Profile) -> Profile:
    with SessionLocal() as session:
        row = session.get(ProfileRow, 1)
        if row is None:
            row = ProfileRow(id=1, json=profile.model_dump_json())
            session.add(row)
        else:
            row.json = profile.model_dump_json()
            row.updated_at = datetime.now(timezone.utc)
        session.commit()
    return profile


def _application_out(row: ApplicationRow) -> ApplicationOut:
    tailored = None
    ranking = None
    if row.tailored_json:
        tailored = profile_from_json(json.loads(row.tailored_json))
    if row.rank_json:
        ranking = Ranking.model_validate(json.loads(row.rank_json))
    return ApplicationOut(
        id=row.id,
        jd=row.jd,
        tailored_profile=tailored,
        ranking=ranking,
        created_at=row.created_at.isoformat(),
    )


def _resolve_profile(body: Union[CompileRequest, MatchRequest]) -> Profile:
    if getattr(body, "profile", None) is not None:
        return body.profile
    app_id = getattr(body, "application_id", None)
    if app_id is not None:
        with SessionLocal() as session:
            row = session.get(ApplicationRow, app_id)
            if row is None:
                raise HTTPException(status_code=404, detail="Application not found")
            if not row.tailored_json:
                raise HTTPException(status_code=400, detail="Application has no tailored resume")
            return profile_from_json(json.loads(row.tailored_json))
    return _load_profile()


@app.get("/api/profile")
def get_profile() -> Profile:
    return _load_profile()


@app.put("/api/profile")
def put_profile(profile: Profile) -> Profile:
    return _save_profile(profile)


@app.post("/api/resume/compile")
def resume_compile(body: CompileRequest) -> Response:
    profile = _resolve_profile(body)
    pdf, _tex = compile_pdf(profile)
    return Response(content=pdf, media_type="application/pdf")


@app.post("/api/resume/tex")
def resume_tex(body: CompileRequest) -> Response:
    profile = _resolve_profile(body)
    tex = render_tex(profile)
    return Response(
        content=tex,
        media_type="application/x-tex",
        headers={"Content-Disposition": 'attachment; filename="resume.tex"'},
    )


@app.post("/api/match/tailor")
async def match_tailor(body: MatchRequest) -> ApplicationOut:
    if not body.jd.strip():
        raise HTTPException(status_code=400, detail="Job description is empty")
    base = body.profile or _load_profile()
    tailored = await tailor_profile(base, body.jd)
    with SessionLocal() as session:
        row = ApplicationRow(
            jd=body.jd,
            tailored_json=tailored.model_dump_json(),
        )
        session.add(row)
        session.commit()
        session.refresh(row)
        return _application_out(row)


@app.post("/api/match/rank")
async def match_rank(body: MatchRequest) -> ApplicationOut:
    if not body.jd.strip():
        raise HTTPException(status_code=400, detail="Job description is empty")
    profile = _resolve_profile(body)
    ranking = await rank_profile(profile, body.jd)
    with SessionLocal() as session:
        if body.application_id:
            row = session.get(ApplicationRow, body.application_id)
            if row is None:
                raise HTTPException(status_code=404, detail="Application not found")
            row.rank_json = ranking.model_dump_json()
            if not row.jd:
                row.jd = body.jd
            session.commit()
            session.refresh(row)
            return _application_out(row)
        row = ApplicationRow(
            jd=body.jd,
            tailored_json=profile.model_dump_json() if body.profile else None,
            rank_json=ranking.model_dump_json(),
        )
        session.add(row)
        session.commit()
        session.refresh(row)
        return _application_out(row)


@app.post("/api/match/save-profile")
def save_tailored_as_profile(body: SaveProfileRequest) -> Profile:
    return _save_profile(body.profile)


@app.get("/api/applications")
def list_applications() -> List[ApplicationOut]:
    with SessionLocal() as session:
        rows = (
            session.query(ApplicationRow)
            .order_by(ApplicationRow.id.desc())
            .limit(50)
            .all()
        )
        return [_application_out(r) for r in rows]


@app.get("/api/applications/{app_id}")
def get_application(app_id: int) -> ApplicationOut:
    with SessionLocal() as session:
        row = session.get(ApplicationRow, app_id)
        if row is None:
            raise HTTPException(status_code=404, detail="Application not found")
        return _application_out(row)
