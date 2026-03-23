import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { initStorageForUser, clearStorageUser, seedFromCloud } from "@/lib/storage";
import { pullFromCloud } from "@/lib/sync";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

function onLogin(userId: string) {
  initStorageForUser(userId);
  // Sync from cloud in background — don't block rendering
  // localStorage already has data on repeat visits so app loads instantly
  pullFromCloud(userId).then((cloudData) => {
    if (cloudData && cloudData.holdings.length > 0) {
      seedFromCloud(cloudData);
    }
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        onLogin(session.user.id);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session?.user && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
        onLogin(session.user.id);
      } else if (event === "SIGNED_OUT") {
        clearStorageUser();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    clearStorageUser();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, loading, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);