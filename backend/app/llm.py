import json
import re
from typing import Any, Dict

import httpx
from fastapi import HTTPException

from .config import OPENROUTER_API_KEY, OPENROUTER_MODEL, OPENROUTER_URL
from .schemas import Profile, Ranking

PROFILE_JSON_SCHEMA = """{
  "name": string,
  "title": string,
  "email": string,
  "phone": string,
  "location": string,
  "links": [{"label": string, "url": string}],
  "summary": string,
  "skills": [{"category": string, "items": [string]}],
  "experience": [{"role": string, "org": string, "location": string, "start": string, "end": string, "bullets": [string]}],
  "education": [{"school": string, "degree": string, "location": string, "dates": string, "details": [string]}],
  "projects": [{"name": string, "url": string, "tech": string, "bullets": [string]}],
  "extras": string
}"""

RANK_JSON_SCHEMA = """{
  "score": integer 0-100,
  "verdict": string,
  "strengths": [string],
  "gaps": [string],
  "keywordHits": [string],
  "keywordMisses": [string],
  "notes": string
}"""


def _extract_json(text: str) -> Any:
    stripped = text.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", stripped)
    if fence:
        stripped = fence.group(1).strip()
    try:
        return json.loads(stripped)
    except json.JSONDecodeError:
        pass
    decoder = json.JSONDecoder()
    best = None
    best_score = -1
    idx = 0
    while True:
        start = stripped.find("{", idx)
        if start < 0:
            break
        try:
            obj, end = decoder.raw_decode(stripped[start:])
        except json.JSONDecodeError:
            idx = start + 1
            continue
        if isinstance(obj, dict):
            score = 0
            for key in (
                "name",
                "experience",
                "skills",
                "summary",
                "score",
                "verdict",
                "keywordHits",
            ):
                if key in obj:
                    score += 1
            if score > best_score:
                best = obj
                best_score = score
        idx = start + 1
    if best is not None and best_score > 0:
        return best
    raise json.JSONDecodeError("No JSON object found", stripped, 0)


def _message_text(message: Dict[str, Any]) -> str:
    content = message.get("content") or ""
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, dict) and item.get("type") in ("text", "output_text"):
                parts.append(item.get("text") or "")
            elif isinstance(item, str):
                parts.append(item)
        content = "".join(parts)
    content = str(content)
    if "{" in content:
        return content
    reasoning = message.get("reasoning") or ""
    return "\n".join(part for part in (content, str(reasoning)) if str(part).strip())


def _error_detail(resp: httpx.Response) -> str:
    body = (resp.text or "").strip()
    try:
        data = resp.json()
        err = data.get("error")
        if isinstance(err, dict):
            msg = err.get("message") or err.get("metadata") or err
            return "OpenRouter {0}: {1}".format(resp.status_code, msg)
        if isinstance(err, str):
            return "OpenRouter {0}: {1}".format(resp.status_code, err)
    except Exception:
        pass
    if resp.status_code == 403:
        return (
            "OpenRouter 403 Forbidden. Common causes: privacy settings block :free "
            "models (https://openrouter.ai/settings/privacy — allow free-model data "
            "publication, turn off ZDR-only), an invalid key, or a local network "
            "filter. Details: {0}".format(body[:1500] or "no response body")
        )
    return "OpenRouter {0}: {1}".format(resp.status_code, body[:1500] or resp.reason_phrase)


async def _openrouter_complete(
    client: httpx.AsyncClient, headers: Dict[str, str], payload: Dict[str, Any]
) -> str:
    resp = await client.post(OPENROUTER_URL, headers=headers, json=payload)
    if resp.status_code == 400:
        changed = False
        if "response_format" in payload:
            payload.pop("response_format", None)
            changed = True
        if "reasoning" in payload:
            payload.pop("reasoning", None)
            changed = True
        if changed:
            resp = await client.post(OPENROUTER_URL, headers=headers, json=payload)
    if resp.status_code >= 400:
        raise HTTPException(status_code=502, detail=_error_detail(resp))
    data = resp.json()
    try:
        message = data["choices"][0]["message"]
    except (KeyError, IndexError, TypeError) as exc:
        raise HTTPException(
            status_code=502, detail="Unexpected OpenRouter response: {0}".format(data)
        ) from exc
    content = _message_text(message)
    if not content.strip():
        raise HTTPException(status_code=502, detail="OpenRouter returned empty content")
    return content


async def chat_json(system: str, user: str) -> Any:
    if not OPENROUTER_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="OPENROUTER_API_KEY is missing from .env",
        )
    headers = {
        "Authorization": "Bearer {0}".format(OPENROUTER_API_KEY),
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5173",
        "Referer": "http://localhost:5173",
        "X-Title": "Resume Agent",
        "User-Agent": "ResumeAgent/1.0",
    }
    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": 0.1,
        "max_tokens": 16384,
        "reasoning": {"enabled": False, "exclude": True},
        "response_format": {"type": "json_object"},
    }
    try:
        async with httpx.AsyncClient(timeout=180.0, follow_redirects=True) as client:
            content = await _openrouter_complete(client, headers, payload)
            try:
                return _extract_json(content)
            except (json.JSONDecodeError, ValueError):
                retry = dict(payload)
                retry["reasoning"] = {"enabled": False, "exclude": True}
                retry["messages"] = list(payload["messages"]) + [
                    {"role": "assistant", "content": content[:6000]},
                    {
                        "role": "user",
                        "content": (
                            "The previous reply was truncated or not valid JSON. "
                            "Reply with the complete JSON object only, no other text."
                        ),
                    },
                ]
                content = await _openrouter_complete(client, headers, retry)
                return _extract_json(content)
    except HTTPException:
        raise
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=502,
            detail="Model did not return valid JSON:\n{0}".format(content[:2000]),
        ) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail="OpenRouter request failed: {0}".format(exc),
        ) from exc


async def tailor_profile(profile: Profile, jd: str) -> Profile:
    system = (
        "You are a resume editor. Never invent employers, dates, degrees, or skills "
        "the candidate did not already list. You may rephrase bullets, reorder items, "
        "emphasize relevant skills, and rewrite the summary using only existing facts. "
        "Drop or de-emphasize less relevant bullets. Reply with a single JSON object only. "
        "No markdown, no thinking, no commentary. Schema:\n"
        + PROFILE_JSON_SCHEMA
    )
    user = (
        "Job description:\n"
        "{0}\n\n"
        "Current resume profile JSON:\n"
        "{1}\n\n"
        "Return the full updated profile JSON."
    ).format(jd, profile.model_dump_json(indent=2))
    data = await chat_json(system, user)
    return Profile.model_validate(data)


async def rank_profile(profile: Profile, jd: str) -> Ranking:
    system = (
        "You are a hiring-screening assistant. Rank how well this resume matches the job "
        "description. Be specific and honest. Reply with a single JSON object only. "
        "No markdown, no thinking, no commentary. Schema:\n"
        + RANK_JSON_SCHEMA
    )
    user = (
        "Job description:\n"
        "{0}\n\n"
        "Resume profile JSON:\n"
        "{1}\n\n"
        "Return the ranking JSON."
    ).format(jd, profile.model_dump_json(indent=2))
    data = await chat_json(system, user)
    ranking = Ranking.model_validate(data)
    ranking.score = max(0, min(100, int(ranking.score)))
    return ranking
