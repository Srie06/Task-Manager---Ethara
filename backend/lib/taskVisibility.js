/**
 * Appends parameterized SQL predicates for hierarchical task visibility.
 * Uses tasks table alias `t` unless `alias` is passed.
 *
 * Roles:
 * - admin: no extra predicate
 * - tasker/member: only tasks assigned_to self
 * - qr: assigned_to IN (direct taskers whose parent_id = qr)
 * - pl: assignments to QRs under this PL plus taskers under those QRs
 */
function assigneeVisibilityClause(role, userId, params, alias = "t") {
  if (role === "admin") {
    return "";
  }

  if (role === "tasker" || role === "member") {
    params.push(userId);
    const idx = params.length;
    return ` AND ${alias}.assigned_to = $${idx}`;
  }

  if (role === "qr") {
    params.push(userId);
    const idx = params.length;
    return ` AND ${alias}.assigned_to IN (SELECT id FROM users WHERE parent_id = $${idx})`;
  }

  if (role === "pl") {
    params.push(userId);
    const idx = params.length;
    return ` AND ${alias}.assigned_to IN (
      SELECT id FROM users WHERE parent_id = $${idx} AND role = 'qr'
      UNION
      SELECT u.id FROM users u
      INNER JOIN users qr ON qr.id = u.parent_id
      WHERE u.role = 'tasker' AND qr.parent_id = $${idx} AND qr.role = 'qr'
    )`;
  }

  return "";
}

module.exports = {
  assigneeVisibilityClause
};
