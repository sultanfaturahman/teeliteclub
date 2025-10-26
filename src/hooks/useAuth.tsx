import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface Profile {
  id: string;
  email?: string;
  nama?: string;
  telepon?: string;
  alamat?: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, nama?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Check if this is a new Google OAuth user
          if (event === 'SIGNED_IN' && session?.user?.app_metadata?.provider === 'google') {
            await handleGoogleSignIn(session.user);
          }
          
          // Defer profile loading
          setTimeout(() => {
            loadProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    try {
      logger.debug('Loading user profile', { userId });
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        logger.error('Failed to load user profile', { userId, error: error.message });
        return;
      }

      logger.info('User profile loaded successfully', { userId, role: data?.role });
      setProfile(data);
    } catch (error) {
      logger.error('Unexpected error loading profile', { userId, error });
    }
  };

  const handleGoogleSignIn = async (user: User) => {
    try {
      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!existingProfile) {
        // Create profile for new Google user
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            id: user.id,
            email: user.email,
            nama: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '',
            role: 'user'
          }]);

        if (profileError) {
          logger.error('Failed to create Google user profile', { userId: user.id, error: profileError.message });
        } else {
          logger.info('Google user profile created successfully', { userId: user.id });
        }
      }
    } catch (error) {
      logger.error('Error handling Google sign-in', { userId: user.id, error });
    }
  };

  const signInWithGoogle = async () => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl
        }
      });

      if (error) return { error };

      return { error: null };
    } catch (error) {
      logger.error('Google sign-in failed', error);
      return { error };
    }
  };

  const signUp = async (email: string, password: string, nama?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            nama: nama || ''
          }
        }
      });

      if (error) return { error };

      // Create profile
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            id: data.user.id,
            email: data.user.email,
            nama: nama || '',
            role: 'user'
          }]);

        if (profileError) {
          logger.error('Failed to create user profile', { userId: data.user.id, error: profileError.message });
        }
      }

      toast.success('Akun berhasil dibuat! Silakan cek email untuk verifikasi.');
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) return { error };

      toast.success('Berhasil login!');
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setSession(null);
      setProfile(null);
      toast.success('Berhasil logout!');
    } catch (error) {
      logger.error('Failed to sign out', error);
      toast.error('Gagal logout');
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, ...updates } : null);
      toast.success('Profile berhasil diperbarui!');
    } catch (error) {
      logger.error('Failed to update profile', error);
      toast.error('Gagal memperbarui profile');
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      updateProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}