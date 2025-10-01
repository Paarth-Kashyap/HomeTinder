import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";

// Service role client (bypasses RLS, safe because only Edge Functions use it)
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  // Handle preflight CORS
 

  const cors = handleOptions(req);
  if (cors) return cors;


  
  try {
    let body: any = {};
    if (req.method === "POST") {
      body = await req.json().catch(() => ({}));
    }
    
    switch (body.route) {
      case "feed":
        return await getFeed(req);
      case "swipe":
        return await saveSwipe(req, body);

      default:
        return new Response("Not Found", {
          status: 404,
          headers: corsHeaders,
        });
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
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
 * GET /feed
 */
async function getFeed(req: Request) {
  const user = await getUserFromReq(req);

  // get user preferences
  const { data: prefs } = await supabaseAdmin
    .from("user_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  // get properties user already swiped
  const { data: swiped } = await supabaseAdmin
    .from("user_properties")
    .select("mls_number")
    .eq("user_id", user.id);

  const swipedIds = swiped?.map((s) => s.mls_number) || [];
  
  // query properties with filters
  let query = supabaseAdmin
    .from("properties")
    .select("*, media:media(*)")
    .not("mls_number", "in", swipedIds);

  if (prefs) {
    if (prefs.min_price) query = query.gte("price", prefs.min_price);
    if (prefs.max_price) query = query.lte("price", prefs.max_price);
  }

  const { data: properties, error } = await query
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) throw error;

  return new Response(JSON.stringify(properties), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * POST /swipe
 */
async function saveSwipe(req: Request, body: any) {
  const user = await getUserFromReq(req);
  
  const { mls_number, status } = body;
  if (!mls_number || !status) {
    return new Response(
      JSON.stringify({ error: "mls_number and status required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  const { error } = await supabaseAdmin.from("user_properties").upsert({
    user_id: user.id,
    mls_number,
    status,
    created_at: new Date().toISOString(),
  });
  if (error) throw error;

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
