import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { InviteLink } from "@/components/partner/invite-link";
import { UnlinkPartnerButton } from "@/components/partner/unlink-button";

/**
 * Partner Page — manage your partner connection.
 * If not partnered: shows your invite link so you can share it.
 * If partnered: shows who you're partnered with and option to unlink.
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

  // If partnered, get partner's info
  let partnerName: string | null = null;
  if (profile?.partner_id) {
    const { data: partner } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", profile.partner_id)
      .single();
    partnerName = partner?.display_name || "Your partner";
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Partner</h1>
      <p className="text-muted-foreground mb-8">
        Link with your partner to compare answers and spot conflicts.
      </p>

      {profile?.partner_id ? (
        // Already partnered — show partner info
        <div className="space-y-6">
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
        // Not partnered — show invite link
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

          <div className="rounded-2xl border bg-card p-6">
            <h3 className="font-semibold mb-2">Got an invite link?</h3>
            <p className="text-sm text-muted-foreground">
              If your partner shared a link with you, just open it in your
              browser while logged in. It&apos;ll connect you automatically.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
