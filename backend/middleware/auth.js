const jwt = require("jsonwebtoken");
const { assigneeVisibilityClause } = require("../lib/taskVisibility");

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ error: "Missing authorization token" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const userId = payload.id;
    const role = payload.role;
    req.user = {
      id: userId,
      role,
      name: payload.name,
      /**
       * Hierarchy-enforced visibility for task listings (PostgreSQL parameterized fragment).
       */
      appendTaskAssigneeFilter(params, alias = "t") {
        return assigneeVisibilityClause(role, userId, params, alias);
      }
    };
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = authMiddleware;
