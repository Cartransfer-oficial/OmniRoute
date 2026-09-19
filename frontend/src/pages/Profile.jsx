import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { ShieldCheck, User, IdentificationCard, WhatsappLogo, InstagramLogo, FacebookLogo, PencilSimple } from "@phosphor-icons/react";

export default function Profile() {
  const { user, logout, refresh } = useAuth();
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState({
    name: user?.name || "", phone: user?.phone || "", whatsapp: user?.whatsapp || "",
    instagram: user?.instagram || "", facebook: user?.facebook || "", bio: user?.bio || "",
  });
  const [saving, setSaving] = useState(false);
  if (!user) return null;

  const levels = [
    { k: "basic", l: "Cadastro básico" },
    { k: "identity", l: "Identidade verificada" },
    { k: "cnh", l: "CNH verificada" },
    { k: "payment", l: "Pagamento validado" },
    { k: "approved", l: "Perfil aprovado" },
  ];
  const currentIdx = levels.findIndex((l) => l.k === user.kyc_level);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch("/auth/profile", f);
      toast.success("Perfil atualizado");
      await refresh();
      setEditing(false);
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 pb-24" data-testid="profile-page">
      <span className="overline text-[hsl(210,100%,22%)]">Meu perfil</span>
      <div className="flex items-start justify-between gap-4 mt-1 flex-wrap">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-black">{user.name}</h1>
          <p className="text-muted-foreground">{user.email} · {user.role === "renter" ? "Locatário" : user.role === "owner" ? "Proprietário" : "Admin"}</p>
        </div>
        {!editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)} data-testid="btn-edit-profile">
            <PencilSimple className="mr-2" size={14} />Editar
          </Button>
        )}
      </div>

      <div className="mt-8 border border-border p-6 bg-white">
        <h2 className="font-display text-xl font-bold mb-4">Dados de contato</h2>
        {editing ? (
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} data-testid="p-name" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Telefone</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} data-testid="p-phone" /></div>
              <div><Label>WhatsApp</Label><Input value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} placeholder="+55..." data-testid="p-whatsapp" /></div>
              <div><Label>Instagram</Label><Input value={f.instagram} onChange={(e) => setF({ ...f, instagram: e.target.value })} placeholder="@usuario" data-testid="p-instagram" /></div>
              <div><Label>Facebook</Label><Input value={f.facebook} onChange={(e) => setF({ ...f, facebook: e.target.value })} data-testid="p-facebook" /></div>
            </div>
            <div>
              <Label>Bio (breve descrição)</Label>
              <Textarea value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} rows={2} placeholder="Ex: Alugo carros bem cuidados na região X." data-testid="p-bio" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
              <Button onClick={save} disabled={saving} className="bg-[hsl(210,100%,22%)] hover:bg-[hsl(210,100%,15%)] flex-1" data-testid="p-save">
                {saving ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div><b>Telefone:</b> {user.phone || <span className="text-muted-foreground">não informado</span>}</div>
            <div className="flex items-center gap-2"><WhatsappLogo className="text-[hsl(155,100%,33%)]" size={16} /> {user.whatsapp || <span className="text-muted-foreground">não informado</span>}</div>
            <div className="flex items-center gap-2"><InstagramLogo className="text-pink-600" size={16} /> {user.instagram || <span className="text-muted-foreground">não informado</span>}</div>
            <div className="flex items-center gap-2"><FacebookLogo className="text-blue-600" size={16} /> {user.facebook || <span className="text-muted-foreground">não informado</span>}</div>
            {user.bio && <div className="col-span-2 italic text-muted-foreground">"{user.bio}"</div>}
          </div>
        )}
      </div>

      <div className="mt-6 border border-border p-6 bg-white">
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
          <Button asChild className="mt-4 bg-[hsl(210,100%,22%)] hover:bg-[hsl(210,100%,15%)]" data-testid="btn-complete-kyc">
            <Link to="/verificacao"><IdentificationCard className="mr-2" />Concluir verificação</Link>
          </Button>
        )}
      </div>

      {user.role === "owner" && (
        <div className="mt-6 border border-border p-6 bg-sky-50">
          <h2 className="font-display text-xl font-bold">Sua frota</h2>
          <p className="text-sm mt-1">Tem mais de um veículo? Você pode adicionar quantos quiser!</p>
          <div className="mt-3 flex gap-2">
            <Button asChild className="bg-[hsl(210,100%,22%)] hover:bg-[hsl(210,100%,15%)]" data-testid="btn-add-vehicle-profile"><Link to="/anuncie">Cadastrar novo veículo</Link></Button>
            <Button asChild variant="outline"><Link to="/proprietario">Meus veículos</Link></Button>
          </div>
        </div>
      )}

      <div className="mt-6 border border-border p-6 bg-white">
        <h2 className="font-display text-xl font-bold flex items-center gap-2 mb-3"><User weight="duotone" size={22} className="text-[hsl(210,100%,22%)]" />Meus dados (LGPD)</h2>
        <p className="text-sm text-muted-foreground">Você pode solicitar o download completo dos seus dados pessoais tratados pela DriveHub, correção ou exclusão de conta a qualquer momento.</p>
        <div className="mt-3 flex gap-2">
          <Button variant="outline" size="sm">Solicitar meus dados</Button>
          <Button variant="outline" size="sm">Excluir conta</Button>
        </div>
      </div>

      <Button variant="outline" onClick={logout} className="mt-6" data-testid="btn-logout">Sair da conta</Button>
    </div>
  );
}
