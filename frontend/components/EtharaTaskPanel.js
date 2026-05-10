"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import useAuthClientState from "@/hooks/useAuthClientState";
import { X, Trash2, Clock, CheckCircle2, ChevronRight, AlertCircle } from "lucide-react";

function isDoneLike(status) {
  return status === "done" || status === "approved";
}

const ScoreRow = ({ label, value, onChange, disabled }) => (
  <div className="mb-5">
    <label className="block text-sm font-semibold text-stripe-textPrimary mb-3 capitalize">{label.replace(/_/g, " ")}</label>
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5, 6, 7].map(num => (
        <button
          key={num}
          type="button"
          disabled={disabled}
          onClick={() => onChange(num)}
          className={`flex-1 aspect-square rounded flex items-center justify-center text-sm font-bold border transition-all duration-200 \${
            value === num 
              ? 'bg-stripe-blue border-stripe-blue text-white shadow-sm ring-2 ring-stripe-blue/20' 
              : 'bg-white border-stripe-border text-stripe-textSecondary hover:border-stripe-blue hover:text-stripe-blue disabled:opacity-50 disabled:hover:border-stripe-border disabled:hover:text-stripe-textSecondary'
          }`}
        >
          {num}
        </button>
      ))}
    </div>
  </div>
);

export default function EtharaTaskPanel({ task, members, onReload, onDeleted, onClose }) {
  const { mounted, role, userId: viewerId } = useAuthClientState();

  if (!mounted) return null;

  const privileged = ["admin", "pl"].includes(role);
  const isAssigneeTasker = role === "tasker" && viewerId && task.assigned_to === viewerId;

  const [taskerDraft, setTaskerDraft] = useState({
    prompt: task.prompt || "", response_a: task.response_a || "", response_b: task.response_b || "",
    factuality_score: task.factuality_score ?? "", helpfulness_score: task.helpfulness_score ?? "",
    safety_score: task.safety_score ?? "", rationale: task.rationale || ""
  });

  const [adminDraft, setAdminDraft] = useState({
    title: task.title, description: task.description || "", assigned_to: task.assigned_to || "", due_date: task.due_date || "",
    priority: task.priority || "medium", status: task.status, prompt: task.prompt || "", response_a: task.response_a || "",
    response_b: task.response_b || "", factuality_score: task.factuality_score ?? "", helpfulness_score: task.helpfulness_score ?? "",
    safety_score: task.safety_score ?? "", rationale: task.rationale || "", reviewed_by: task.reviewed_by ?? ""
  });

  const [qrScores, setQrScores] = useState({ factuality_score: "", helpfulness_score: "", safety_score: "" });
  const [rejectFeedback, setRejectFeedback] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const overdue = task.due_date && new Date(task.due_date) < new Date() && !isDoneLike(task.status);
  const filteredMembers = useMemo(() => members || [], [members]);

  async function saveAdminTask() {
    setError(""); setMessage("");
    try {
      await api.put(`/tasks/\${task.id}`, {
        ...adminDraft, assigned_to: adminDraft.assigned_to ? Number(adminDraft.assigned_to) : null,
        factuality_score: adminDraft.factuality_score === "" ? null : Number(adminDraft.factuality_score),
        helpfulness_score: adminDraft.helpfulness_score === "" ? null : Number(adminDraft.helpfulness_score),
        safety_score: adminDraft.safety_score === "" ? null : Number(adminDraft.safety_score),
        reviewed_by: adminDraft.reviewed_by === "" ? null : Number(adminDraft.reviewed_by)
      });
      setMessage("Task saved.");
      await onReload();
    } catch (err) { setError(err.response?.data?.error || "Failed to save task"); }
  }

  async function submitForReview() {
    setError(""); setMessage("");
    try {
      await api.put(`/tasks/\${task.id}/submit`, {
        rationale: taskerDraft.rationale, prompt: taskerDraft.prompt, response_a: taskerDraft.response_a, response_b: taskerDraft.response_b,
        factuality_score: taskerDraft.factuality_score === "" ? null : Number(taskerDraft.factuality_score),
        helpfulness_score: taskerDraft.helpfulness_score === "" ? null : Number(taskerDraft.helpfulness_score),
        safety_score: taskerDraft.safety_score === "" ? null : Number(taskerDraft.safety_score)
      });
      setMessage("Submitted for QR review.");
      await onReload();
      if (onClose) setTimeout(onClose, 1000);
    } catch (err) { setError(err.response?.data?.error || "Submission failed"); }
  }

  async function qrApprove() {
    setError(""); setMessage("");
    try {
      await api.put(`/tasks/\${task.id}/review`, {
        decision: "approved", factuality_score: Number(qrScores.factuality_score),
        helpfulness_score: Number(qrScores.helpfulness_score), safety_score: Number(qrScores.safety_score)
      });
      setMessage("Task approved.");
      await onReload();
      if (onClose) setTimeout(onClose, 1000);
    } catch (err) { setError(err.response?.data?.error || "Approve failed"); }
  }

  async function qrReject() {
    setError(""); setMessage("");
    try {
      await api.put(`/tasks/\${task.id}/review`, { decision: "rejected", feedback: rejectFeedback });
      setMessage("Task rejected with feedback.");
      setRejectFeedback("");
      await onReload();
      if (onClose) setTimeout(onClose, 1000);
    } catch (err) { setError(err.response?.data?.error || "Reject failed"); }
  }

  async function deleteTask() {
    const ok = window.confirm("Delete this task?");
    if (!ok) return;
    await api.delete(`/tasks/\${task.id}`);
    await onDeleted();
    if (onClose) onClose();
  }

  async function bumpStatus(next) {
    setError("");
    try {
      await api.put(`/tasks/\${task.id}`, { status: next });
      await onReload();
    } catch (err) { setError(err.response?.data?.error || "Status update failed"); }
  }

  const canShowTaskerComposer = isAssigneeTasker && task.status === "in_progress";
  const canStartWorkTasker = isAssigneeTasker && task.status === "todo";
  const memberSimpleStatuses = ["todo", "in_progress", "review", "done"];
  const pipelineLockedStatuses = ["submitted", "qr_review", "approved", "rejected"];
  const canQrReview = role === "qr" && task.status === "submitted";

  const isTaskerFormValid = taskerDraft.rationale.trim().length >= 20 &&
    taskerDraft.factuality_score !== "" &&
    taskerDraft.helpfulness_score !== "" &&
    taskerDraft.safety_score !== "";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="w-full max-w-2xl bg-white border-l h-full shadow-2xl relative z-10 flex flex-col transform transition-transform duration-300">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-stripe-border bg-[#F8FAFC]">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-stripe-textPrimary truncate max-w-sm">{task.title}</h2>
              <StatusBadge status={task.status} />
            </div>
            <div className="flex items-center gap-4 text-xs font-medium text-stripe-textSecondary">
              <span className="flex items-center gap-1.5"><StatusBadge status={task.priority} isPriority={true} /></span>
              <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> Due {task.due_date || "N/A"}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {privileged && (
              <button onClick={deleteTask} className="p-1.5 rounded-md text-slate-400 hover:text-stripe-danger hover:bg-rose-50 transition" title="Delete Task">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && <div className="rounded-md bg-rose-50 p-4 border border-rose-200 text-sm font-medium text-stripe-danger">{error}</div>}
          {message && <div className="rounded-md bg-emerald-50 p-4 border border-emerald-200 text-sm font-medium text-emerald-700 flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-500" /> {message}</div>}

          <div className="rounded-card border border-stripe-border shadow-sm p-4 bg-white">
            <h3 className="text-sm font-bold text-stripe-textPrimary mb-2 uppercase tracking-wider">Details</h3>
            <p className="text-sm text-stripe-textSecondary mb-4 leading-relaxed">{task.description || "No description provided."}</p>
            <div className="flex items-center gap-2 pt-4 border-t border-stripe-border">
              <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">{(task.assignee_name || "U").charAt(0).toUpperCase()}</div>
              <span className="text-sm text-stripe-textPrimary font-medium">{task.assignee_name || "Unassigned"}</span>
            </div>
          </div>

          {/* TASKER WORKFLOW */}
          {isAssigneeTasker && (
            <div className="rounded-card border border-stripe-blue/20 bg-blue-50/20 shadow-sm p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-stripe-blue"></div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-stripe-textPrimary">Tasker Workspace</h3>
                {canStartWorkTasker && (
                  <button onClick={() => bumpStatus("in_progress")} className="rounded bg-white border border-stripe-border px-3 py-1.5 text-sm font-semibold hover:bg-slate-50 transition shadow-sm">
                    Start Work
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-stripe-textPrimary mb-1">Prompt Configuration</label>
                  <textarea disabled={!canShowTaskerComposer} className="w-full rounded-input border border-stripe-border px-3 py-2 text-sm bg-white focus:ring-1 focus:ring-stripe-blue disabled:bg-slate-50 disabled:text-slate-500" rows={3} value={taskerDraft.prompt} onChange={(e) => setTaskerDraft({ ...taskerDraft, prompt: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-stripe-textPrimary mb-1">Model Response A</label>
                    <textarea disabled={!canShowTaskerComposer} className="w-full rounded-input border border-stripe-border px-3 py-2 text-sm bg-white focus:ring-1 focus:ring-stripe-blue disabled:bg-slate-50 disabled:text-slate-500" rows={4} value={taskerDraft.response_a} onChange={(e) => setTaskerDraft({ ...taskerDraft, response_a: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-stripe-textPrimary mb-1">Model Response B</label>
                    <textarea disabled={!canShowTaskerComposer} className="w-full rounded-input border border-stripe-border px-3 py-2 text-sm bg-white focus:ring-1 focus:ring-stripe-blue disabled:bg-slate-50 disabled:text-slate-500" rows={4} value={taskerDraft.response_b} onChange={(e) => setTaskerDraft({ ...taskerDraft, response_b: e.target.value })} />
                  </div>
                </div>

                <div className="py-6 my-6 border-y border-stripe-border">
                  <h4 className="text-sm font-bold text-stripe-textPrimary mb-4 uppercase tracking-wider">Evaluation Scores</h4>
                  {["factuality_score", "helpfulness_score", "safety_score"].map(field => (
                    <ScoreRow key={field} label={field} value={Number(taskerDraft[field])} disabled={!canShowTaskerComposer} onChange={(val) => setTaskerDraft({ ...taskerDraft, [field]: val })} />
                  ))}
                </div>

                <div>
                  <div className="flex justify-between items-end mb-1">
                    <label className="block text-sm font-semibold text-stripe-textPrimary">Rationale</label>
                    <span className={`text-xs font-semibold \${taskerDraft.rationale.length < 20 ? 'text-stripe-danger' : 'text-emerald-600'}`}>{taskerDraft.rationale.length} / 20 min</span>
                  </div>
                  <textarea disabled={!canShowTaskerComposer} className="w-full rounded-input border border-stripe-border px-3 py-2 text-sm bg-white focus:ring-1 focus:ring-stripe-blue disabled:bg-slate-50 disabled:text-slate-500" rows={4} placeholder="Please explain your reasoning thoroughly..." value={taskerDraft.rationale} onChange={(e) => setTaskerDraft({ ...taskerDraft, rationale: e.target.value })} />
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                {canShowTaskerComposer ? (
                  <button onClick={submitForReview} disabled={!isTaskerFormValid} className="rounded-input bg-stripe-blue px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-stripe-blue/90 disabled:opacity-50 disabled:hover:bg-stripe-blue transition-colors">
                    Submit for QR Review
                  </button>
                ) : (
                  <div className="px-4 py-2 bg-slate-100 rounded text-sm text-slate-500 border border-slate-200">
                    <AlertCircle className="h-4 w-4 inline-block mr-1.5 -mt-0.5" />
                    Submission unlocks while the task is <span className="font-semibold text-slate-700">in progress</span>.
                  </div>
                )}
              </div>
            </div>
          )}



          {/* QR REVIEW WORKFLOW */}
          {canQrReview && (
            <div className="rounded-card border border-amber-200 bg-amber-50/30 p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
              <h3 className="text-lg font-bold text-stripe-textPrimary mb-4">Quality Assurance Review</h3>

              <div className="rounded border border-stripe-border bg-white p-4 mb-6 text-sm">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div><div className="text-xs font-bold text-stripe-textSecondary uppercase tracking-wider mb-1">Prompt</div><p className="bg-slate-50 p-2 rounded border border-slate-100">{task.prompt || "N/A"}</p></div>
                  <div><div className="text-xs font-bold text-stripe-textSecondary uppercase tracking-wider mb-1">Response A</div><p className="bg-slate-50 p-2 rounded border border-slate-100">{task.response_a || "N/A"}</p></div>
                  <div className="col-span-2"><div className="text-xs font-bold text-stripe-textSecondary uppercase tracking-wider mb-1">Response B</div><p className="bg-slate-50 p-2 rounded border border-slate-100">{task.response_b || "N/A"}</p></div>
                  <div className="col-span-2"><div className="text-xs font-bold text-stripe-textSecondary uppercase tracking-wider mb-1">Tasker Rationale</div><p className="bg-slate-50 p-2 rounded border border-slate-100 font-medium">{task.rationale || "N/A"}</p></div>
                </div>
                <div className="flex gap-6 mt-4 pt-4 border-t border-stripe-border">
                  <div className="flex flex-col"><span className="text-[10px] uppercase font-bold text-slate-500">Factuality</span><span className="text-lg font-bold text-stripe-textPrimary">{task.factuality_score || "-"}</span></div>
                  <div className="flex flex-col"><span className="text-[10px] uppercase font-bold text-slate-500">Helpfulness</span><span className="text-lg font-bold text-stripe-textPrimary">{task.helpfulness_score || "-"}</span></div>
                  <div className="flex flex-col"><span className="text-[10px] uppercase font-bold text-slate-500">Safety</span><span className="text-lg font-bold text-stripe-textPrimary">{task.safety_score || "-"}</span></div>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <h4 className="text-sm font-bold text-stripe-textPrimary uppercase tracking-wider mb-2">QR Validation Scores</h4>
                {["factuality_score", "helpfulness_score", "safety_score"].map(field => (
                  <ScoreRow key={field} label={field} value={Number(qrScores[field])} onChange={(val) => setQrScores({ ...qrScores, [field]: val })} />
                ))}

                <div className="flex items-center gap-3 pt-4">
                  <button onClick={qrApprove} disabled={!qrScores.factuality_score || !qrScores.helpfulness_score || !qrScores.safety_score} className="flex-1 rounded border border-emerald-600 bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-50">
                    Approve Task
                  </button>
                </div>

                <div className="pt-6 border-t border-stripe-border mt-6">
                  <label className="block text-sm font-semibold text-stripe-textPrimary mb-2">Reject Feedback</label>
                  <textarea className="w-full rounded-input border border-stripe-border px-3 py-2 text-sm focus:ring-1 focus:ring-stripe-blue bg-white" rows={2} placeholder="Explain why this requires rework..." value={rejectFeedback} onChange={(e) => setRejectFeedback(e.target.value)} />
                  <button onClick={qrReject} disabled={!rejectFeedback} className="w-full mt-3 rounded border border-rose-600 bg-white text-rose-600 px-4 py-2 font-semibold hover:bg-rose-50 transition disabled:opacity-50">
                    Reject to Tasker
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ADMIN FULL EDIT */}
          {privileged && (
            <div className="rounded-card border border-stripe-border p-6 shadow-sm bg-white">
              <h3 className="text-lg font-bold text-stripe-textPrimary mb-5">Administrator Workspace</h3>
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">Title</label>
                    <input className="w-full rounded-input border border-stripe-border px-3 py-2 text-sm focus:border-stripe-blue focus:ring-1 outline-none" value={adminDraft.title} onChange={(e) => setAdminDraft({ ...adminDraft, title: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Due Date</label>
                    <input type="date" className="w-full rounded-input border border-stripe-border px-3 py-2 text-sm focus:border-stripe-blue focus:ring-1 outline-none" value={adminDraft.due_date} onChange={(e) => setAdminDraft({ ...adminDraft, due_date: e.target.value })} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">Description</label>
                  <textarea rows={2} className="w-full rounded-input border border-stripe-border px-3 py-2 text-sm focus:border-stripe-blue focus:ring-1 outline-none" value={adminDraft.description} onChange={(e) => setAdminDraft({ ...adminDraft, description: e.target.value })} />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">Assignee</label>
                    <select className="w-full rounded-input border border-stripe-border px-3 py-2 text-sm" value={adminDraft.assigned_to} onChange={(e) => setAdminDraft({ ...adminDraft, assigned_to: e.target.value })}>
                      <option value="">Unassigned</option>
                      {filteredMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Priority</label>
                    <select className="w-full rounded-input border border-stripe-border px-3 py-2 text-sm" value={adminDraft.priority} onChange={(e) => setAdminDraft({ ...adminDraft, priority: e.target.value })}>
                      <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Status</label>
                    <select className="w-full rounded-input border border-stripe-border px-3 py-2 text-sm" value={adminDraft.status} onChange={(e) => setAdminDraft({ ...adminDraft, status: e.target.value })}>
                      {["todo", "in_progress", "review", "done", "submitted", "qr_review", "approved", "rejected"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-stripe-border">
                  <label className="block text-sm font-semibold mb-1">Model Prompt</label>
                  <textarea rows={2} className="w-full rounded-input border border-stripe-border px-3 py-2 text-sm" value={adminDraft.prompt} onChange={(e) => setAdminDraft({ ...adminDraft, prompt: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">Response A</label>
                    <textarea rows={3} className="w-full rounded-input border border-stripe-border px-3 py-2 text-sm" value={adminDraft.response_a} onChange={(e) => setAdminDraft({ ...adminDraft, response_a: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Response B</label>
                    <textarea rows={3} className="w-full rounded-input border border-stripe-border px-3 py-2 text-sm" value={adminDraft.response_b} onChange={(e) => setAdminDraft({ ...adminDraft, response_b: e.target.value })} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">QA Scores Component override</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["factuality_score", "helpfulness_score", "safety_score"].map(f => (
                      <div key={f} className="flex border rounded px-2 items-center bg-slate-50"><span className="text-xs font-semibold mr-2">{f.split('_')[0].substring(0, 3)}</span><input type="number" min="1" max="7" className="w-full py-1 text-sm bg-transparent outline-none" value={adminDraft[f]} onChange={(e) => setAdminDraft({ ...adminDraft, [f]: e.target.value })} /></div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button onClick={saveAdminTask} className="rounded-input bg-stripe-blue px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-stripe-blue/90 transition-colors">
                    Force Update Task Data
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
