"use client";

import { supabase } from "./supabase";
import { getCompletedSlugs, replaceCompletedSlugs } from "./progress";

/**
 * Progress lives in localStorage first and in the account second.
 *
 * The whole site reads progress synchronously — a lesson page cannot wait on a
 * network round trip to decide whether a step is done — so the device copy stays
 * the source of truth while the page is open, and the account is a copy that is
 * pulled on sign-in and pushed after changes.
 *
 * Merging is a union, never a replacement. Somebody who worked through three
 * units signed out, then signs in on another machine, must not lose either side.
 * Nothing here can un-complete a lesson; only Reset does that, deliberately.
 */

const TABLE = "learner_progress";

export interface SyncResult {
  merged: string[];
  pulled: number;
  pushed: number;
}

export async function pullAndMerge(userId: string): Promise<SyncResult | null> {
  if (!supabase) return null;

  const local = getCompletedSlugs();
  const { data, error } = await supabase
    .from(TABLE)
    .select("completed_slugs")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("[LearnAComputer] Could not read your saved progress:", error.message);
    return null;
  }

  const remote: string[] = data?.completed_slugs ?? [];
  const merged = Array.from(new Set([...remote, ...local]));

  if (merged.length !== local.length) replaceCompletedSlugs(merged);

  // Only write when the account is actually missing something.
  if (merged.length !== remote.length || !data) {
    await push(userId, merged);
  }

  return { merged, pulled: remote.length, pushed: merged.length - remote.length };
}

export async function push(userId: string, slugs: string[] = getCompletedSlugs()): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from(TABLE)
    .upsert({ user_id: userId, completed_slugs: slugs }, { onConflict: "user_id" });
  if (error) {
    console.warn("[LearnAComputer] Could not save your progress to your account:", error.message);
    return false;
  }
  return true;
}

/** Reset clears the account too, or signing in again would bring it all back. */
export async function clearRemote(userId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from(TABLE).delete().eq("user_id", userId);
}
