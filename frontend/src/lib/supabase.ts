import { createClient } from '@supabase/supabase-js';
import type { Property } from '../types';

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

// -------- PROPERTIES (temp direct call until feed Edge Function is solid) --------
export const fetchProperties = async (): Promise<Property[]> => {
  const apiUrl = import.meta.env.VITE_SUPABASE_API_URL;
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const response = await fetch(`${apiUrl}/properties`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch properties');
  }

  return response.json();
};

// -------- SWIPE (Edge Functions) --------
export async function saveUserProperties(
  mls_number: string,
  status: "liked" | "disliked",
  sessionId?: string,
  timeToDecision?: number
) {
  const headers = await withAuthHeaders();

  console.log("PROPID ",mls_number);
  console.log("status ",status);
  console.log("sessionId ",sessionId);
  console.log("ttd ",timeToDecision);

  const { data, error } = await supabase.functions.invoke("swipe", {
    method: "POST",
    headers,
    body: { route: "swipe", mls_number: mls_number, status, session_id: sessionId, time_to_decision: timeToDecision },
  });
  if (error) throw error;
  return data;
}

// -------- MATCHES (Edge Functions) --------
export async function getUserProperties() {
  
  const { data, error } = await supabase.functions.invoke("matches", {
    headers: await withAuthHeaders(),
  });
  if (error) throw error;
  return data;
}
