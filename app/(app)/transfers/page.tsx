import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TransferCard } from "@/components/transfers/transfer-card";

/**
 * Transfers Page — shows all "pass the ball" requests.
 * Pending requests appear first, then past requests.
 * Receivers can accept/decline pending requests here.
 */
export default async function TransfersPage() {
  await connection();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("partner_id")
    .eq("id", user.id)
    .single();

  if (!profile?.partner_id) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <div className="text-5xl mb-4">🔗</div>
        <h1 className="text-2xl font-bold mb-2">No partner connected</h1>
        <p className="text-muted-foreground mb-4">
          You need a partner to pass balls.
        </p>
        <Link
          href="/partner"
          className="text-primary font-semibold underline underline-offset-2"
        >
          Set up partner link →
        </Link>
      </div>
    );
  }

  // Get all transfers involving this user, newest first
  const { data: transfers } = await supabase
    .from("transfers")
    .select("*")
    .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  // Get all related question texts
  const questionIds = transfers?.map((t) => t.question_id) || [];
  const { data: questions } = await supabase
    .from("questions")
    .select("id, question_text, category_id")
    .in("id", questionIds.length > 0 ? questionIds : ["none"]);

  // Get categories for colors
  const categoryIds = [...new Set(questions?.map((q) => q.category_id) || [])];
  const { data: categories } = await supabase
    .from("categories")
    .select("id, color")
    .in("id", categoryIds.length > 0 ? categoryIds : ["none"]);

  // Get partner's display name
  const { data: partner } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", profile.partner_id)
    .single();

  // Get my display name
  const { data: myProfile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  // Split into pending and past
  const pending = transfers?.filter((t) => t.status === "pending") || [];
  const past = transfers?.filter((t) => t.status !== "pending") || [];

  // Helper to get question text
  const getQuestionText = (questionId: string) =>
    questions?.find((q) => q.id === questionId)?.question_text || "Unknown question";

  const getCategoryColor = (questionId: string) => {
    const question = questions?.find((q) => q.id === questionId);
    const category = categories?.find((c) => c.id === question?.category_id);
    return category?.color || "#888";
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Transfers</h1>
      <p className="text-muted-foreground mb-8">
        Pass the ball — or accept one from your partner.
      </p>

      {/* Pending transfers */}
      {pending.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">
            Pending ({pending.length})
          </h2>
          <div className="space-y-4">
            {pending.map((transfer) => (
              <TransferCard
                key={transfer.id}
                transferId={transfer.id}
                questionText={getQuestionText(transfer.question_id)}
                fromName={
                  transfer.from_user_id === user.id
                    ? "You"
                    : partner?.display_name || "Partner"
                }
                toName={
                  transfer.to_user_id === user.id
                    ? "you"
                    : partner?.display_name || "partner"
                }
                message={transfer.message}
                status={transfer.status}
                isReceiver={transfer.to_user_id === user.id}
                categoryColor={getCategoryColor(transfer.question_id)}
                createdAt={transfer.created_at}
              />
            ))}
          </div>
        </div>
      )}

      {/* Past transfers */}
      {past.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">History</h2>
          <div className="space-y-4">
            {past.map((transfer) => (
              <TransferCard
                key={transfer.id}
                transferId={transfer.id}
                questionText={getQuestionText(transfer.question_id)}
                fromName={
                  transfer.from_user_id === user.id
                    ? "You"
                    : partner?.display_name || "Partner"
                }
                toName={
                  transfer.to_user_id === user.id
                    ? "you"
                    : partner?.display_name || "partner"
                }
                message={transfer.message}
                status={transfer.status}
                isReceiver={transfer.to_user_id === user.id}
                categoryColor={getCategoryColor(transfer.question_id)}
                createdAt={transfer.created_at}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {(!transfers || transfers.length === 0) && (
        <div className="rounded-2xl border bg-card p-8 text-center">
          <div className="text-5xl mb-4">🏀</div>
          <h2 className="text-xl font-bold mb-2">No transfers yet</h2>
          <p className="text-muted-foreground">
            Head to a category in your{" "}
            <Link href="/dashboard" className="text-primary underline">
              dashboard
            </Link>{" "}
            and use &quot;Pass ball&quot; to request a transfer.
          </p>
        </div>
      )}
    </div>
  );
}
