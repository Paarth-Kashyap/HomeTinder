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

serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 1. Fetch properties
  const { data: properties, error } = await supabase
    .from("properties")
    .select("mls_number,address,city,price,bedrooms,bathrooms,property_type")
    .eq("is_active", true)
    .order("last_timestamp", { ascending: false })
    .limit(50);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  if (!properties || properties.length === 0) {
    return new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json" } });
  }

  // 2. Extract MLS numbers
  const mlsNumbers = properties.map((p:Property) => p.mls_number);

  // 3. Fetch media for these MLS numbers
  const { data: media, error: errorM } = await supabase
    .from("media")
    .select("mls_number,image_urls")
    .in("mls_number", mlsNumbers);

  if (media) {
  media.sort((a:Media, b:Media) => mlsNumbers.indexOf(a.mls_number) - mlsNumbers.indexOf(b.mls_number));
}

  if (errorM) {
    return new Response(JSON.stringify({ error: errorM.message }), { status: 500 });
  }

  // 4. Build a lookup map for media
  const mediaMap: Record<string, string[]> = {};
  for (const m of media || []) {
    if (!mediaMap[m.mls_number]) mediaMap[m.mls_number] = [];
    mediaMap[m.mls_number].push(...m.image_urls);
  }

  // 5. Merge media into properties
  const result = properties.map((p:Property) => ({
    ...p,
    images: mediaMap[p.mls_number] || []
  }));

  // 6. Return combined result
  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
});
