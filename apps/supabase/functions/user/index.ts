// supabase/functions/user/index.ts
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  const url = new URL(req.url);
  const path = url.pathname.replace("/user", "");
  const method = req.method;

  try {
    switch (true) {
      case path === "/profile" && method === "GET":
        return await getProfile(req);
      case path === "/profile" && method === "PATCH":
        return await updateProfile(req);
      case path === "/preferences" && method === "GET":
        return await getPreferences(req);
      case path === "/preferences" && method === "PATCH":
        return await updatePreferences(req);
      default:
        return new Response("Not Found", { status: 404 });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
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

/** GET /profile */
async function getProfile(req: Request) {
  const user = await getUserFromReq(req);

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, email, first_name, last_name, phone_number, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}

/** PATCH /profile */
async function updateProfile(req: Request) {
  const user = await getUserFromReq(req);
  const body = await req.json();

  const { error } = await supabaseAdmin
    .from("users")
    .update({
      first_name: body.first_name,
      last_name: body.last_name,
      phone_number: body.phone_number,
    })
    .eq("id", user.id);

  if (error) throw error;

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

/** GET /preferences */
async function getPreferences(req: Request) {
  const user = await getUserFromReq(req);

  const { data, error } = await supabaseAdmin
    .from("user_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}

/** PATCH /preferences */
async function updatePreferences(req: Request) {
  const user = await getUserFromReq(req);
  const body = await req.json();

  const { error } = await supabaseAdmin
    .from("user_preferences")
    .update({
      min_price: body.min_price,
      max_price: body.max_price,
      location: body.location,
      property_type: body.property_type,
      bedrooms: body.bedrooms,
      bathrooms: body.bathrooms,
    })
    .eq("user_id", user.id);

  if (error) throw error;

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
}
