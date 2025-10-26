
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { logger } from "@/lib/logger";

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, profile, loading } = useAuth();

  console.log('AdminRoute access check', { 
    userId: user?.id, 
    userEmail: user?.email,
    userRole: profile?.role, 
    loading,
    profileExists: !!profile
  });

  // Show loading while auth is loading OR while we have a user but no profile yet
  if (loading || (user && !profile)) {
    console.log('AdminRoute - Authentication still loading');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Checking admin permissions...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('AdminRoute - Unauthorized access attempt, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }

  if (profile?.role !== 'admin') {
    console.warn('AdminRoute - Non-admin user attempted admin access', { 
      userId: user.id, 
      userRole: profile?.role 
    });
    return <Navigate to="/" replace />;
  }

  console.log('AdminRoute - Admin access granted for user:', user.email);
  return <>{children}</>;
}
