import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Car } from "@phosphor-icons/react";
import GoogleAuthButton from "@/components/GoogleAuthButton";

export default function Login() {
  const { login, formatApiError } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(email, password);
      toast.success(`Bem-vindo, ${u.name.split(" ")[0]}!`);
      if (u.role === "admin") nav("/admin");
      else if (u.role === "owner") nav("/proprietario");
      else nav("/");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2 -mt-16 pt-16">
      <div className="relative hidden md:block">
        <img src="https://images.pexels.com/photos/37075472/pexels-photo-37075472.jpeg" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 h-full flex flex-col justify-end p-12 text-white">
          <div className="flex items-center gap-2 mb-8">
            <Car weight="fill" size={28} className="text-[hsl(180,90%,45%)]" />
            <span className="font-display text-2xl font-black">DriveHub</span>
          </div>
          <h2 className="font-display text-4xl font-black leading-tight">
            Encontre o carro certo.<br />Onde estiver.
          </h2>
        </div>
      </div>
      <div className="flex items-center justify-center p-8" data-testid="login-page">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <div>
            <h1 className="font-display text-3xl font-black">Entrar</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Não tem conta? <Link to="/cadastro" className="text-[hsl(210,100%,22%)] font-medium">Criar agora</Link>
            </p>
          </div>

          <GoogleAuthButton label="Entrar com Google" />

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">ou com e-mail</span>
            </div>
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="login-email" />
          </div>
          <div>
            <Label>Senha</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required data-testid="login-password" />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-[hsl(210,100%,22%)] hover:bg-[hsl(210,100%,15%)]" data-testid="login-submit">
            {loading ? "Entrando..." : "Entrar"}
          </Button>
          <div className="mt-6 border border-dashed border-border p-3 text-xs bg-neutral-50">
            <p className="font-bold mb-1">Contas de teste:</p>
            <p>Locatário: <code>locatario@teste.com</code> / <code>Teste@2026</code></p>
            <p>Proprietário: <code>proprietario@teste.com</code> / <code>Teste@2026</code></p>
            <p>Admin: <code>admin@drivehub.com.br</code> / <code>DriveHub@2026</code></p>
          </div>
        </form>
      </div>
    </div>
  );
}
