import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function AuthCallback() {
  const nav = useNavigate();
  const location = useLocation();
  const { refresh } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const hash = location.hash || "";
    const match = hash.match(/session_id=([^&]+)/);
    if (!match) {
      nav("/login", { replace: true });
      return;
    }
    const sessionId = decodeURIComponent(match[1]);

    (async () => {
      try {
        const { data } = await api.post(
          "/auth/google/session",
          {},
          { headers: { "X-Session-ID": sessionId } },
        );
        // clear the hash from the URL so refresh works
        window.history.replaceState(null, "", window.location.pathname);
        await refresh();
        toast.success(`Bem-vindo, ${data.user.name.split(" ")[0]}!`);
        if (data.user.role === "admin") nav("/admin", { replace: true });
        else if (data.user.role === "owner") nav("/proprietario", { replace: true });
        else nav("/", { replace: true });
      } catch (err) {
        toast.error(formatApiError(err) || "Falha na autenticação Google");
        nav("/login", { replace: true });
      }
    })();
  }, [location.hash, nav, refresh]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center" data-testid="auth-callback">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-[hsl(22,100%,50%)] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="mt-4 text-muted-foreground text-sm">Finalizando login com Google...</p>
      </div>
    </div>
  );
}
