import { redirect } from "next/navigation";
import { CaptureFrame } from "@/app/components/capture-frame";
import { LoginForm } from "@/app/components/login-form";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export default async function LoginPage() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      redirect("/home");
    }
  }

  return (
    <CaptureFrame>
      <LoginForm />
    </CaptureFrame>
  );
}
