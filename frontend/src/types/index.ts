export interface Listing {
  mls_number: string;
  address: string;
  city: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  property_type: string;
  images: string[];
  status?: 'liked' | 'disliked';
  created_at: string;
  id: number; 
}

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface UserProperty {
  id: string;
  user_id: string;
  mls_number: string;
  action: 'liked' | 'disliked';
  created_at: string;
}

export interface AuthContextType {
  user: User | null;
  signUp: (email: string, password: string, firstName?: string, lastName?: string, phoneNumber?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
}
