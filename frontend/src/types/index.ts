export interface Property {
  mls_number: string;
  address: string;
  city: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  property_type: string;
  images: string[];
}

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface UserPreference {
  id: string;
  user_id: string;
  mls_number: string;
  action: 'like' | 'dislike';
  created_at: string;
}

export interface AuthContextType {
  user: User | null;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
}
