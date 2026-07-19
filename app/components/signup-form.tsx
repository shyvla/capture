"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup } from "@/app/actions/auth";

const inputClasses =
  "mb-6 block w-full rounded-lg bg-capture-input px-4 py-3 text-lg shadow-[inset_0_2px_4px_rgba(0,0,0,0.08)] outline-none focus:ring-2 focus:ring-white";
const labelClasses = "mb-2 block text-lg font-semibold";

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signup, undefined);

  return (
    <div>
      <h1 className="mb-5 text-3xl font-bold sm:text-4xl">Join Capture</h1>
      <form
        action={formAction}
        className="rounded-3xl bg-capture-card px-8 py-9 shadow-[0_18px_40px_rgba(0,0,0,0.25)] sm:px-11"
      >
        <label htmlFor="username" className={labelClasses}>
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          minLength={3}
          maxLength={20}
          pattern="[A-Za-z0-9_]+"
          title="Letters, numbers, and underscores only"
          className={inputClasses}
        />

        <label htmlFor="email" className={labelClasses}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={inputClasses}
        />

        <label htmlFor="phone" className={labelClasses}>
          Mobile number <span className="font-normal">(optional)</span>
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          className={inputClasses}
        />

        <label htmlFor="password" className={labelClasses}>
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="block w-full rounded-lg bg-capture-input px-4 py-3 text-lg shadow-[inset_0_2px_4px_rgba(0,0,0,0.08)] outline-none focus:ring-2 focus:ring-white"
        />

        {state?.error && (
          <p role="alert" className="mt-5 text-base font-semibold text-red-800">
            {state.error}
          </p>
        )}
        {state?.notice && (
          <p role="status" className="mt-5 text-base font-semibold text-green-900">
            {state.notice}
          </p>
        )}

        <div className="mt-8 flex items-center justify-between text-lg font-semibold">
          <Link href="/" className="hover:underline">
            Back to Login
          </Link>
          <button
            type="submit"
            disabled={pending}
            className="cursor-pointer hover:underline disabled:cursor-wait disabled:opacity-60"
          >
            {pending ? "Creating account…" : "Create Account"}
          </button>
        </div>
      </form>
    </div>
  );
}
