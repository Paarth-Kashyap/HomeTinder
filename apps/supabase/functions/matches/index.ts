import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";

// Service role client (bypasses RLS, but safe because only Edge Functions use it)
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);


serve(async (req) => {
  // Handle preflight
  const cors = handleOptions(req);
  if (cors) return cors;
  
  try {
    const data = await getMatches(req);
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function getUserFromReq(req: Request) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) throw new Error("Missing auth token");

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) throw new Error("Unauthorized");

  return data.user;
}

/**
 * GET /matches
 * Returns all properties the user has liked/disliked
 */
async function getMatches(req: Request) {
  const user = await getUserFromReq(req);

  const { data, error } = await supabaseAdmin
    .from("user_properties")
    .select("status, property:properties(*, media:media(*))")
    .eq("user_id", user.id);

    if (error) throw new Error(error.message);
    return data ?? [];
}
