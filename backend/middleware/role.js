function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }

  return next();
}

/** Admin or PL (lead) — privileged project/task authoring. */
function requireAdminOrPL(req, res, next) {
  if (!req.user || !["admin", "pl"].includes(req.user.role)) {
    return res.status(403).json({ error: "Admin or PL access required" });
  }
  return next();
}

module.exports = {
  requireAdmin,
  requireAdminOrPL
};
