import { useEffect, useState } from "react";
import { getProfile, saveProfile } from "../api";
import type { Education, Experience, Profile, Project, SkillGroup } from "../types";
import { emptyProfile } from "../types";

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label>
      {label}
      <input value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Lines({
  label,
  items,
  onChange,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  return (
    <div>
      <label>{label}</label>
      {items.map((line, i) => (
        <div className="row" key={i} style={{ gridTemplateColumns: "1fr auto", marginBottom: 6 }}>
          <input
            value={line}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onChange(next);
            }}
          />
          <button
            type="button"
            className="secondary"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
          >
            Remove
          </button>
        </div>
      ))}
      <button type="button" className="secondary" onClick={() => onChange([...items, ""])}>
        Add line
      </button>
    </div>
  );
}

export default function AdminPage() {
  const [profile, setProfile] = useState<Profile>(emptyProfile());
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProfile()
      .then((p) => setProfile({ ...emptyProfile(), ...p }))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((p) => ({ ...p, [key]: value }));
  }

  async function onSave() {
    setError("");
    setStatus("Saving…");
    try {
      const saved = await saveProfile(profile);
      setProfile(saved);
      setStatus("Saved.");
    } catch (e) {
      setStatus("");
      setError(e instanceof Error ? e.message : "Save failed");
    }
  }

  if (loading) return <p>Loading profile…</p>;

  return (
    <section>
      <h1>Admin</h1>
      <p className="muted">Your canonical profile. This is what LaTeX and the LLM start from.</p>

      <div className="card">
        <h2>Contact</h2>
        <div className="row">
          <Field label="Name" value={profile.name} onChange={(v) => update("name", v)} />
          <Field label="Title" value={profile.title} onChange={(v) => update("title", v)} />
          <Field label="Email" value={profile.email} onChange={(v) => update("email", v)} />
          <Field label="Phone" value={profile.phone} onChange={(v) => update("phone", v)} />
          <Field label="Location" value={profile.location} onChange={(v) => update("location", v)} />
        </div>
        <h3>Links</h3>
        {profile.links.map((link, i) => (
          <div className="row" key={i}>
            <Field
              label="Label"
              value={link.label}
              onChange={(v) => {
                const links = [...profile.links];
                links[i] = { ...link, label: v };
                update("links", links);
              }}
            />
            <Field
              label="URL"
              value={link.url}
              onChange={(v) => {
                const links = [...profile.links];
                links[i] = { ...link, url: v };
                update("links", links);
              }}
            />
            <label>
              &nbsp;
              <button
                type="button"
                className="secondary"
                onClick={() => update("links", profile.links.filter((_, j) => j !== i))}
              >
                Remove
              </button>
            </label>
          </div>
        ))}
        <button
          type="button"
          className="secondary"
          onClick={() => update("links", [...profile.links, { label: "", url: "" }])}
        >
          Add link
        </button>
      </div>

      <div className="card">
        <h2>Summary</h2>
        <textarea value={profile.summary} onChange={(e) => update("summary", e.target.value)} />
      </div>

      <div className="card">
        <div className="item-head">
          <h2>Skills</h2>
          <button
            type="button"
            className="secondary"
            onClick={() =>
              update("skills", [...profile.skills, { category: "", items: [""] }])
            }
          >
            Add group
          </button>
        </div>
        {profile.skills.map((group, i) => (
          <SkillEditor
            key={i}
            group={group}
            onChange={(g) => {
              const skills = [...profile.skills];
              skills[i] = g;
              update("skills", skills);
            }}
            onRemove={() => update("skills", profile.skills.filter((_, j) => j !== i))}
          />
        ))}
      </div>

      <div className="card">
        <div className="item-head">
          <h2>Experience</h2>
          <button
            type="button"
            className="secondary"
            onClick={() =>
              update("experience", [
                ...profile.experience,
                { role: "", org: "", location: "", start: "", end: "", bullets: [""] },
              ])
            }
          >
            Add role
          </button>
        </div>
        {profile.experience.map((item, i) => (
          <ExperienceEditor
            key={i}
            item={item}
            onChange={(exp) => {
              const experience = [...profile.experience];
              experience[i] = exp;
              update("experience", experience);
            }}
            onRemove={() =>
              update("experience", profile.experience.filter((_, j) => j !== i))
            }
          />
        ))}
      </div>

      <div className="card">
        <div className="item-head">
          <h2>Projects</h2>
          <button
            type="button"
            className="secondary"
            onClick={() =>
              update("projects", [
                ...profile.projects,
                { name: "", url: "", tech: "", bullets: [""] },
              ])
            }
          >
            Add project
          </button>
        </div>
        {profile.projects.map((item, i) => (
          <ProjectEditor
            key={i}
            item={item}
            onChange={(proj) => {
              const projects = [...profile.projects];
              projects[i] = proj;
              update("projects", projects);
            }}
            onRemove={() => update("projects", profile.projects.filter((_, j) => j !== i))}
          />
        ))}
      </div>

      <div className="card">
        <div className="item-head">
          <h2>Education</h2>
          <button
            type="button"
            className="secondary"
            onClick={() =>
              update("education", [
                ...profile.education,
                { school: "", degree: "", location: "", dates: "", details: [""] },
              ])
            }
          >
            Add school
          </button>
        </div>
        {profile.education.map((item, i) => (
          <EducationEditor
            key={i}
            item={item}
            onChange={(edu) => {
              const education = [...profile.education];
              education[i] = edu;
              update("education", education);
            }}
            onRemove={() =>
              update("education", profile.education.filter((_, j) => j !== i))
            }
          />
        ))}
      </div>

      <div className="card">
        <h2>Additional</h2>
        <textarea value={profile.extras} onChange={(e) => update("extras", e.target.value)} />
      </div>

      <div className="actions">
        <button type="button" onClick={onSave}>
          Save profile
        </button>
      </div>
      {status && <p className="ok">{status}</p>}
      {error && <p className="error">{error}</p>}
    </section>
  );
}

