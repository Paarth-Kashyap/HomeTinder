// Common CORS headers
export const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": "*", // replace * with your domain in prod
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
  
  // Simple helper for preflight OPTIONS
  export function handleOptions(req: Request): Response | null {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }
    return null;
  }
  