"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, type AuthFormState } from "@/app/auth/actions";

export function LoginForm({ linkError }: { linkError?: string }) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    signIn,
    null
  );

  const error = state?.error ?? linkError;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <h2 className="font-pixel text-sm text-blue-deep">SIGN IN</h2>

      {error && (
        <p role="alert" className="pixel-alert-error">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="identifier" className="pixel-label">
          Username / Email / Phone
        </label>
        <input
          id="identifier"
          name="identifier"
          type="text"
          className="pixel-input"
          placeholder="ash_ketchum"
          autoComplete="username"
          required
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
          placeholder="************"
          autoComplete="current-password"
          required
        />
      </div>

      <button type="submit" className="pixel-btn pixel-btn-yellow" disabled={pending}>
        {pending ? "SIGNING IN..." : "SIGN-IN ▶"}
      </button>

      <div className="flex flex-col items-center gap-4 border-t-4 border-dotted border-blue-sky pt-5 text-center">
        <p className="text-xl text-blue-deep">Don&apos;t have an account yet?</p>
        <Link href="/signup" className="pixel-btn pixel-btn-blue w-full">
          CREATE A NEW ACCOUNT
        </Link>
        <Link href="/forgot-password" className="pixel-link">
          Forgot Password?
        </Link>
      </div>
    </form>
  );
}
