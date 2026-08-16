"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  DISPLAY_NAME_PATTERN,
  DISPLAY_NAME_RULE,
  looksLikePhone,
  normalizePhone,
  PASSWORD_MAX,
  PASSWORD_MIN,
  PASSWORD_RULE,
  PHONE_PATTERN,
  PHONE_RULE,
  USERNAME_PATTERN,
  USERNAME_RULE,
} from "@/lib/validation";

export type AuthFormState = {
  error?: string;
  success?: string;
} | null;

async function siteOrigin(): Promise<string> {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

/** Sign in with username, email address, or phone number + password. */
export async function signIn(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!identifier || !password) {
    return { error: "Please enter your login and password." };
  }

  const supabase = await createClient();

  // Supabase Auth signs in by email; resolve usernames and phone numbers
  // to the account email first.
  let email = identifier;
  if (!identifier.includes("@")) {
    const lookup = looksLikePhone(identifier)
      ? normalizePhone(identifier)
      : identifier;
    const { data, error } = await supabase.rpc("get_email_for_login", {
      identifier: lookup,
    });
    if (error || !data) {
      return { error: "Incorrect login or password. Please try again." };
    }
    email = data as string;
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.code === "email_not_confirmed") {
      return { error: "Please confirm your email address first — check your inbox!" };
    }
    return { error: "Incorrect login or password. Please try again." };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

/** Create a new account. */
export async function signUp(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const username = String(formData.get("username") ?? "").trim();
  const displayName = String(formData.get("display_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (!USERNAME_PATTERN.test(username)) return { error: USERNAME_RULE };
  if (!DISPLAY_NAME_PATTERN.test(displayName)) return { error: DISPLAY_NAME_RULE };
  if (!email.includes("@")) return { error: "Please enter a valid email address." };

  const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
  if (phone && !PHONE_PATTERN.test(phone)) return { error: PHONE_RULE };

  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    return { error: PASSWORD_RULE };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match. Please try again." };
  }

  const supabase = await createClient();

  const { data: available, error: availabilityError } = await supabase.rpc(
    "is_username_available",
    { candidate: username }
  );
  if (availabilityError) {
    return { error: "Something went wrong. Please try again." };
  }
  if (!available) {
    return { error: "That username is already taken. Try another one!" };
  }

  const origin = await siteOrigin();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm?next=/`,
      data: {
        username,
        display_name: displayName,
        phone_number: phone ?? "",
      },
    },
  });

  if (error) {
    if (error.code === "user_already_exists") {
      return { error: "An account with that email already exists." };
    }
    if (error.code === "unexpected_failure") {
      // Most likely the profiles trigger rejected a duplicate phone/email.
      return {
        error:
          "Could not create your account — that email or phone number may already be in use.",
      };
    }
    return { error: error.message };
  }

  // Email confirmation enabled: no session yet, tell them to check their inbox.
  if (!data.session) {
    return {
      success:
        "Almost there! Check your email and click the confirmation link to activate your account.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

/** Send a password reset email. */
export async function requestPasswordReset(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email.includes("@")) {
    return { error: "Please enter the email address on your account." };
  }

  const supabase = await createClient();
  const origin = await siteOrigin();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/reset-password`,
  });

  // Always report success so the form can't be used to probe for accounts.
  return {
    success:
      "If an account exists for that email, a reset link is on its way. Check your inbox!",
  };
}

/** Set a new password (user arrives here from the reset email link). */
export async function updatePassword(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    return { error: PASSWORD_RULE };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match. Please try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: "Could not update your password. Please request a new reset link." };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
