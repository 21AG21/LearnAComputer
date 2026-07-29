"use client";

import { supabase } from "./supabase";

/**
 * Classrooms.
 *
 * An instructor makes a class and reads out a six-character code. Learners type
 * that code once, and from then on the instructor can see how far each of them
 * has got — nothing else. The roster carries a name the learner chose and a list
 * of finished lesson slugs. Not their email, not what they typed, not how long
 * they took, not what they got wrong; none of that is collected anywhere.
 *
 * Every query here is also enforced in the database by row-level security, so a
 * bug in this file cannot show one instructor another instructor's learners.
 * See supabase/migrations/20260728_classes_and_instructor_visibility.sql.
 */

export interface ClassRow {
  id: string;
  name: string;
  join_code: string;
  created_at: string;
}

export interface RosterEntry {
  learnerId: string;
  displayName: string;
  joinedAt: string;
  completedSlugs: string[];
}

export interface Membership {
  classId: string;
  className: string;
  displayName: string;
}

/** Accounts are optional; without Supabase configured, classes simply do not exist. */
export const classesEnabled = () => supabase !== null;

export async function listClasses(): Promise<ClassRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("classes")
    .select("id, name, join_code, created_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createClass(name: string, ownerId: string): Promise<ClassRow> {
  if (!supabase) throw new Error("Accounts are not set up on this site.");
  const { data, error } = await supabase
    .from("classes")
    .insert({ name: name.trim(), owner_id: ownerId })
    .select("id, name, join_code, created_at")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function renameClass(classId: string, name: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("classes").update({ name: name.trim() }).eq("id", classId);
  if (error) throw new Error(error.message);
}

export async function deleteClass(classId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("classes").delete().eq("id", classId);
  if (error) throw new Error(error.message);
}

/**
 * The roster, in two reads rather than a join: `learner_progress` is reachable
 * for these learners only through the instructor policy, and asking for it
 * separately keeps that boundary obvious at the call site.
 */
export async function getRoster(classId: string): Promise<RosterEntry[]> {
  if (!supabase) return [];

  const { data: members, error } = await supabase
    .from("class_members")
    .select("learner_id, display_name, joined_at")
    .eq("class_id", classId)
    .order("display_name", { ascending: true });
  if (error) throw new Error(error.message);
  if (!members || members.length === 0) return [];

  const ids = members.map((m) => m.learner_id);
  const { data: progress, error: pErr } = await supabase
    .from("learner_progress")
    .select("user_id, completed_slugs")
    .in("user_id", ids);
  if (pErr) throw new Error(pErr.message);

  const byId = new Map((progress ?? []).map((p) => [p.user_id, p.completed_slugs ?? []]));
  return members.map((m) => ({
    learnerId: m.learner_id,
    displayName: m.display_name,
    joinedAt: m.joined_at,
    completedSlugs: byId.get(m.learner_id) ?? [],
  }));
}

export async function removeMember(classId: string, learnerId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("class_members")
    .delete()
    .eq("class_id", classId)
    .eq("learner_id", learnerId);
  if (error) throw new Error(error.message);
}

/** Joining goes through a database function, so no learner can list classes. */
export async function joinClass(code: string, displayName: string): Promise<{ id: string; name: string }> {
  if (!supabase) throw new Error("Accounts are not set up on this site.");
  const { data, error } = await supabase.rpc("join_class", {
    code: code.trim(),
    learner_name: displayName.trim(),
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("No class has that code. Check it with whoever gave it to you.");
  return row as { id: string; name: string };
}

export async function myMemberships(): Promise<Membership[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("class_members")
    .select("class_id, display_name, classes(name)")
    .order("joined_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((m) => {
    const cls = m.classes as unknown as { name: string } | { name: string }[] | null;
    const name = Array.isArray(cls) ? (cls[0]?.name ?? "Your class") : (cls?.name ?? "Your class");
    return { classId: m.class_id, className: name, displayName: m.display_name };
  });
}

export async function leaveClass(classId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("class_members").delete().eq("class_id", classId);
  if (error) throw new Error(error.message);
}
