import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthShell } from "@/app/components/auth-shell";
import { ResetPasswordForm } from "./reset-password-form";

// Users land here from the reset email link with a recovery session.
export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?error=link");

  return (
    <AuthShell tagline="pick a new password">
      <ResetPasswordForm />
    </AuthShell>
  );
}
