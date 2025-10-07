import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User, AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user as User || null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user as User || null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // password validation regex: min 6, at least 1 uppercase, 1 lowercase, 1 number
  const validatePassword = (password: string) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
    return regex.test(password);
  };

  const signUp = async (
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
    phoneNumber?: string
  ) => {
    // validate password client-side first
    if (!validatePassword(password)) {
      throw new Error(
        "Password must be at least 6 characters and include one uppercase letter, one lowercase letter, and one number."
      );
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { 
          first_name: firstName, 
          last_name: lastName,
          phone_number: phoneNumber
        },
      },
    });
    console.log(data, error);
    if (error) {
      console.error("Signup error:", error);

      // map common errors
      if (error.message?.toLowerCase().includes("phone")) {
        throw new Error("This phone number is already registered. Please use a different one.");
      }
      if (error.message?.toLowerCase().includes("email")) {
        throw new Error("This email is already registered. Please sign in.");
      }
      if (error.message?.toLowerCase().includes("password")) {
        throw new Error("Password is too weak. Must include 1 uppercase, 1 lowercase, 1 number, and be at least 6 characters.");
      }

      // fallback for unexpected errors
      throw new Error("Unable to sign up. Please try again.");
    }

    // If user already exists:
    if (data?.user && data.user.identities?.length === 0) {
      throw new Error("This email is already registered. Please sign in.");
    }

    // If no session is returned → email confirmation required
    if (!data.session) {
      throw new Error("Please check your email to confirm your account.");
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const value = {
    user,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
