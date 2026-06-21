/**
 * TypeScript types matching the Supabase schema (v2: guided session).
 */

import type { WhoOption } from "@/lib/session-options";

export type Profile = {
  id: string;
  display_name: string | null;
  invite_code: string | null;
  partner_id: string | null;
  onboarding_complete: boolean;
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  scenario_prompt: string | null;
  color: string;
  icon: string;
  sort_order: number;
  created_at: string;
};

export type Scenario = {
  id: string;
  category_id: string | null;     // null = top-level scenario
  scenario_text: string;
  sort_order: number;
  created_at: string;
};

export type SessionStatus = "in_progress" | "completed";

export type Session = {
  id: string;
  initiator_id: string;
  partner_id: string;
  top_scenario_id: string | null;
  top_scenario_custom: string | null;
  selected_category_ids: string[];
  focal_category_id: string;
  focal_scenario_id: string | null;
  focal_scenario_custom: string | null;
  status: SessionStatus;
  created_at: string;
  completed_at: string | null;
};

// Aliases WhoOption (the Who-picker keys in session-options) so the answer
// options and the stored value can't drift apart.
export type WhoHasBall = WhoOption;

export type SessionResponse = {
  session_id: string;
  user_id: string;
  who_has_ball: WhoHasBall;
  why: string;                    // preset key OR 'custom'
  why_custom: string | null;
  expectation: string;            // preset key OR 'custom'
  expectation_custom: string | null;
  submitted_at: string;
};

export type SessionAction = {
  session_id: string;
  user_id: string;
  action: string;                 // preset key OR 'custom'
  action_custom: string | null;
  language: string;               // preset key OR 'custom'
  language_custom: string | null;
  submitted_at: string;
};

export type CheckInStatus = "pending" | "dismissed" | "completed";

export type CheckIn = {
  id: string;
  session_id: string;
  user_id: string;
  scheduled_for: string;          // ISO date (YYYY-MM-DD)
  status: CheckInStatus;
  created_at: string;
};
