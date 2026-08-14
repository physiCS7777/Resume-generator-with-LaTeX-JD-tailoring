from typing import List

from jinja2 import Environment, FileSystemLoader, select_autoescape

from .config import TEMPLATES_DIR
from .schemas import Profile

_TEX_MAP = {
    "\\": r"\textbackslash{}",
    "&": r"\&",
    "%": r"\%",
    "$": r"\$",
    "#": r"\#",
    "_": r"\_",
    "{": r"\{",
    "}": r"\}",
    "~": r"\textasciitilde{}",
    "^": r"\textasciicircum{}",
}


def tex_escape(value: object) -> str:
    text = "" if value is None else str(value)
    return "".join(_TEX_MAP.get(ch, ch) for ch in text)


def url_escape(value: object) -> str:
    text = "" if value is None else str(value).strip()
    return text.replace("\\", "/").replace("#", r"\#").replace("%", r"\%")


_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(enabled_extensions=()),
    trim_blocks=True,
    lstrip_blocks=True,
)


def _bullets(items: List[str]) -> List[str]:
    return [tex_escape(b) for b in items if str(b).strip()]


def render_tex(profile: Profile) -> str:
    contact: list[str] = []
    if profile.location.strip():
        contact.append(tex_escape(profile.location))
    if profile.email.strip():
        email = profile.email.strip()
        contact.append(rf"\href{{mailto:{url_escape(email)}}}{{{tex_escape(email)}}}")
    if profile.phone.strip():
        contact.append(tex_escape(profile.phone))

    links: list[dict] = []
    for link in profile.links:
        if not link.label.strip() and not link.url.strip():
            continue
        links.append(
            {
                "label": tex_escape(link.label or link.url),
                "url": url_escape(link.url),
            }
        )

    skills = []
    for group in profile.skills:
        items = [tex_escape(i) for i in group.items if str(i).strip()]
        if not group.category.strip() and not items:
            continue
        skills.append({"category": tex_escape(group.category), "skill_items": items})

    experience = []
    for item in profile.experience:
        bullets = _bullets(item.bullets)
        if not (item.role.strip() or item.org.strip() or bullets):
            continue
        experience.append(
            {
                "role": tex_escape(item.role),
                "org": tex_escape(item.org),
                "location": tex_escape(item.location),
                "start": tex_escape(item.start),
                "end": tex_escape(item.end),
                "bullets": bullets,
            }
        )

    education = []
    for item in profile.education:
        details = _bullets(item.details)
        if not (item.school.strip() or item.degree.strip()):
            continue
        education.append(
            {
                "school": tex_escape(item.school),
                "degree": tex_escape(item.degree),
                "location": tex_escape(item.location),
                "dates": tex_escape(item.dates),
                "details": details,
            }
        )

    projects = []
    for item in profile.projects:
        bullets = _bullets(item.bullets)
        if not (item.name.strip() or bullets):
            continue
        projects.append(
            {
                "name": tex_escape(item.name),
                "url": url_escape(item.url),
                "url_label": tex_escape(item.url),
                "tech": tex_escape(item.tech),
                "bullets": bullets,
            }
        )

    template = _env.get_template("resume.tex.j2")
    return template.render(
        name=tex_escape(profile.name),
        title=tex_escape(profile.title),
        summary=tex_escape(profile.summary),
        extras=tex_escape(profile.extras),
        contact=contact,
        links=links,
        skills=skills,
        experience=experience,
        education=education,
        projects=projects,
    )
