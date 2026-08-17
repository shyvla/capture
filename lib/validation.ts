// Shared account validation rules (mirrors the DB constraints in
// supabase/migrations/20260816000001_create_profiles.sql).

export const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;
export const DISPLAY_NAME_PATTERN = /^[A-Za-z0-9]{1,30}$/;
export const PHONE_PATTERN = /^\+?[0-9]{7,15}$/;
export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 20;

export const USERNAME_RULE =
  "Username must be 3-20 characters: letters, numbers, and underscores only.";
export const DISPLAY_NAME_RULE =
  "Display name must be 1-30 characters: letters and numbers only.";
export const PHONE_RULE =
  "Phone number must be 7-15 digits (an optional + prefix is allowed).";
export const PASSWORD_RULE = `Password must be between ${PASSWORD_MIN} and ${PASSWORD_MAX} characters.`;

// Comment rules (mirrors supabase/migrations/20260816000003_feed.sql).
export const COMMENT_WORD_LIMIT = 50;
export const COMMENT_CHAR_LIMIT = 600;
export const COMMENT_RULE = `Comments can be up to ${COMMENT_WORD_LIMIT} words.`;

// Post captions (camera page spec: optional, max 250 characters).
export const CAPTION_CHAR_LIMIT = 250;
export const CAPTION_RULE = `Captions can be up to ${CAPTION_CHAR_LIMIT} characters.`;

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Strip spaces, dashes, dots, and parentheses from a phone number. */
export function normalizePhone(raw: string): string {
  return raw.replace(/[\s().-]/g, "");
}

/** True if the identifier looks like a phone number rather than a username. */
export function looksLikePhone(identifier: string): boolean {
  return PHONE_PATTERN.test(normalizePhone(identifier));
}
