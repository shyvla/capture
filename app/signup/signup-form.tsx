"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp, type AuthFormState } from "@/app/auth/actions";
import {
  DISPLAY_NAME_RULE,
  PASSWORD_MAX,
  PASSWORD_MIN,
  USERNAME_RULE,
} from "@/lib/validation";

export function SignupForm() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    signUp,
    null
  );

  if (state?.success) {
    return (
      <div className="flex flex-col gap-5 text-center">
        <h2 className="font-pixel text-sm text-blue-deep">CHECK YOUR EMAIL ★</h2>
        <p className="pixel-alert-success">{state.success}</p>
        <Link href="/login" className="pixel-btn pixel-btn-yellow">
          BACK TO SIGN-IN
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <h2 className="font-pixel text-sm text-blue-deep">CREATE ACCOUNT</h2>

      {state?.error && (
        <p role="alert" className="pixel-alert-error">
          {state.error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="username" className="pixel-label">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          className="pixel-input"
          placeholder="ash_ketchum"
          autoComplete="username"
          title={USERNAME_RULE}
          required
        />
        <p className="text-lg leading-tight text-blue-brand">
          3-20 characters. Letters, numbers, and underscores.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="display_name" className="pixel-label">
          Display Name
        </label>
        <input
          id="display_name"
          name="display_name"
          type="text"
          className="pixel-input"
          placeholder="Ash"
          title={DISPLAY_NAME_RULE}
          required
        />
        <p className="text-lg leading-tight text-blue-brand">
          Letters and numbers only.
        </p>
      </div>

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

      <div className="flex flex-col gap-2">
        <label htmlFor="phone" className="pixel-label">
          Phone Number (optional)
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          className="pixel-input"
          placeholder="+15551234567"
          autoComplete="tel"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="pixel-label">
          Password
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
          Confirm Password
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
        {pending ? "CREATING..." : "CREATE A NEW ACCOUNT ★"}
      </button>

      <div className="flex flex-col items-center gap-3 border-t-4 border-dotted border-blue-sky pt-4 text-center">
        <p className="text-xl text-blue-deep">Already have an account?</p>
        <Link href="/login" className="pixel-link">
          Back to Sign-In
        </Link>
      </div>
    </form>
  );
}
