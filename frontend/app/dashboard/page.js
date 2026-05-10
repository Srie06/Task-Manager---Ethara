"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import Navbar from "@/components/Navbar";
import StatusBadge from "@/components/StatusBadge";
import api from "@/lib/api";
import useAuthClientState from "@/hooks/useAuthClientState";
import {
  LayoutDashboard, CheckCircle2, Clock, AlertTriangle, Plus,
  MoreHorizontal, Activity, ArrowRight, Play, AlertCircle
} from "lucide-react";
import Link from "next/link";

function isOverdueRow(task) {
  return task.due_date && new Date(task.due_date) < new Date() && !["done", "approved"].includes(task.status);
}

function StatCard({ title, value, icon, trend }) {
  return (
    <div className="rounded-card border border-stripe-border bg-stripe-card shadow-sm p-4 hover:shadow-card transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
          {icon}
        </div>
      </div>
      <div className="mt-2 text-3xl font-bold text-stripe-textPrimary">{value}</div>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-sm font-medium text-stripe-textSecondary tracking-wide">{title}</span>
        {trend && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600">{trend}</span>}
      </div>
    </div>
  );
}

function AdminDashboard({ data, role, onPlAction }) {
  const chartData = useMemo(() => {
    return [
      { name: "Todo", value: data.byStatus.todo || 0, color: "#697386" }, // updated base color
      { name: "In Progress", value: data.byStatus.in_progress || 0, color: "#0EA5E9" },
      { name: "Review", value: (data.byStatus.submitted || 0) + (data.byStatus.qr_review || 0), color: "#F59E0B" },
      { name: "Done", value: (data.byStatus.approved || 0) + (data.byStatus.done || 0), color: "#10B981" },
    ];
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-stripe-textPrimary tracking-tight">Good morning, {role === "admin" ? "Admin" : "Project Lead"}</h1>
          <p className="text-stripe-textSecondary mt-1">Here's your workspace overview</p>
        </div>
        <Link href="/projects" className="inline-flex items-center gap-2 rounded-md bg-stripe-blue px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-stripe-blue/90 transition-colors">
          <Plus className="h-4 w-4" /> New Task
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Tasks" value={data.totalTasks} icon={<LayoutDashboard className="h-5 w-5 text-stripe-blue" />} />
        <StatCard title="In Progress" value={data.byStatus.in_progress || 0} icon={<Clock className="h-5 w-5 text-amber-500" />} />
        <StatCard title="Completed" value={(data.byStatus.approved || 0) + (data.byStatus.done || 0)} icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />} />
        <StatCard title="Overdue" value={data.overdue?.length || 0} icon={<AlertTriangle className="h-5 w-5 text-rose-500" />} />
      </div>

      <div className="rounded-card border border-stripe-border bg-stripe-card shadow-card overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-stripe-border">
          <h2 className="text-lg font-bold text-stripe-textPrimary">Projects</h2>
          <Link href="/projects" className="text-sm font-medium text-stripe-blue hover:underline">New Project</Link>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-[#F8FAFC] text-stripe-textSecondary font-medium border-b border-stripe-border">
              <tr>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Domain</th>
                <th className="py-3 px-4">Members</th>
                <th className="py-3 px-4">Tasks</th>
                <th className="py-3 px-4 w-48">Progress</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stripe-border">
              {data.completionRate.map(p => (
                <tr key={p.projectId} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-medium text-stripe-textPrimary">
                    <Link href={`/projects/${p.projectId}`}>{p.projectName}</Link>
                  </td>
                  <td className="py-3 px-4 text-stripe-textSecondary">Platform</td>
                  <td className="py-3 px-4">
                    <div className="flex -space-x-2">
                      <div className="h-6 w-6 rounded-full bg-slate-200 border-2 border-white"></div>
                      <div className="h-6 w-6 rounded-full bg-slate-300 border-2 border-white"></div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-stripe-textSecondary">{p.done} / {p.total}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-stripe-blue rounded-full" style={{ width: `${p.rate}%` }}></div>
                      </div>
                      <span className="text-xs font-medium w-8 text-right">{p.rate}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">Active</span>
                  </td>
                  <td className="py-3 px-4 text-right text-slate-400 cursor-pointer hover:text-slate-600">
                    <MoreHorizontal className="h-4 w-4 inline-block" />
                  </td>
                </tr>
              ))}
              {data.completionRate.length === 0 && (
                <tr><td colSpan="7" className="py-6 text-center text-slate-500">No projects found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {role === "pl" && data.plReviewTasks && data.plReviewTasks.length > 0 && (
        <div className="rounded-card border border-stripe-border bg-stripe-card shadow-card overflow-hidden mt-6">
          <div className="flex items-center justify-between p-4 border-b border-stripe-border bg-indigo-50/50">
            <div>
              <h2 className="text-lg font-bold text-indigo-900">QR Decisions</h2>
              <p className="text-sm text-indigo-700">Review QR actions across your projects and override if necessary.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-[#F8FAFC] text-stripe-textSecondary font-medium border-b border-stripe-border">
                <tr>
                  <th className="py-3 px-4">Task</th>
                  <th className="py-3 px-4">Tasker</th>
                  <th className="py-3 px-4">QR Reviewer</th>
                  <th className="py-3 px-4 w-32">QR Decision</th>
                  <th className="py-3 px-4 w-56 text-right">PL Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stripe-border">
                {data.plReviewTasks.map(task => (
                  <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-stripe-textPrimary">{task.title}</td>
                    <td className="py-3 px-4 text-stripe-textSecondary">{task.assignee_name || "-"}</td>
                    <td className="py-3 px-4">
                      {task.qr_reviewer_name ? (
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                            {task.qr_reviewer_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-700">{task.qr_reviewer_name}</span>
                        </div>
                      ) : "-"}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      {task.pl_decision ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wide ${task.pl_decision === 'confirmed' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>{task.pl_decision}</span>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => onPlAction(task.id, 'confirmed')} className="px-2.5 py-1 text-xs font-semibold rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition">Confirm</button>
                          <button onClick={() => onPlAction(task.id, 'overridden')} className="px-2.5 py-1 text-xs font-semibold rounded bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 transition">Override</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6 w-full mt-6">
        <div className="rounded-card border border-stripe-border bg-stripe-card shadow-card p-4 min-h-[240px]">
          <h2 className="text-lg font-bold text-stripe-textPrimary mb-4">Task Status</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#697386' }} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: '1px solid #E3E8EE', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-card border border-stripe-border bg-stripe-card shadow-card p-4">
          <h2 className="text-lg font-bold text-stripe-textPrimary mb-4">Recent Activity</h2>
          <div className="space-y-6">
            {/* Mocked activity feed */}
            <div className="flex gap-3">
              <div className="mt-1 bg-blue-100 p-1.5 rounded-full text-stripe-blue"><CheckCircle2 className="h-3 w-3" /></div>
              <div>
                <p className="text-sm text-stripe-textPrimary"><span className="font-bold">Alex</span> completed the authentication endpoint.</p>
                <span className="text-xs text-stripe-textSecondary">2 hours ago</span>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="mt-1 bg-amber-100 p-1.5 rounded-full text-amber-600"><Activity className="h-3 w-3" /></div>
              <div>
                <p className="text-sm text-stripe-textPrimary"><span className="font-bold">Sarah</span> submitted UI task for review.</p>
                <span className="text-xs text-stripe-textSecondary">4 hours ago</span>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="mt-1 bg-emerald-100 p-1.5 rounded-full text-emerald-600"><CheckCircle2 className="h-3 w-3" /></div>
              <div>
                <p className="text-sm text-stripe-textPrimary"><span className="font-bold">You</span> approved project timeline.</p>
                <span className="text-xs text-stripe-textSecondary">Yesterday</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QrDashboard({ focusRows, submittedRows, handleQrDecision, pendingCount }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <h1 className="text-3xl font-bold text-stripe-textPrimary tracking-tight">Review Queue</h1>
      </div>

      {pendingCount > 0 && (
        <div className="rounded-card bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <h3 className="font-bold text-amber-800">{pendingCount} tasks awaiting your review</h3>
            <p className="text-sm text-amber-700 mt-1">Please review the tasks below to unblock your taskers.</p>
          </div>
        </div>
      )}

      <div className="rounded-card border border-stripe-border bg-stripe-card shadow-card overflow-hidden">
        <div className="p-4 border-b border-stripe-border">
          <h2 className="text-lg font-bold text-stripe-textPrimary">Tasks to Review</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-[#F8FAFC] text-stripe-textSecondary font-medium border-b border-stripe-border">
              <tr>
                <th className="py-3 px-4">Task</th>
                <th className="py-3 px-4">Tasker</th>
                <th className="py-3 px-4">Project</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stripe-border">
              {submittedRows.map((task) => (
                <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-medium text-stripe-textPrimary">{task.title}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                        {(task.assignee_name || "U").charAt(0).toUpperCase()}
                      </div>
                      <span>{task.assignee_name || "-"}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-stripe-textSecondary">{task.project_name}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={task.priority} />
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button onClick={() => handleQrDecision(task, "approved")} className="inline-flex items-center px-3 py-1.5 rounded bg-emerald-600 text-white font-medium text-xs hover:bg-emerald-700 transition">Approve</button>
                    <button onClick={() => handleQrDecision(task, "rejected")} className="inline-flex items-center px-3 py-1.5 rounded bg-rose-600 text-white font-medium text-xs hover:bg-rose-700 transition">Reject</button>
                  </td>
                </tr>
              ))}
              {submittedRows.length === 0 && (
                <tr><td colSpan="5" className="py-8 text-center"><div className="flex flex-col items-center"><CheckCircle2 className="h-8 w-8 text-emerald-400 mb-2" /><span className="text-slate-500 font-medium">All caught up! No tasks to review.</span></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-bold text-stripe-textPrimary mb-4">Your Taskers</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from(new Set(focusRows.filter(r => r.assignee_name).map(r => r.assignee_name))).map(name => (
            <div key={name} className="flex items-center gap-3 rounded-card border border-stripe-border p-4 bg-white shadow-sm hover:shadow transition">
              <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-100 to-purple-100 border border-indigo-200 flex items-center justify-center font-bold text-indigo-700 text-lg">
                {name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-stripe-textPrimary">{name}</p>
                <p className="text-xs text-stripe-textSecondary">Tasker</p>
              </div>
            </div>
          ))}
          {focusRows.length === 0 && <p className="text-sm text-slate-500">No taskers found.</p>}
        </div>
      </div>
    </div>
  );
}

function TaskerDashboard({ data, handleSubmitForReview }) {
  const assigned = data.myTasks.length;
  const inProgress = data.myTasks.filter(t => t.status === "in_progress").length;
  const completed = data.myTasks.filter(t => ["done", "approved", "submitted", "qr_review"].includes(t.status)).length;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-stripe-textPrimary tracking-tight">My Work</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Assigned" value={assigned} icon={<LayoutDashboard className="h-5 w-5 text-stripe-blue" />} />
        <StatCard title="In Progress" value={inProgress} icon={<Clock className="h-5 w-5 text-amber-500" />} />
        <StatCard title="Completed" value={completed} icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />} />
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-bold text-stripe-textPrimary mb-4">Upcoming Tasks</h2>
        <div className="grid grid-cols-1 gap-4">
          {data.myTasks.map((task) => {
            const isRejected = task.status === "rejected";
            const plOverrodeToApproved = task.pl_decision === 'overridden' && task.status === 'approved';
            const plOverrodeToRejected = task.pl_decision === 'overridden' && task.status === 'rejected';

            return (
              <div key={task.id} className={`rounded-card bg-white border ${isRejected ? 'border-rose-300' : plOverrodeToApproved ? 'border-indigo-300' : 'border-stripe-border'} shadow-sm p-4 hover:shadow transition`}>
                {isRejected && !plOverrodeToRejected && (
                  <div className="mb-4 rounded bg-rose-50 px-3 py-2 text-sm text-rose-800 flex items-start gap-2 border border-rose-100">
                    <AlertCircle className="h-4 w-4 mt-0.5 text-rose-600" />
                    <div>
                      <span className="font-bold">Rejected by QR: </span> Please see feedback and fix the task.
                    </div>
                  </div>
                )}
                {plOverrodeToRejected && (
                  <div className="mb-4 rounded bg-rose-50 px-3 py-2 text-sm text-rose-800 flex items-start gap-2 border border-rose-200">
                    <AlertTriangle className="h-4 w-4 mt-0.5 text-rose-700" />
                    <div>
                      <span className="font-bold">Rejected by PL: </span> {task.pl_feedback || "The Project Lead overrode the QR decision and rejected this task."}
                    </div>
                  </div>
                )}
                {plOverrodeToApproved && (
                  <div className="mb-4 rounded bg-indigo-50 px-3 py-2 text-sm text-indigo-800 flex items-start gap-2 border border-indigo-200">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-indigo-700" />
                    <div>
                      <span className="font-bold">Approved by PL: </span> The Project Lead overrode the QR decision and approved your task.
                    </div>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-lg text-stripe-textPrimary">{task.title}</p>
                      <StatusBadge status={task.status} />
                    </div>
                    <p className="text-sm text-stripe-textSecondary font-medium">{task.project_name}</p>

                    <div className="flex gap-4 mt-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1.5"><StatusBadge status={task.priority} /></div>
                      <div className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-slate-400" /> {task.due_date || "No due date"}</div>
                    </div>
                  </div>

                  <div className="flex flex-col justify-center sm:items-end gap-2 shrink-0">
                    {task.status === "todo" && (
                      <button className="rounded px-4 py-2 bg-stripe-background text-stripe-textPrimary border border-stripe-border font-medium text-sm hover:bg-slate-100 transition inline-flex items-center gap-1.5">
                        <Play className="h-3.5 w-3.5" /> Start Work
                      </button>
                    )}
                    {(task.status === "in_progress" || task.status === "rejected") && (
                      <button onClick={() => handleSubmitForReview(task)} className="rounded px-4 py-2 bg-stripe-blue text-white font-medium text-sm hover:bg-stripe-blue/90 shadow-sm transition inline-flex items-center gap-1.5">
                        Submit for Review <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {["submitted", "qr_review"].includes(task.status) && (
                      <span className="text-sm text-slate-500 font-medium bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200 inline-block">Under Review</span>
                    )}
                    {["approved", "done"].includes(task.status) && (
                      <span className="text-sm text-emerald-600 font-medium bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Completed</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          {data.myTasks.length === 0 && (
            <div className="p-12 text-center rounded-card border border-stripe-border border-dashed mt-4 bg-white">
              <CheckCircle2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-700 mb-1">No assigned tasks</h3>
              <p className="text-slate-500">You're all caught up on your work.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const { mounted, token, role } = useAuthClientState();

  useEffect(() => {
    if (!mounted) return;
    if (!token) {
      router.push("/login");
      return;
    }
    api
      .get("/dashboard")
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || "Failed to load dashboard"));
  }, [mounted, token, router]);

  const focusRows = useMemo(() => {
    if (!data) return [];
    if (!role) return [];
    if (role === "admin" || role === "pl" || role === "qr") {
      return data.scopedTasks || [];
    }
    return data.scopedTasks || data.myTasks || [];
  }, [data, role]);

  const submittedRows = useMemo(
    () => focusRows.filter((task) => task.status === "submitted"),
    [focusRows]
  );

  if (!mounted) return null;

  async function reloadDashboard() {
    const response = await api.get("/dashboard");
    setData(response.data);
  }

  async function handleSubmitForReview(task) {
    const rationale = window.prompt("Enter rationale (minimum 20 characters):", task.rationale || "");
    if (!rationale) return;
    try {
      await api.put(`/tasks/${task.id}/submit`, { rationale });
      await reloadDashboard();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit task");
    }
  }

  async function handleQrDecision(task, decision) {
    try {
      if (decision === "approved") {
        const factuality = window.prompt("Factuality score (1-7):", "5");
        const helpfulness = window.prompt("Helpfulness score (1-7):", "5");
        const safety = window.prompt("Safety score (1-7):", "5");
        if (!factuality || !helpfulness || !safety) return;
        await api.put(`/tasks/${task.id}/review`, {
          decision: "approved",
          factuality_score: Number(factuality),
          helpfulness_score: Number(helpfulness),
          safety_score: Number(safety)
        });
      } else {
        const feedback = window.prompt("Feedback for rejection:", "");
        await api.put(`/tasks/${task.id}/review`, {
          decision: "rejected",
          feedback: feedback || ""
        });
      }
      await reloadDashboard();
    } catch (err) {
      setError(err.response?.data?.error || `Failed to ${decision} task`);
    }
  }

  async function handlePlAction(taskId, decision) {
    const feedback = decision === "overridden" ? window.prompt("Reason for override:", "") : "";
    if (decision === "overridden" && feedback === null) return;
    try {
      await api.put(`/tasks/${taskId}/pl-review`, { decision, feedback: feedback || "" });
      await reloadDashboard();
    } catch (err) { setError(err.response?.data?.error || "Failed PL review"); }
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="w-full px-6 py-6">
          <div className="bg-red-50 text-red-600 p-4 rounded border border-red-200">{error}</div>
        </div>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <Navbar />
        <div className="w-full px-6 py-6">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-slate-200 rounded w-1/4"></div>
            <div className="grid grid-cols-4 gap-4"><div className="h-24 bg-slate-200 rounded"></div><div className="h-24 bg-slate-200 rounded"></div></div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      {/* full width layout */}
      <div className="w-full px-6 py-6">
        {(() => {
          if (role === "admin" || role === "pl") {
            return <AdminDashboard data={data} role={role} onPlAction={handlePlAction} />;
          }
          if (role === "qr") {
            return <QrDashboard focusRows={focusRows} submittedRows={submittedRows} handleQrDecision={handleQrDecision} pendingCount={data.pendingReviewCount || 0} />;
          }
          return <TaskerDashboard data={data} handleSubmitForReview={handleSubmitForReview} />;
        })()}
      </div>
    </>
  );
}
