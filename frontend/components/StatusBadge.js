import { Badge } from "./ui/badge";

export default function StatusBadge({ status, isPriority = false }) {
  if (isPriority) {
    const pMap = {
      high: "bg-red-50 text-red-700 border-red-200",
      medium: "bg-amber-50 text-amber-700 border-amber-200",
      low: "bg-green-50 text-green-700 border-green-200"
    };
    const classes = pMap[status?.toLowerCase()] || pMap.medium;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 border rounded-full text-xs font-semibold capitalize ${classes}`}>
        {status || "Medium"}
      </span>
    );
  }

  const map = {
    todo: "bg-gray-100 text-gray-600 border-gray-200",
    in_progress: "bg-blue-50 text-blue-700 border-blue-200",
    review: "bg-amber-50 text-amber-700 border-amber-200",
    done: "bg-green-50 text-green-700 border-green-200",
    submitted: "bg-violet-50 text-violet-700 border-violet-200",
    qr_review: "bg-orange-50 text-orange-700 border-orange-200",
    approved: "bg-green-50 text-green-700 border-green-200",
    rejected: "bg-red-50 text-red-700 border-red-200"
  };

  const classes = map[status] || map.todo;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 border rounded-full text-[10px] font-bold uppercase tracking-wider ${classes}`}>
      {(status || "todo").replace(/_/g, " ")}
    </span>
  );
}
