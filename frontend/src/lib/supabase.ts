import { createClient } from '@supabase/supabase-js';
import type { Listing } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function withAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("Not authenticated");
  return { Authorization: `Bearer ${data.session.access_token}` };
}

// -------- SWIPE (Edge Functions) --------
export async function saveUserProperties(
  mls_number: string,
  status: "liked" | "disliked",
  sessionId?: string,
  timeToDecision?: number
) {
  const headers = await withAuthHeaders();
  const { data, error } = await supabase.functions.invoke("swipe", {
    method: "POST",
    headers,
    body: { route: "swipe", mls_number: mls_number, status, session_id: sessionId, time_to_decision: timeToDecision },
  });
  if (error) throw error;
  return data;
}

export const removeUserProperty = async (mls_number: string) => {

    const headers = await withAuthHeaders();
    const { data, error } = await supabase.functions.invoke("swipe", {
      method: "DELETE",
      headers,
      body: { route: "unswipe", mls_number: mls_number},
    });
    if (error) throw error;

    return data;
};

export const fetchUserFeed = async () => {
  const headers = await withAuthHeaders();

  const { data, error } = await supabase.functions.invoke("swipe", {
    method: "POST",
    headers,
    body: { route: "feed" },
  });

  if (error) {
    console.error("fetchUserFeed error:", error);
    throw error;
  }
  const normalized: Listing[] = (data || []).map((item: any) => ({
    mls_number: item.mls_number,
    address: item.address2,
    postal: item.postal_code,
    province: item.address.substring(item.address.length-10,item.address.length-8),
    city: item.city,
    price: item.price,
    bedrooms: item.bedrooms,
    bathrooms: item.bathrooms,
    transaction: item.transaction_type,
    property_subtype: item.property_subtype,
    images: Array.isArray(item.media?.image_urls)
      ? item.media.image_urls
      : [], // always a string[]
    id: item.id,
    status: item.status ?? "unknown",
    created_at: item.created_at,
  }));
  return normalized;
};

// -------- MATCHES (Edge Functions) --------
export async function getUserProperties() {
  
  const { data, error } = await supabase.functions.invoke("matches", {
    headers: await withAuthHeaders(),
  });
  if (error) throw error;
  return data;
}
