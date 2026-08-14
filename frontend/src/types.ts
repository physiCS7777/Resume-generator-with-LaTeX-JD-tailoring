export type Link = { label: string; url: string };
export type SkillGroup = { category: string; items: string[] };
export type Experience = {
  role: string;
  org: string;
  location: string;
  start: string;
  end: string;
  bullets: string[];
};
export type Education = {
  school: string;
  degree: string;
  location: string;
  dates: string;
  details: string[];
};
export type Project = {
  name: string;
  url: string;
  tech: string;
  bullets: string[];
};
export type Profile = {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  links: Link[];
  summary: string;
  skills: SkillGroup[];
  experience: Experience[];
  education: Education[];
  projects: Project[];
  extras: string;
};
export type Ranking = {
  score: number;
  verdict: string;
  strengths: string[];
  gaps: string[];
  keywordHits: string[];
  keywordMisses: string[];
  notes: string;
};
export type Application = {
  id: number;
  jd: string;
  tailored_profile: Profile | null;
  ranking: Ranking | null;
  created_at: string;
};

export const emptyProfile = (): Profile => ({
  name: "",
  title: "",
  email: "",
  phone: "",
  location: "",
  links: [
    { label: "LinkedIn", url: "" },
    { label: "GitHub", url: "" },
  ],
  summary: "",
  skills: [{ category: "Languages", items: [""] }],
  experience: [
    { role: "", org: "", location: "", start: "", end: "", bullets: [""] },
  ],
  education: [
    { school: "", degree: "", location: "", dates: "", details: [""] },
  ],
  projects: [{ name: "", url: "", tech: "", bullets: [""] }],
  extras: "",
});
