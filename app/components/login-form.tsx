"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/app/actions/auth";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <div>
      <h1 className="mb-5 text-3xl font-bold sm:text-4xl">Log into Capture</h1>
      <form
        action={formAction}
        className="rounded-3xl bg-capture-card px-8 py-9 shadow-[0_18px_40px_rgba(0,0,0,0.25)] sm:px-11"
      >
        <label htmlFor="identifier" className="mb-2 block text-lg font-semibold">
          Username, email, mobile number
        </label>
        <input
          id="identifier"
          name="identifier"
          type="text"
          autoComplete="username"
          required
          className="mb-7 block w-full rounded-lg bg-capture-input px-4 py-3.5 text-lg shadow-[inset_0_2px_4px_rgba(0,0,0,0.08)] outline-none focus:ring-2 focus:ring-white"
        />

        <label htmlFor="password" className="mb-2 block text-lg font-semibold">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="block w-full rounded-lg bg-capture-input px-4 py-3.5 text-lg shadow-[inset_0_2px_4px_rgba(0,0,0,0.08)] outline-none focus:ring-2 focus:ring-white"
        />

        {state?.error && (
          <p role="alert" className="mt-5 text-base font-semibold text-red-800">
            {state.error}
          </p>
        )}

        <div className="mt-8 flex items-center justify-between text-lg font-semibold">
          <Link href="/forgot-password" className="hover:underline">
            Forgot Password
          </Link>
          <button
            type="submit"
            disabled={pending}
            className="cursor-pointer hover:underline disabled:cursor-wait disabled:opacity-60"
          >
            {pending ? "Logging in…" : "Login"}
          </button>
          <Link href="/signup" className="hover:underline">
            New Account
          </Link>
        </div>
      </form>
    </div>
  );
}
