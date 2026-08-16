"use client";

import { useActionState } from "react";
import { updatePassword, type AuthFormState } from "@/app/auth/actions";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/validation";

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    updatePassword,
    null
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <h2 className="font-pixel text-sm text-blue-deep">NEW PASSWORD</h2>

      {state?.error && (
        <p role="alert" className="pixel-alert-error">
          {state.error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="pixel-label">
          New Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="pixel-input"
          minLength={PASSWORD_MIN}
          maxLength={PASSWORD_MAX}
          autoComplete="new-password"
          required
        />
        <p className="text-lg leading-tight text-blue-brand">
          {PASSWORD_MIN}-{PASSWORD_MAX} characters.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="confirm_password" className="pixel-label">
          Confirm New Password
        </label>
        <input
          id="confirm_password"
          name="confirm_password"
          type="password"
          className="pixel-input"
          minLength={PASSWORD_MIN}
          maxLength={PASSWORD_MAX}
          autoComplete="new-password"
          required
        />
      </div>

      <button type="submit" className="pixel-btn pixel-btn-yellow" disabled={pending}>
        {pending ? "SAVING..." : "SAVE NEW PASSWORD ★"}
      </button>
    </form>
  );
}
