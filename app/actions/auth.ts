"use server";

import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type AuthFormState = { error?: string; notice?: string } | undefined;

const PHONE_RE = /^\+?[0-9()\-\s.]{7,20}$/;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

const NOT_CONFIGURED =
  "Supabase isn't connected yet — add your project URL and anon key to .env.local.";

function normalizePhone(value: string) {
  return value.replace(/[^0-9+]/g, "");
}

export async function login(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!identifier || !password) {
    return { error: "Please fill in both fields." };
  }
  if (!isSupabaseConfigured()) {
    return { error: NOT_CONFIGURED };
  }

  const supabase = await createClient();

  // Accounts are email + password under the hood. A username or mobile
  // number is resolved to the account email before signing in.
  let email = identifier;
  if (!identifier.includes("@")) {
    const lookup = PHONE_RE.test(identifier)
      ? normalizePhone(identifier)
      : identifier.toLowerCase();
    const { data, error } = await supabase.rpc("get_email_for_login", {
      identifier: lookup,
    });
    if (error || !data) {
      return {
        error: "We couldn't find an account with that username or mobile number.",
      };
    }
    email = data;
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: "Incorrect login details. Please try again." };
  }

  redirect("/home");
}

export async function signup(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const email = String(formData.get("email") ?? "").trim();
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!USERNAME_RE.test(username)) {
    return {
      error: "Usernames must be 3–20 characters: letters, numbers, underscores.",
    };
  }
  if (!email.includes("@")) {
    return { error: "Please enter a valid email address." };
  }
  if (phoneRaw && !PHONE_RE.test(phoneRaw)) {
    return { error: "That mobile number doesn't look right." };
  }
  if (password.length < 8) {
    return { error: "Passwords must be at least 8 characters." };
  }
  if (!isSupabaseConfigured()) {
    return { error: NOT_CONFIGURED };
  }

  const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
  const supabase = await createClient();

  const { data: usernameTaken } = await supabase.rpc("get_email_for_login", {
    identifier: username,
  });
  if (usernameTaken) {
    return { error: "That username is already taken." };
  }
  if (phone) {
    const { data: phoneTaken } = await supabase.rpc("get_email_for_login", {
      identifier: phone,
    });
    if (phoneTaken) {
      return { error: "That mobile number is already registered." };
    }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // The handle_new_user trigger copies these into the profiles table.
    options: { data: { username, phone } },
  });
  if (error) {
    return { error: error.message };
  }

  if (data.session) {
    redirect("/home");
  }
  return {
    notice: "Almost there! Check your email to confirm your account, then log in.",
  };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
