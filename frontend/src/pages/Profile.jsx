import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldCheck, User, IdentificationCard } from "@phosphor-icons/react";

export default function Profile() {
  const { user, logout } = useAuth();
  if (!user) return null;
  const levels = [
    { k: "basic", l: "Cadastro básico" },
    { k: "identity", l: "Identidade verificada" },
    { k: "cnh", l: "CNH verificada" },
    { k: "payment", l: "Pagamento validado" },
    { k: "approved", l: "Perfil aprovado" },
  ];
  const currentIdx = levels.findIndex((l) => l.k === user.kyc_level);

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 pb-24" data-testid="profile-page">
      <span className="overline text-[hsl(22,100%,50%)]">Meu perfil</span>
      <h1 className="font-display text-3xl md:text-4xl font-black mt-1">{user.name}</h1>
      <p className="text-muted-foreground">{user.email} · {user.role === "renter" ? "Locatário" : user.role === "owner" ? "Proprietário" : "Admin"}</p>

      <div className="mt-8 border border-border p-6 bg-white">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck weight="duotone" size={22} className="text-[hsl(155,100%,33%)]" />
          <h2 className="font-display text-xl font-bold">Nível de verificação</h2>
        </div>
        <div className="space-y-2">
          {levels.map((l, i) => (
            <div key={l.k} className={`flex items-center gap-2 text-sm ${i <= currentIdx ? "text-[hsl(155,100%,33%)] font-medium" : "text-muted-foreground"}`}>
              <div className={`w-5 h-5 border-2 ${i <= currentIdx ? "bg-[hsl(155,100%,33%)] border-[hsl(155,100%,33%)]" : "border-neutral-300"}`} />
              {l.l}
            </div>
          ))}
        </div>
        {user.role === "renter" && user.kyc_level !== "approved" && (
          <Button asChild className="mt-4 bg-[hsl(22,100%,50%)] hover:bg-[hsl(22,100%,45%)]" data-testid="btn-complete-kyc">
            <Link to="/verificacao"><IdentificationCard className="mr-2" />Concluir verificação</Link>
          </Button>
        )}
      </div>

      <div className="mt-6 border border-border p-6 bg-white">
        <h2 className="font-display text-xl font-bold flex items-center gap-2 mb-3"><User weight="duotone" size={22} className="text-[hsl(22,100%,50%)]" />Meus dados (LGPD)</h2>
        <p className="text-sm text-muted-foreground">Você pode solicitar o download completo dos seus dados pessoais tratados pela LOCAFACIL, correção ou exclusão de conta a qualquer momento.</p>
        <div className="mt-3 flex gap-2">
          <Button variant="outline" size="sm">Solicitar meus dados</Button>
          <Button variant="outline" size="sm">Excluir conta</Button>
        </div>
      </div>

      <Button variant="outline" onClick={logout} className="mt-6" data-testid="btn-logout">Sair da conta</Button>
    </div>
  );
}
