"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import RoleGuard from "@/components/RoleGuard";
import EtharaTaskPanel from "@/components/EtharaTaskPanel";
import api from "@/lib/api";
import useAuthClientState from "@/hooks/useAuthClientState";
import { Plus, Clock, Search, MoreHorizontal, User, CheckCircle2, ChevronRight, X } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "todo", label: "Todo" },
  { id: "in_progress", label: "In Progress" },
  { id: "review", label: "Review" },
  { id: "done", label: "Done" }
];

function isTerminal(status) {
  return status === "done" || status === "approved" || status === "rejected";
}

export default function ProjectDetailPage() {
  const router = useRouter();
  const { mounted, token, role } = useAuthClientState();
  const params = useParams();
  const projectId = Number(params.id);
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  // UI State
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Add task form
  const [taskForm, setTaskForm] = useState({
    title: "", description: "", prompt: "", assigned_to: "", due_date: "", priority: "medium", status: "todo"
  });

  async function loadAll() {
    try {
      const projectResponse = await api.get(`/projects/${projectId}`);
      // Don't filter at API level for complex tabs, just grab all and filter locally
      const tasksResponse = await api.get(`/tasks?project_id=${projectId}`);
      setProject(projectResponse.data);
      setTasks(tasksResponse.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load project");
    }
  }

  useEffect(() => {
    if (!mounted) return;
    if (!token) {
      router.push("/login");
      return;
    }
    if (Number.isFinite(projectId)) {
      loadAll();
    }
  }, [mounted, token, router, projectId]);

  const filteredTasks = useMemo(() => {
    if (filter === "all") return tasks;
    if (filter === "review") return tasks.filter(t => ["submitted", "qr_review"].includes(t.status));
    if (filter === "done") return tasks.filter(t => ["approved", "done"].includes(t.status));
    return tasks.filter(t => t.status === filter);
  }, [tasks, filter]);

  const overdueTaskIds = useMemo(
    () => new Set(tasks.filter((t) => t.due_date && new Date(t.due_date) < new Date() && !isTerminal(t.status)).map((t) => t.id)),
    [tasks]
  );

  async function inviteMember(e) {
    e.preventDefault();
    if (!inviteEmail) return;
    try {
      await api.post(`/projects/${projectId}/members`, { email: inviteEmail });
      setInviteEmail("");
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to add member");
    }
  }

  async function removeMember(userId) {
    try {
      await api.delete(`/projects/${projectId}/members/${userId}`);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to remove member");
    }
  }

  async function createTask(e) {
    e.preventDefault();
    try {
      await api.post("/tasks", {
        ...taskForm,
        project_id: projectId,
        assigned_to: taskForm.assigned_to ? Number(taskForm.assigned_to) : null,
        prompt: taskForm.prompt || null
      });
      setTaskForm({
        title: "", description: "", prompt: "", assigned_to: "", due_date: "", priority: "medium", status: "todo"
      });
      setIsAddTaskOpen(false);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create task");
    }
  }

  if (!mounted) return null;

  if (!project) {
    return (
      <>
        <Navbar />
        <div className="w-full px-6 py-6">
          <div className="animate-pulse space-y-6">
            <div className="h-24 bg-slate-200 rounded"></div>
            <div className="flex gap-6"><div className="w-2/3 h-64 bg-slate-200 rounded"></div><div className="w-1/3 h-64 bg-slate-200 rounded"></div></div>
          </div>
        </div>
      </>
    );
  }

  // Calculate completion percentage dynamically from loaded tasks
  const doneCount = tasks.filter(t => ["approved", "done"].includes(t.status)).length;
  const completionRate = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;

  return (
    <>
      <Navbar />
      <div className="w-full px-6 py-6">
        <div className="mb-6 flex items-center text-sm font-medium text-stripe-textSecondary space-x-2">
          <span className="hover:text-stripe-foreground cursor-pointer" onClick={() => router.push('/projects')}>Projects</span>
          <ChevronRight className="h-4 w-4" />
          <span className="text-stripe-textPrimary">{project.name}</span>
        </div>

        <header className="rounded-card border-x border-y border-stripe-border border-l-4 border-l-stripe-blue bg-white p-6 shadow-sm mb-6 flex flex-col md:flex-row gap-6 md:items-center justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-stripe-textPrimary">{project.name}</h1>
            <p className="mt-1 text-stripe-textSecondary max-w-2xl">{project.description || "No description provided."}</p>
            {project.rubric_name && (
              <div className="mt-3 inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700 border border-violet-100">
                Rubric: {project.rubric_name} {project.rubric_version ? `v${project.rubric_version}` : ""}
              </div>
            )}
          </div>
          <div className="shrink-0 w-full md:w-64 border-t md:border-t-0 md:border-l border-stripe-border pt-4 md:pt-0 md:pl-6">
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm font-bold text-stripe-textPrimary">Completion</span>
              <span className="text-xl font-bold text-stripe-blue">{completionRate}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-stripe-blue" style={{ width: `${completionRate}%` }}></div>
            </div>
            <div className="mt-4 flex -space-x-2 overflow-hidden">
              {project.members?.map((m) => (
                <div key={m.id} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 shadow-sm" title={m.name}>
                  {m.name.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
          </div>
        </header>

        {error ? <div className="mb-6 rounded bg-rose-50 border border-rose-200 p-4 text-sm text-stripe-danger font-medium">{error}</div> : null}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* LEFT 65%: TASKS */}
          <section className="flex-[0_0_100%] lg:flex-[0_0_65%] min-w-0 flex flex-col gap-4">
            <div className="rounded-card border border-stripe-border bg-white shadow-card overflow-hidden">
              {/* Tab Bar & Add Task */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stripe-border p-4 gap-4">
                <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
                  {FILTERS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFilter(f.id)}
                      className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${filter === f.id
                        ? "bg-slate-900 text-white shadow-sm"
                        : "bg-transparent text-stripe-textSecondary hover:bg-slate-100 hover:text-stripe-foreground"
                        }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <RoleGuard allow={["admin", "pl"]}>
                  <button
                    onClick={() => setIsAddTaskOpen(true)}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded bg-stripe-blue px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-stripe-blue/90 transition-colors"
                  >
                    <Plus className="h-4 w-4" /> Add Task
                  </button>
                </RoleGuard>
              </div>

              {/* Task Rows */}
              <div className="overflow-x-auto min-h-[300px]">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-[#F8FAFC] border-b border-stripe-border text-stripe-textSecondary">
                    <tr>
                      <th className="px-4 py-3 w-8"></th>
                      <th className="px-4 py-3 font-semibold">Title</th>
                      <th className="px-4 py-3 font-semibold">Assignee</th>
                      <th className="px-4 py-3 font-semibold">Due</th>
                      <th className="px-4 py-3 font-semibold">Priority</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stripe-border">
                    {filteredTasks.length > 0 ? filteredTasks.map((task) => (
                      <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 align-middle">
                          <div className={`h-4 w-4 rounded border flex items-center justify-center ${isTerminal(task.status) ? "bg-stripe-blue border-stripe-blue" : "border-slate-300"}`}>
                            {isTerminal(task.status) && <CheckCircle2 className="h-3 w-3 text-white" />}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-stripe-textPrimary max-w-[200px] truncate">{task.title}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                              {(task.assignee_name || "U").charAt(0).toUpperCase()}
                            </div>
                          </div>
                        </td>
                        <td className={`px-4 py-3 font-medium ${overdueTaskIds.has(task.id) ? "text-stripe-danger" : "text-stripe-textSecondary"}`}>
                          {task.due_date ? new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={task.priority} isPriority={true} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={task.status} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setEditingTask(task)}
                            className="text-stripe-blue font-semibold hover:underline text-xs"
                          >
                            Open
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="7" className="px-4 py-12 text-center text-stripe-textSecondary">
                          <div className="flex flex-col items-center">
                            <CheckCircle2 className="h-8 w-8 text-slate-300 mb-2" />
                            <span className="font-medium text-slate-600">No tasks found</span>
                            <p className="text-xs mt-1">Try changing the filter tabs or add a task.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* RIGHT 35%: TEAM */}
          <section className="flex-[0_0_100%] lg:flex-[0_0_35%] min-w-0 flex flex-col gap-4">
            <div className="rounded-card border border-stripe-border bg-white shadow-card overflow-hidden">
              <div className="p-4 border-b border-stripe-border flex items-center justify-between bg-[#F8FAFC]">
                <h2 className="font-bold text-stripe-textPrimary">Team Members</h2>
                <span className="text-xs font-semibold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">{project.members?.length || 0}</span>
              </div>
              <div className="p-4">
                <ul className="space-y-4">
                  {project.members?.map((member) => {
                    let canRemove = false;
                    if (role === 'admin') canRemove = true;
                    if (role === 'pl' && member.role === 'qr') canRemove = true;
                    if (role === 'qr' && member.role === 'tasker' && member.parent_id === token?.id) canRemove = true;

                    if (role === 'qr' && member.role !== 'qr' && member.parent_id !== token?.id && member.id !== token?.id) return null;
                    if (role === 'tasker' && member.id !== token?.id && member.id !== project.pl_id) return null;

                    return (
                      <li key={member.id} className="flex items-center justify-between group">
                        <div className="flex items-center gap-3 w-full min-w-0 whitespace-nowrap overflow-hidden">
                          <div className="shrink-0 h-9 w-9 rounded-full bg-gradient-to-tr from-slate-100 to-slate-200 border border-slate-300 flex items-center justify-center text-sm font-bold text-slate-600">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-stripe-textPrimary truncate">{member.name}</p>
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-600 tracking-wide uppercase">{member.role}</span>
                            </div>
                            <p className="text-xs text-stripe-textSecondary truncate">{member.email}</p>
                          </div>
                        </div>
                        {canRemove && (
                          <button
                            className="opacity-0 group-hover:opacity-100 shrink-0 ml-2 rounded p-1 text-slate-400 hover:text-stripe-danger hover:bg-rose-50 transition-all focus:opacity-100"
                            onClick={() => removeMember(member.id)}
                            title="Remove member"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>

                <RoleGuard allow={["admin", "pl", "qr"]}>
                  <form className="mt-6 pt-4 border-t border-stripe-border relative" onSubmit={inviteMember}>
                    <label className="text-xs font-bold text-stripe-textPrimary block mb-2">
                      {role === 'admin' ? "Assign Developer" : role === 'pl' ? "Add QR" : "Add Tasker"}
                    </label>
                    <div className="flex shadow-sm rounded-md overflow-hidden">
                      <input
                        className="flex-1 min-w-0 block w-full px-3 py-2 border-y border-l border-stripe-border bg-white text-sm focus:ring-1 focus:ring-stripe-blue focus:border-stripe-blue outline-none"
                        type="email"
                        placeholder="Email address"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                      <button className="inline-flex items-center px-4 py-2 border border-stripe-blue text-sm font-semibold text-white bg-stripe-blue hover:bg-stripe-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stripe-blue">
                        Add
                      </button>
                    </div>
                  </form>
                </RoleGuard>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* TASK SLIDE-OVER FOR "ADD TASK" (ADMIN ONLY) */}
      {isAddTaskOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsAddTaskOpen(false)}></div>
          <div className="w-full max-w-md bg-white border-l h-full shadow-2xl relative z-10 flex flex-col transform transition-transform translate-x-0 duration-300">
            <div className="flex items-center justify-between p-4 border-b border-stripe-border">
              <h2 className="text-lg font-bold">Add New Task</h2>
              <button onClick={() => setIsAddTaskOpen(false)} className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <form id="add-task-form" className="space-y-4" onSubmit={createTask}>
                <div>
                  <label className="block text-sm font-medium mb-1">Title <span className="text-rose-500">*</span></label>
                  <input required className="w-full rounded-input border border-stripe-border px-3 py-2 text-sm focus:border-stripe-blue focus:ring-1 outline-none" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea rows={2} className="w-full rounded-input border border-stripe-border px-3 py-2 text-sm focus:border-stripe-blue focus:ring-1 outline-none" value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Assign To</label>
                  <select className="w-full rounded-input border border-stripe-border px-3 py-2 text-sm focus:border-stripe-blue focus:ring-1 outline-none" value={taskForm.assigned_to} onChange={(e) => setTaskForm({ ...taskForm, assigned_to: e.target.value })}>
                    <option value="">Unassigned</option>
                    {project.members?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Due Date <span className="text-rose-500">*</span></label>
                    <input type="date" required className="w-full rounded-input border border-stripe-border px-3 py-2 text-sm focus:border-stripe-blue focus:ring-1 outline-none" value={taskForm.due_date} onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Priority</label>
                    <select className="w-full rounded-input border border-stripe-border px-3 py-2 text-sm focus:border-stripe-blue focus:ring-1 outline-none" value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Initial Status</label>
                  <select className="w-full rounded-input border border-stripe-border px-3 py-2 text-sm focus:border-stripe-blue focus:ring-1 outline-none" value={taskForm.status} onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}>
                    <option value="todo">Todo</option>
                    <option value="in_progress">In progress</option>
                  </select>
                </div>
                <div className="pt-4 mt-4 border-t border-stripe-border">
                  <label className="block text-sm font-medium mb-1">Model Prompt <span className="text-slate-500 font-normal">(Optional)</span></label>
                  <p className="text-xs text-slate-500 mb-2">Instructions specifically for the QA review workflow context.</p>
                  <textarea rows={3} className="w-full rounded-input border border-stripe-border px-3 py-2 text-sm focus:border-stripe-blue focus:ring-1 outline-none" value={taskForm.prompt} onChange={(e) => setTaskForm({ ...taskForm, prompt: e.target.value })} />
                </div>
              </form>
            </div>
            <div className="p-4 border-t border-stripe-border bg-slate-50 flex justify-end gap-3">
              <button type="button" onClick={() => setIsAddTaskOpen(false)} className="px-4 py-2 font-semibold text-sm rounded bg-white border border-stripe-border hover:bg-slate-50 transition">Cancel</button>
              <button form="add-task-form" type="submit" className="px-5 py-2 font-semibold text-sm rounded bg-stripe-blue text-white shadow-sm hover:bg-stripe-blue/90 transition">Save Task</button>
            </div>
          </div>
        </div>
      )}

      {/* EXISTING TASK MODAL (ETHARA TASK PANEL) */}
      {editingTask && (
        <EtharaTaskPanel
          task={editingTask}
          members={project.members}
          onReload={() => { loadAll(); setEditingTask(null); }}
          onDeleted={() => { loadAll(); setEditingTask(null); }}
          onClose={() => setEditingTask(null)}
        />
      )}
    </>
  );
}
