"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, type AuthFormState } from "@/app/auth/actions";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    requestPasswordReset,
    null
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <h2 className="font-pixel text-sm text-blue-deep">RESET PASSWORD</h2>

      {state?.error && (
        <p role="alert" className="pixel-alert-error">
          {state.error}
        </p>
      )}
      {state?.success && <p className="pixel-alert-success">{state.success}</p>}

      <p className="text-xl leading-snug text-blue-deep">
        Enter the email on your account and we&apos;ll send you a link to set a
        new password.
      </p>

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="pixel-label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className="pixel-input"
          placeholder="ash@pallet.town"
          autoComplete="email"
          required
        />
      </div>

      <button type="submit" className="pixel-btn pixel-btn-yellow" disabled={pending}>
        {pending ? "SENDING..." : "SEND RESET LINK ✉"}
      </button>

      <div className="flex justify-center border-t-4 border-dotted border-blue-sky pt-4">
        <Link href="/login" className="pixel-link">
          Back to Sign-In
        </Link>
      </div>
    </form>
  );
}
