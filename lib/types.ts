/**
 * TypeScript types for our database tables.
 * These define the "shape" of our data — like a blueprint for each table.
 * TypeScript uses these to catch errors before the code even runs.
 */

// A user's profile — extends the built-in auth user
export type Profile = {
  id: string;
  display_name: string | null;
  invite_code: string | null;
  partner_id: string | null;
  onboarding_complete: boolean;
  created_at: string;
};

// A category of questions (e.g., Finances, Household, Emotional)
export type Category = {
  id: string;
  name: string;
  slug: string;
  color: string;       // hex color like "#F59E0B"
  icon: string;        // icon name like "wallet", "home", "heart"
  sort_order: number;
  created_at: string;
};

// A single question within a category
export type Question = {
  id: string;
  category_id: string;
  question_text: string;
  sort_order: number;
  created_at: string;
};

// The three possible answers to any question
export type AnswerValue = "mine" | "partner" | "shared";

// A user's answer to a specific question
export type Answer = {
  user_id: string;
  question_id: string;
  answer: AnswerValue;
  created_at: string;
  updated_at: string;
};

// A "pass the ball" transfer request between partners
export type TransferStatus = "pending" | "accepted" | "declined";

export type Transfer = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  question_id: string;
  status: TransferStatus;
  message: string | null;
  created_at: string;
  updated_at: string;
};

// Convenience type: a question with the user's answer attached
export type QuestionWithAnswer = Question & {
  answer?: AnswerValue;
  partner_answer?: AnswerValue;
  has_conflict?: boolean;
  pending_transfer?: Transfer | null;
};

// Convenience type: a category with summary stats
export type CategoryWithStats = Category & {
  total_questions: number;
  mine_count: number;
  partner_count: number;
  shared_count: number;
  unanswered_count: number;
  conflict_count: number;
};
