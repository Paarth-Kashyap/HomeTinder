import { createClient } from '@supabase/supabase-js';
import type { Property } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// API functions
export const fetchProperties = async (): Promise<Property[]> => {
  const apiUrl = import.meta.env.VITE_SUPABASE_API_URL;
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  console.log("TOKEN: ", token);

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

export const saveUserPreference = async (
  mlsNumber: string, 
  action: 'like' | 'dislike'
) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { error } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: user.id,
      mls_number: mlsNumber,
      action,
    });

  if (error) {
    throw new Error('Failed to save preference');
  }
};

export const getUserPreferences = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id);

  if (error) {
    throw new Error('Failed to fetch preferences');
  }

  return data;
};

