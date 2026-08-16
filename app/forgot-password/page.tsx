import { AuthShell } from "@/app/components/auth-shell";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthShell tagline="lost your password?">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
