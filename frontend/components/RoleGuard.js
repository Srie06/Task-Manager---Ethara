"use client";

import useAuthClientState from "@/hooks/useAuthClientState";

/**
 * Restricts UI to specific roles (default: admins only — legacy compatibility).
 */
export default function RoleGuard({ children, allow = ["admin"] }) {
  const { mounted, role } = useAuthClientState();

  if (!mounted) return null;
  if (!allow.includes(role)) return null;
  return children;
}
