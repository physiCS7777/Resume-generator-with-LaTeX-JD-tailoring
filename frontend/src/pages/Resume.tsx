import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { compilePdf, downloadTex } from "../api";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ResumePage() {
  const [params] = useSearchParams();
  const applicationId = params.get("application")
    ? Number(params.get("application"))
    : undefined;
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const body = applicationId ? { application_id: applicationId } : {};

  async function compile() {
    setBusy(true);
    setError("");
    try {
      const blob = await compilePdf(body);
      setPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Compile failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void compile();
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId]);

  return (
    <section>
      <h1>Resume</h1>
      <p className="muted">
        {applicationId
          ? `Previewing tailored snapshot #${applicationId}. Canonical profile is unchanged.`
          : "Compiles the canonical admin profile with Tectonic."}
      </p>
      <div className="actions">
        <button type="button" disabled={busy} onClick={() => void compile()}>
          {busy ? "Compiling…" : "Recompile PDF"}
        </button>
        <button
          type="button"
          className="secondary"
          disabled={!pdfUrl}
          onClick={async () => {
            if (!pdfUrl) return;
            const blob = await fetch(pdfUrl).then((r) => r.blob());
            triggerDownload(blob, "resume.pdf");
          }}
        >
          Download PDF
        </button>
        <button
          type="button"
          className="secondary"
          onClick={async () => {
            try {
              const tex = await downloadTex(body);
              triggerDownload(tex, "resume.tex");
            } catch (e) {
              setError(e instanceof Error ? e.message : "TeX download failed");
            }
          }}
        >
          Download TeX
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {pdfUrl && <iframe className="pdf-frame" title="Resume PDF" src={pdfUrl} />}
    </section>
  );
}
