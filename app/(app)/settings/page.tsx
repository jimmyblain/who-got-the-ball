import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/settings/profile-form";

export default async function SettingsPage() {
  await connection();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  return (
    <div className="max-w-xl mx-auto py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your profile.
        </p>
      </div>

      <div className="rounded-2xl border bg-card p-6">
        <ProfileForm
          initialDisplayName={profile?.display_name ?? ""}
          email={user.email ?? ""}
        />
      </div>
    </div>
  );
}