function SkillEditor({
  group,
  onChange,
  onRemove,
}: {
  group: SkillGroup;
  onChange: (g: SkillGroup) => void;
  onRemove: () => void;
}) {
  return (
    <div className="item">
      <div className="item-head">
        <Field
          label="Category"
          value={group.category}
          onChange={(v) => onChange({ ...group, category: v })}
        />
        <button type="button" className="secondary" onClick={onRemove}>
          Remove group
        </button>
      </div>
      <Lines label="Skills" items={group.items} onChange={(items) => onChange({ ...group, items })} />
    </div>
  );
}

function ExperienceEditor({
  item,
  onChange,
  onRemove,
}: {
  item: Experience;
  onChange: (e: Experience) => void;
  onRemove: () => void;
}) {
  return (
    <div className="item">
      <div className="item-head">
        <strong>{item.role || "Role"}</strong>
        <button type="button" className="secondary" onClick={onRemove}>
          Remove
        </button>
      </div>
      <div className="row">
        <Field label="Role" value={item.role} onChange={(v) => onChange({ ...item, role: v })} />
        <Field label="Organization" value={item.org} onChange={(v) => onChange({ ...item, org: v })} />
        <Field
          label="Location"
          value={item.location}
          onChange={(v) => onChange({ ...item, location: v })}
        />
        <Field label="Start" value={item.start} onChange={(v) => onChange({ ...item, start: v })} />
        <Field label="End" value={item.end} onChange={(v) => onChange({ ...item, end: v })} />
      </div>
      <Lines label="Bullets" items={item.bullets} onChange={(bullets) => onChange({ ...item, bullets })} />
    </div>
  );
}

function ProjectEditor({
  item,
  onChange,
  onRemove,
}: {
  item: Project;
  onChange: (p: Project) => void;
  onRemove: () => void;
}) {
  return (
    <div className="item">
      <div className="item-head">
        <strong>{item.name || "Project"}</strong>
        <button type="button" className="secondary" onClick={onRemove}>
          Remove
        </button>
      </div>
      <div className="row">
        <Field label="Name" value={item.name} onChange={(v) => onChange({ ...item, name: v })} />
        <Field label="URL" value={item.url} onChange={(v) => onChange({ ...item, url: v })} />
        <Field label="Tech" value={item.tech} onChange={(v) => onChange({ ...item, tech: v })} />
      </div>
      <Lines label="Bullets" items={item.bullets} onChange={(bullets) => onChange({ ...item, bullets })} />
    </div>
  );
}

function EducationEditor({
  item,
  onChange,
  onRemove,
}: {
  item: Education;
  onChange: (e: Education) => void;
  onRemove: () => void;
}) {
  return (
    <div className="item">
      <div className="item-head">
        <strong>{item.school || "School"}</strong>
        <button type="button" className="secondary" onClick={onRemove}>
          Remove
        </button>
      </div>
      <div className="row">
        <Field label="School" value={item.school} onChange={(v) => onChange({ ...item, school: v })} />
        <Field label="Degree" value={item.degree} onChange={(v) => onChange({ ...item, degree: v })} />
        <Field
          label="Location"
          value={item.location}
          onChange={(v) => onChange({ ...item, location: v })}
        />
        <Field label="Dates" value={item.dates} onChange={(v) => onChange({ ...item, dates: v })} />
      </div>
      <Lines label="Details" items={item.details} onChange={(details) => onChange({ ...item, details })} />
    </div>
  );
}
