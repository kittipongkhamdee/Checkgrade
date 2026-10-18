"use client";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type Profile = { id: string; email: string; full_name: string; role: "admin" | "teacher"; active: boolean };

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sb = supabase();
    const load = async (s: Session | null) => {
      setSession(s);
      if (s) {
        const { data } = await sb.from("profiles").select("*").eq("id", s.user.id).single();
        setProfile(data as Profile | null);
      } else setProfile(null);
      setReady(true);
    };
    sb.auth.getSession().then(({ data }) => load(data.session));
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => load(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, profile, ready };
}

export async function logTeacher(action: string, name: string, role: "teacher" | "admin" = "teacher") {
  const sb = supabase();
  const { data } = await sb.auth.getUser();
  if (data.user) await sb.from("access_logs").insert({ role, actor: data.user.id, name, action });
}
