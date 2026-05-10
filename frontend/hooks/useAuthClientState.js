"use client";

import { useEffect, useState } from "react";
import { getRole, getToken, getUserId } from "@/lib/auth";

export default function useAuthClientState() {
  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    setToken(getToken());
    setRole(getRole());
    setUserId(getUserId());
    setMounted(true);
  }, []);

  return { mounted, token, role, userId };
}
