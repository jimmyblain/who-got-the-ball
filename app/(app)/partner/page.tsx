import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { InviteLink } from "@/components/partner/invite-link";
import { UnlinkPartnerButton } from "@/components/partner/unlink-button";
import { AcceptInviteForm } from "@/components/partner/accept-invite-form";
import type { AnswerValue } from "@/lib/types";

/**
 * Partner Page — manage your partner connection.
 * If not partnered: shows your invite link and manual code entry.
 * If partnered: shows who you're partnered with, summary stats,
 *   a link to the alignment page, and an option to unlink.
 */
export default async function PartnerPage() {
  await connection();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Get the user's profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("invite_code, partner_id")
    .eq("id", user.id)
    .single();

  // If partnered, get partner's info and compute alignment stats
  let partnerName: string | null = null;
  let agreementCount = 0;
  let discussionCount = 0;
  let totalCompared = 0;

  if (profile?.partner_id) {
    // Fetch partner's display name
    const { data: partner } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", profile.partner_id)
      .single();
    partnerName = partner?.display_name || "Your partner";

    // Fetch both users' answers to compute alignment stats
    const { data: myAnswers } = await supabase
      .from("answers")
      .select("question_id, answer")
      .eq("user_id", user.id);

    const { data: partnerAnswers } = await supabase
      .from("answers")
      .select("question_id, answer")
      .eq("user_id", profile.partner_id);

    if (myAnswers && partnerAnswers) {
      // Build a lookup map for partner's answers (question_id → answer)
      const partnerMap = new Map(
        partnerAnswers.map((a) => [a.question_id, a.answer as AnswerValue])
      );

      // For each question both have answered, check if they agree
      myAnswers.forEach((myAnswer) => {
        const partnerAnswer = partnerMap.get(myAnswer.question_id);
        if (!partnerAnswer) return; // Only count questions both have answered

        totalCompared++;
        const mine = myAnswer.answer as AnswerValue;
        const theirs = partnerAnswer;

        /**
         * Agreement rules:
         * - Both say "shared" → agree
         * - I say "mine" + partner says "partner" → agree (both say I own it)
         * - I say "partner" + partner says "mine" → agree (both say they own it)
         * - Everything else → needs discussion
         */
        const isAgreement =
          (mine === "shared" && theirs === "shared") ||
          (mine === "mine" && theirs === "partner") ||
          (mine === "partner" && theirs === "mine");

        if (isAgreement) {
          agreementCount++;
        } else {
          discussionCount++;
        }
      });
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Partner</h1>
      <p className="text-muted-foreground mb-8">
        Link with your partner to compare answers and see where you align.
      </p>

      {profile?.partner_id ? (
        // Already partnered — show partner info, stats, and alignment link
        <div className="space-y-6">
          {/* Partner connection card */}
          <div className="rounded-2xl border bg-card p-6 text-center space-y-4">
            <div className="text-5xl">🤝</div>
            <div>
              <h2 className="text-xl font-bold">
                Partnered with {partnerName}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                You can see each other&apos;s answers and pass balls between you.
              </p>
            </div>
          </div>

          {/* Summary stats + link to alignment page */}
          <div className="rounded-2xl border bg-card p-6 space-y-4">
            <h3 className="font-semibold">Your alignment</h3>

            {totalCompared > 0 ? (
              <>
                {/* Stats badges */}
                <div className="flex gap-3">
                  <div className="flex-1 text-center rounded-xl bg-green-50 dark:bg-green-950/20 p-3">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {agreementCount}
                    </p>
                    <p className="text-xs text-muted-foreground">agreements</p>
                  </div>
                  <div className="flex-1 text-center rounded-xl bg-amber-50 dark:bg-amber-950/20 p-3">
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                      {discussionCount}
                    </p>
                    <p className="text-xs text-muted-foreground">to discuss</p>
                  </div>
                </div>

                {/* Link to the full alignment/comparison page */}
                <Link
                  href="/conflicts"
                  className="block text-center text-sm font-semibold text-purple-600 dark:text-purple-400
                             hover:text-purple-700 dark:hover:text-purple-300 underline underline-offset-2"
                >
                  View full comparison →
                </Link>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No questions answered by both of you yet. Start answering
                from the{" "}
                <Link
                  href="/dashboard"
                  className="font-semibold underline underline-offset-2"
                >
                  dashboard
                </Link>{" "}
                to see how you align!
              </p>
            )}
          </div>

          {/* Unlink option */}
          <div className="rounded-2xl border bg-card p-6">
            <h3 className="font-semibold mb-2">Want to unlink?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This will remove the partner connection for both of you.
              You&apos;ll no longer see each other&apos;s answers.
            </p>
            <UnlinkPartnerButton />
          </div>
        </div>
      ) : (
        // Not partnered — show invite link and manual code entry
        <div className="space-y-6">
          <div className="rounded-2xl border bg-card p-6 text-center space-y-4">
            <div className="text-5xl">👋</div>
            <div>
              <h2 className="text-xl font-bold">No partner yet</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Share your invite link below, or ask your partner for theirs.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-6">
            <h3 className="font-semibold mb-4">Your invite link</h3>
            {profile?.invite_code && (
              <InviteLink inviteCode={profile.invite_code} />
            )}
          </div>

          {/* Manual invite code entry — a fallback if the link doesn't work */}
          <div className="rounded-2xl border bg-card p-6">
            <h3 className="font-semibold mb-2">Got an invite code?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Paste your partner&apos;s invite code or their full invite link below.
            </p>
            <AcceptInviteForm />
          </div>
        </div>
      )}
    </div>
  );
}
