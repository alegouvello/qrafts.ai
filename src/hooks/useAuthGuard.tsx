import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Shared auth guard hook. Redirects to /auth if no active session.
 * Optionally checks email confirmation.
 */
export function useAuthGuard({ requireEmailConfirmed = false } = {}) {
  const navigate = useNavigate();

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      if (requireEmailConfirmed && !session.user.email_confirmed_at) {
        console.log("Email not confirmed, redirecting to auth");
        navigate("/auth");
      }
    };
    check();
  }, [navigate, requireEmailConfirmed]);
}
