import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchFeedPage } from "@/lib/feed";

/** GET /api/feed?cursor=<opaque> — one page of the signed-in user's feed. */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const page = await fetchFeedPage(
      supabase,
      user.id,
      request.nextUrl.searchParams.get("cursor")
    );
    return Response.json(page);
  } catch (err) {
    console.error("GET /api/feed", err);
    return Response.json({ error: "Could not load the feed" }, { status: 500 });
  }
}
