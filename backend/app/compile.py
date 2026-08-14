import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Tuple

from fastapi import HTTPException

from .latex_util import render_tex
from .schemas import Profile


def compile_pdf(profile: Profile) -> Tuple[bytes, str]:
    tex = render_tex(profile)
    tectonic = shutil.which("tectonic")
    if not tectonic:
        raise HTTPException(
            status_code=500,
            detail="Tectonic is not installed. Install it with: brew install tectonic",
        )

    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp)
        tex_path = work / "resume.tex"
        tex_path.write_text(tex, encoding="utf-8")
        try:
            proc = subprocess.run(
                [tectonic, "-X", "compile", str(tex_path), "--outfmt", "pdf"],
                cwd=work,
                capture_output=True,
                text=True,
                timeout=120,
            )
        except subprocess.TimeoutExpired as exc:
            raise HTTPException(status_code=500, detail="LaTeX compile timed out") from exc

        pdf_path = work / "resume.pdf"
        if proc.returncode != 0 or not pdf_path.exists():
            err = (proc.stderr or proc.stdout or "unknown compile error").strip()
            raise HTTPException(status_code=500, detail=f"LaTeX compile failed:\n{err[-4000:]}")
        return pdf_path.read_bytes(), tex
