import { Button } from "@/components/ui/button";
import { GoogleLogo } from "@phosphor-icons/react";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function GoogleAuthButton({ label = "Continuar com Google" }) {
  const handleClick = () => {
    const redirectUrl = window.location.origin + "/auth-callback";
    window.location.href =
      "https://auth.emergentagent.com/?redirect=" + encodeURIComponent(redirectUrl);
  };
  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      data-testid="google-auth-btn"
      className="w-full h-11 border-neutral-300 hover:bg-neutral-50 font-medium"
    >
      <GoogleLogo weight="bold" size={18} className="mr-2" />
      {label}
    </Button>
  );
}
