import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Register() {
  const { register, formatApiError } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "", role: "renter",
    whatsapp: "", instagram: "", facebook: "",
  });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await register(form);
      toast.success("Conta criada!");
      if (u.role === "owner") nav("/anuncie");
      else nav("/verificacao");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" data-testid="register-page">
      <form onSubmit={submit} className="w-full max-w-md space-y-4 bg-white border border-border p-8">
        <div>
          <h1 className="font-display text-3xl font-black">Criar conta</h1>
          <p className="text-sm text-muted-foreground mt-1">Já tem conta? <Link to="/login" className="text-[hsl(22,100%,50%)] font-medium">Entrar</Link></p>
        </div>
        <div>
          <Label>Nome completo</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required data-testid="reg-name" />
        </div>
        <div>
          <Label>Email</Label>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required data-testid="reg-email" />
        </div>
        <div>
          <Label>Telefone</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value, whatsapp: form.whatsapp || e.target.value })} placeholder="+55 11 99999-9999" data-testid="reg-phone" />
        </div>
        <div>
          <Label>WhatsApp <span className="text-xs text-muted-foreground">(usado para combinar retirada)</span></Label>
          <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="+5511999999999" data-testid="reg-whatsapp" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Instagram <span className="text-xs text-muted-foreground">(opcional)</span></Label>
            <Input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} placeholder="@usuario" data-testid="reg-instagram" />
          </div>
          <div>
            <Label>Facebook <span className="text-xs text-muted-foreground">(opcional)</span></Label>
            <Input value={form.facebook} onChange={(e) => setForm({ ...form, facebook: e.target.value })} placeholder="usuario" data-testid="reg-facebook" />
          </div>
        </div>
        <div>
          <Label>Senha (mínimo 6 caracteres)</Label>
          <Input type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required data-testid="reg-password" />
        </div>
        <div>
          <Label className="overline text-[10px] mb-2 block">Você é</Label>
          <div className="grid grid-cols-2 gap-2">
            {[{ v: "renter", l: "Quero alugar" }, { v: "owner", l: "Tenho um carro" }].map((r) => (
              <button
                key={r.v}
                type="button"
                data-testid={`reg-role-${r.v}`}
                onClick={() => setForm({ ...form, role: r.v })}
                className={`border p-3 text-sm font-medium ${form.role === r.v ? "border-[hsl(22,100%,50%)] bg-orange-50 text-[hsl(22,100%,40%)]" : "border-border"}`}
              >
                {r.l}
              </button>
            ))}
          </div>
        </div>
        <Button type="submit" disabled={loading} className="w-full bg-[hsl(22,100%,50%)] hover:bg-[hsl(22,100%,45%)]" data-testid="reg-submit">
          {loading ? "Criando..." : "Criar minha conta"}
        </Button>
        <p className="text-xs text-muted-foreground text-center">Ao continuar você aceita os Termos de Uso e a Política de Privacidade (LGPD).</p>
      </form>
    </div>
  );
}
