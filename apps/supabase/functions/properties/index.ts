// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface Property {
  mls_number: string;
  address: string;
  city: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  property_type: string;
}

interface Media {
  mls_number: string;
  image_urls: string[];
}

// ✅ CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("FRONTEND_URL") || "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Extract JWT from Authorization header
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.split(" ")[1];
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    // 2. Use ANON key to verify JWT
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });
    }

    // 3. Use SERVICE key for DB queries after user is verified
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch a larger pool of active properties, then shuffle and return 25
    const { data: properties, error } = await supabase
      .from("properties")
      .select("mls_number,address,city,price,bedrooms,bathrooms,property_type")
      .eq("is_active", true)
      .order("last_timestamp", { ascending: false })
      .limit(25);

    if (error) throw error;
    if (!properties || properties.length === 0) {
      return new Response(JSON.stringify([]), { headers: corsHeaders });
    }

    // Fetch media for properties
    const mlsNumbers = properties.map((p: Property) => p.mls_number);
    const { data: media, error: mediaError } = await supabase
      .from("media")
      .select("mls_number,image_urls")
      .in("mls_number", mlsNumbers);

    if (mediaError) throw mediaError;

    // Merge media into properties
    const mediaMap: Record<string, string[]> = {};
    for (const m of media || []) {
      if (!mediaMap[m.mls_number]) mediaMap[m.mls_number] = [];
      mediaMap[m.mls_number].push(...m.image_urls);
    }

    const merged = properties.map((p: Property) => ({
      ...p,
      images: mediaMap[p.mls_number] || [],
    }));

    // Shuffle (Fisher–Yates) and take 25
    for (let i = merged.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [merged[i], merged[j]] = [merged[j], merged[i]];
    }
    const result = merged.slice(0, 25);

    return new Response(JSON.stringify(result), { headers: corsHeaders });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
