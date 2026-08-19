import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  const code = requestUrl.searchParams.get("code");

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    await supabase.auth.exchangeCodeForSession(code);

    // Try to create or update a profile row from the user's metadata.
    try {
      const { data: userData, error: getUserError } = await supabase.auth.getUser();

      if (!getUserError && userData?.user) {
        const user = userData.user;

        const profile = {
          id: user.id,
          email: user.email,
          full_name: `${user.user_metadata?.first_name || ""} ${user.user_metadata?.last_name || ""}`.trim(),
          organization_name: user.user_metadata?.organization_name || null,
        };

        // upsert so we don't fail if the row already exists
        await supabase.from("profiles").upsert(profile);
      }
    } catch (e) {
      // ignore profile creation errors — not fatal for auth flow
      console.error("Failed to create profile on callback:", e);
    }
  }

  return NextResponse.redirect(new URL("/dashboard", request.url));
}