import Link from "next/link";
import { ArrowRight, MoreHorizontal, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";

export default function ProjectCard({ project, role, onUpdate }) {
  const isComplete = project.completion_rate === 100;

  let statusBadgeColor = "bg-stripe-blue/10 text-stripe-blue border-stripe-blue/20";
  let statusText = "Active";
  let accentBorder = "border-l-stripe-blue";

  if (project.status === 'in_review') {
    statusBadgeColor = "bg-amber-50 text-amber-700 border-amber-200/50";
    statusText = "Review";
    accentBorder = "border-l-amber-500";
  } else if (project.status === 'completed' || isComplete) {
    statusBadgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200/50";
    statusText = "Done";
    accentBorder = "border-l-emerald-500";
  }

  const handleReadyForReview = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/projects/${project.id}/status`, { status: "in_review" });
      if (onUpdate) onUpdate();
    } catch (err) { console.error(err); }
  };

  return (
    <div className={`relative flex flex-col h-full rounded-card border-y border-r border-l-[6px] ${accentBorder} border-stripe-border bg-white p-5 hover:shadow-card hover:-translate-y-0.5 transition-all duration-200 group`}>
      <Link href={`/projects/${project.id}`} className="absolute inset-0 z-0" aria-label="View Project" />

      <div className="flex justify-between items-start mb-2 relative z-10 pointer-events-none">
        <div>
          <h3 className="text-lg font-bold text-stripe-textPrimary group-hover:text-stripe-blue transition-colors pr-2 leading-tight">{project.name}</h3>
          {role === 'admin' && project.pl_name && (
            <p className="text-xs text-stripe-textSecondary mt-1">Lead: <span className="font-medium text-slate-700">{project.pl_name}</span></p>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-2 pointer-events-auto">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border uppercase tracking-wide ${statusBadgeColor}`}>{statusText}</span>
          {role === 'admin' && (
            <button className="p-1 hover:bg-slate-100 rounded-md transition-colors" title="Options">
              <MoreHorizontal className="h-4 w-4 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      <p className="mt-2 text-sm text-stripe-textSecondary line-clamp-2 flex-grow relative z-10 pointer-events-none">{project.description || "No description provided."}</p>

      <div className="mt-6 flex items-center justify-between relative z-10 pointer-events-none">
        <div className="flex -space-x-2">
          {Array.from({ length: Math.min(3, project.member_count || 3) }).map((_, i) => (
            <div key={i} className="h-8 w-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-xs text-slate-500 font-bold shadow-sm">U</div>
          ))}
          {(project.member_count || 3) > 3 && (
            <div className="h-8 w-8 rounded-full bg-slate-50 border-2 border-white flex items-center justify-center text-[10px] text-slate-500 font-medium shadow-sm z-10">
              +{(project.member_count || 3) - 3}
            </div>
          )}
        </div>

        <div className="text-right">
          <div className="text-sm font-bold text-stripe-textPrimary">{project.completion_rate ?? 0}%</div>
          <div className="text-[11px] text-stripe-textSecondary font-medium uppercase tracking-wide">Complete</div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-stripe-border flex justify-between items-center text-sm font-semibold text-stripe-blue relative z-10">
        <span className="pointer-events-none">Open Project</span>

        <div className="flex items-center gap-3">
          {role === 'pl' && isComplete && project.status === 'active' && (
            <button onClick={handleReadyForReview} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md transition-colors pointer-events-auto text-xs font-bold border border-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5" /> Ready for Review
            </button>
          )}
          <div className="pointer-events-none"><ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" /></div>
        </div>
      </div>
    </div>
  );
}
