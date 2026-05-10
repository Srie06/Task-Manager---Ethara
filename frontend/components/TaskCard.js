import StatusBadge from "./StatusBadge";

export default function TaskCard({ task, onStatusChange }) {
  const overdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "done";

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{task.title}</h3>
        <StatusBadge status={task.status} />
      </div>
      <p className="mt-1 text-sm text-slate-600">{task.description || "No description"}</p>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span>Assignee: {task.assignee_name || "Unassigned"}</span>
        <span className={overdue ? "font-medium text-red-600" : ""}>
          Due: {task.due_date || "N/A"}
        </span>
      </div>
      {onStatusChange ? (
        <select
          className="mt-3 w-full rounded border px-2 py-1"
          value={task.status}
          onChange={(e) => onStatusChange(task.id, e.target.value)}
        >
          <option value="todo">Todo</option>
          <option value="in_progress">In Progress</option>
          <option value="review">Review</option>
          <option value="done">Done</option>
        </select>
      ) : null}
    </div>
  );
}
