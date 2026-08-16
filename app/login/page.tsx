import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthShell } from "@/app/components/auth-shell";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  const { error } = await searchParams;

  return (
    <AuthShell tagline="share film-style photos with friends">
      <LoginForm
        linkError={
          error === "link"
            ? "That link was invalid or expired. Please try again."
            : undefined
        }
      />
    </AuthShell>
  );
}
