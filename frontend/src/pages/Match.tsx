import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  compilePdf,
  listApplications,
  rankResume,
  saveAsProfile,
  tailorResume,
} from "../api";
import type { Application, Ranking } from "../types";

export default function MatchPage() {
  const [jd, setJd] = useState("");
  const [busy, setBusy] = useState<"tailor" | "rank" | null>(null);
  const [error, setError] = useState("");
  const [current, setCurrent] = useState<Application | null>(null);
  const [history, setHistory] = useState<Application[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState("");

  async function refreshHistory() {
    try {
      setHistory(await listApplications());
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    void refreshHistory();
  }, []);

  async function previewTailored(app: Application) {
    if (!app.tailored_profile) return;
    const blob = await compilePdf({ profile: app.tailored_profile });
    setPdfUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(blob);
    });
  }

  async function onTailor() {
    setBusy("tailor");
    setError("");
    setSavedMsg("");
    try {
      const app = await tailorResume(jd);
      setCurrent(app);
      await previewTailored(app);
      await refreshHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tailor failed");
    } finally {
      setBusy(null);
    }
  }

  async function onRank() {
    setBusy("rank");
    setError("");
    try {
      const app = await rankResume({
        jd,
        profile: current?.tailored_profile ?? undefined,
        application_id: current?.id,
      });
      setCurrent(app);
      await refreshHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rank failed");
    } finally {
      setBusy(null);
    }
  }

  async function onSaveProfile() {
    if (!current?.tailored_profile) return;
    setError("");
    try {
      await saveAsProfile(current.tailored_profile);
      setSavedMsg("Tailored version saved as your canonical admin profile.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  }

  const ranking: Ranking | null = current?.ranking ?? null;

  return (
    <section>
      <h1>Job match</h1>
      <p className="muted">
        Paste a job description. Tailor creates a snapshot without overwriting Admin unless you
        save it. Rank scores the tailored snapshot if one exists, otherwise the canonical profile.
      </p>

      <div className="card">
        <label>
          Job description
          <textarea value={jd} onChange={(e) => setJd(e.target.value)} rows={12} />
        </label>
        <div className="actions">
          <button type="button" disabled={!jd.trim() || busy !== null} onClick={() => void onTailor()}>
            {busy === "tailor" ? "Tailoring…" : "Tailor resume"}
          </button>
          <button
            type="button"
            className="secondary"
            disabled={!jd.trim() || busy !== null}
            onClick={() => void onRank()}
          >
            {busy === "rank" ? "Ranking…" : "Rank vs JD"}
          </button>
          {current?.tailored_profile && (
            <>
              <button type="button" className="secondary" onClick={() => void onSaveProfile()}>
                Save tailored as profile
              </button>
              <Link to={`/resume?application=${current.id}`}>Open snapshot on Resume page</Link>
            </>
          )}
        </div>
        {savedMsg && <p className="ok">{savedMsg}</p>}
        {error && <p className="error">{error}</p>}
      </div>

      {ranking && (
        <div className="card">
          <div className="score">{ranking.score}</div>
          <p>
            <strong>{ranking.verdict}</strong>
          </p>
          {ranking.notes && <p>{ranking.notes}</p>}
          <h3>Strengths</h3>
          <ul className="plain">
            {ranking.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
          <h3>Gaps</h3>
          <ul className="plain">
            {ranking.gaps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
          <h3>Keyword hits</h3>
          <div className="chips">
            {ranking.keywordHits.map((k) => (
              <span className="chip" key={k}>
                {k}
              </span>
            ))}
          </div>
          <h3>Keyword misses</h3>
          <div className="chips">
            {ranking.keywordMisses.map((k) => (
              <span className="chip miss" key={k}>
                {k}
              </span>
            ))}
          </div>
        </div>
      )}

      {pdfUrl && (
        <div className="card">
          <h2>Tailored PDF preview</h2>
          <iframe className="pdf-frame" title="Tailored resume" src={pdfUrl} />
        </div>
      )}

      {history.length > 0 && (
        <div className="card">
          <h2>Recent snapshots</h2>
          <ul className="plain">
            {history.map((app) => (
              <li key={app.id}>
                #{app.id} — {new Date(app.created_at).toLocaleString()} —{" "}
                {app.ranking ? `score ${app.ranking.score}` : "no rank"} —{" "}
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setCurrent(app);
                    setJd(app.jd);
                    if (app.tailored_profile) void previewTailored(app);
                  }}
                >
                  Load
                </button>{" "}
                <Link to={`/resume?application=${app.id}`}>Resume page</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
