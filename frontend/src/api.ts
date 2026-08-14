import type { Application, Profile } from "./types";

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) return JSON.stringify(data.detail);
    return JSON.stringify(data.detail ?? data);
  } catch {
    return res.statusText;
  }
}

export async function getProfile(): Promise<Profile> {
  const res = await fetch("/api/profile");
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function saveProfile(profile: Profile): Promise<Profile> {
  const res = await fetch("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function compilePdf(body: {
  profile?: Profile;
  application_id?: number;
}): Promise<Blob> {
  const res = await fetch("/api/resume/compile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.blob();
}

export async function downloadTex(body: {
  profile?: Profile;
  application_id?: number;
}): Promise<Blob> {
  const res = await fetch("/api/resume/tex", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.blob();
}

export async function tailorResume(jd: string, profile?: Profile): Promise<Application> {
  const res = await fetch("/api/match/tailor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jd, profile }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function rankResume(body: {
  jd: string;
  profile?: Profile;
  application_id?: number;
}): Promise<Application> {
  const res = await fetch("/api/match/rank", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function saveAsProfile(profile: Profile): Promise<Profile> {
  const res = await fetch("/api/match/save-profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function listApplications(): Promise<Application[]> {
  const res = await fetch("/api/applications");
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}
