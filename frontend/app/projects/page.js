"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import ProjectCard from "@/components/ProjectCard";
import RoleGuard from "@/components/RoleGuard";
import api from "@/lib/api";
import useAuthClientState from "@/hooks/useAuthClientState";
import { Plus, LayoutGrid, Folders } from "lucide-react";

export default function ProjectsPage() {
  const router = useRouter();
  const { mounted, token } = useAuthClientState();
  const [projects, setProjects] = useState([]);
  const [rubrics, setRubrics] = useState([]);
  const [form, setForm] = useState({ name: "", description: "", rubric_id: "" });
  const [rubricMode, setRubricMode] = useState("existing");
  const [inlineRubric, setInlineRubric] = useState({
    name: "", version: "", factuality_guide: "", helpfulness_guide: "", safety_guide: ""
  });
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  async function loadRubrics() {
    const rubRes = await api.get("/rubrics");
    setRubrics(rubRes.data || []);
  }

  async function loadProjects() {
    try {
      const projectsResponse = await api.get("/projects");
      const dashboardResponse = await api.get("/dashboard");
      const completionByProject = new Map(
        dashboardResponse.data.completionRate.map((item) => [item.projectId, item.rate])
      );
      const merged = projectsResponse.data.map((project) => ({
        ...project,
        completion_rate: completionByProject.get(project.id) || 0
      }));
      setProjects(merged);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load projects");
    }
  }

  async function createProject(e) {
    e.preventDefault();
    setError("");
    try {
      const payload = { name: form.name, description: form.description };
      if (rubricMode === "create" && inlineRubric.name.trim()) {
        payload.rubric = { ...inlineRubric, name: inlineRubric.name.trim() };
      } else if (rubricMode === "existing" && form.rubric_id) {
        payload.rubric_id = Number(form.rubric_id);
      }
      await api.post("/projects", payload);
      setForm({ name: "", description: "", rubric_id: "" });
      setInlineRubric({ name: "", version: "", factuality_guide: "", helpfulness_guide: "", safety_guide: "" });
      setRubricMode("existing");
      setIsCreating(false);
      await loadProjects();
      await loadRubrics();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create project");
    }
  }

  useEffect(() => {
    if (!mounted) return;
    if (!token) {
      router.push("/login");
      return;
    }
    loadProjects();
    loadRubrics().catch(() => { });
  }, [mounted, token, router]);

  if (!mounted) return null;

  return (
    <>
      <Navbar />
      {/* full width layout */}
      <div className="w-full px-6 py-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-stripe-textPrimary tracking-tight">Projects</h1>
            <p className="text-stripe-textSecondary mt-1">Manage and view all your active workspaces.</p>
          </div>
          <RoleGuard allow={["admin", "pl"]}>
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="inline-flex items-center gap-2 rounded-md bg-stripe-blue px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-stripe-blue/90 transition-colors"
            >
              <Plus className="h-4 w-4" /> {isCreating ? "Cancel" : "New Project"}
            </button>
          </RoleGuard>
        </div>

        {error ? (
          <div className="mb-6 rounded-md bg-rose-50 border border-rose-200 p-4 text-sm text-stripe-danger">
            {error}
          </div>
        ) : null}

        <RoleGuard allow={["admin", "pl"]}>
          {isCreating && (
            <div className="mb-8 rounded-card border border-stripe-border bg-white p-6 shadow-card transition-all">
              <h2 className="text-xl font-bold text-stripe-textPrimary mb-4">Create New Project</h2>
              <form className="space-y-6" onSubmit={createProject}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-stripe-textPrimary mb-1">Project Name <span className="text-rose-500">*</span></label>
                    <input
                      className="w-full rounded-input border border-stripe-border bg-white px-3 py-2 text-sm focus:border-stripe-blue focus:ring-1 focus:ring-stripe-blue transition-all"
                      placeholder="e.g. Acme Website Redesign"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stripe-textPrimary mb-1">Description</label>
                    <input
                      className="w-full rounded-input border border-stripe-border bg-white px-3 py-2 text-sm focus:border-stripe-blue focus:ring-1 focus:ring-stripe-blue transition-all"
                      placeholder="Briefly describe the objective"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-stripe-border">
                  <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                    <h3 className="font-semibold text-stripe-textPrimary">Evaluation Rubric</h3>
                    <select
                      className="rounded-input border border-stripe-border bg-slate-50 px-3 py-1.5 text-sm font-medium text-stripe-textPrimary"
                      value={rubricMode}
                      onChange={(e) => setRubricMode(e.target.value)}
                    >
                      <option value="existing">Use Existing Rubric</option>
                      <option value="create">Define New Rubric</option>
                    </select>
                  </div>

                  {rubricMode === "existing" ? (
                    <div>
                      <select className="w-full max-w-md rounded-input border border-stripe-border bg-white px-3 py-2 text-sm focus:border-stripe-blue focus:ring-1 focus:ring-stripe-blue" value={form.rubric_id} onChange={(e) => setForm({ ...form, rubric_id: e.target.value })}>
                        <option value="">No rubric (Optional)</option>
                        {rubrics.map((r) => (
                          <option key={r.id} value={r.id}>
                            {(r.name || "Untitled") + (r.version ? ` (v${r.version})` : "")}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 bg-slate-50 p-4 rounded border border-stripe-border">
                      <input
                        required
                        className="rounded-input border border-stripe-border bg-white px-3 py-2 text-sm focus:border-stripe-blue focus:ring-1 focus:ring-stripe-blue"
                        placeholder="Rubric Name (e.g. Standard QA v2)"
                        value={inlineRubric.name}
                        onChange={(e) => setInlineRubric({ ...inlineRubric, name: e.target.value })}
                      />
                      <input
                        className="rounded-input border border-stripe-border bg-white px-3 py-2 text-sm focus:border-stripe-blue focus:ring-1 focus:ring-stripe-blue"
                        placeholder="Version (e.g. 2.0)"
                        value={inlineRubric.version}
                        onChange={(e) => setInlineRubric({ ...inlineRubric, version: e.target.value })}
                      />
                      <div className="md:col-span-2 space-y-3">
                        <textarea
                          className="w-full rounded-input border border-stripe-border bg-white px-3 py-2 text-sm min-h-[80px] focus:border-stripe-blue focus:ring-1 focus:ring-stripe-blue"
                          placeholder="Factuality guide: Explain how to score factuality..."
                          value={inlineRubric.factuality_guide}
                          onChange={(e) => setInlineRubric({ ...inlineRubric, factuality_guide: e.target.value })}
                        />
                        <textarea
                          className="w-full rounded-input border border-stripe-border bg-white px-3 py-2 text-sm min-h-[80px] focus:border-stripe-blue focus:ring-1 focus:ring-stripe-blue"
                          placeholder="Helpfulness guide: Explain how to score helpfulness..."
                          value={inlineRubric.helpfulness_guide}
                          onChange={(e) => setInlineRubric({ ...inlineRubric, helpfulness_guide: e.target.value })}
                        />
                        <textarea
                          className="w-full rounded-input border border-stripe-border bg-white px-3 py-2 text-sm min-h-[80px] focus:border-stripe-blue focus:ring-1 focus:ring-stripe-blue"
                          placeholder="Safety guide: Explain how to score safety..."
                          value={inlineRubric.safety_guide}
                          onChange={(e) => setInlineRubric({ ...inlineRubric, safety_guide: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <button className="rounded-md bg-stripe-blue px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-stripe-blue/90 transition-colors">
                    Create Project
                  </button>
                </div>
              </form>
            </div>
          )}
        </RoleGuard>

        {projects.length > 0 ? (
          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} role={token?.role} onUpdate={loadProjects} />
            ))}
          </section>
        ) : (
          <div className="rounded-card border border-stripe-border border-dashed p-16 text-center bg-white flex flex-col items-center justify-center">
            <Folders className="h-12 w-12 text-slate-300 mb-4" />
            <h2 className="text-xl font-bold text-stripe-textPrimary mb-2">No projects yet</h2>
            <p className="text-stripe-textSecondary mb-6 max-w-sm">Get started by creating a new project. Projects help you organize tasks and team members.</p>
            <RoleGuard allow={["admin", "pl"]}>
              <button
                onClick={() => setIsCreating(true)}
                className="inline-flex items-center gap-2 rounded-md bg-white border border-stripe-border px-4 py-2 text-sm font-medium text-stripe-textPrimary shadow-sm hover:bg-slate-50 transition-colors"
              >
                <Plus className="h-4 w-4" /> Create First Project
              </button>
            </RoleGuard>
          </div>
        )}
      </div>
    </>
  );
}
