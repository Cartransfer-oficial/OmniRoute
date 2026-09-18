import { useEffect, useState } from "react";
import { api, formatBRL } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CurrencyDollar, Users, Car, Warning, ChartLine } from "@phosphor-icons/react";

export default function AdminDashboard() {
  const [m, setM] = useState(null);
  const [users, setUsers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [commission, setCommission] = useState(12);

  const load = () => {
    Promise.all([
      api.get("/admin/metrics"),
      api.get("/admin/users"),
      api.get("/admin/vehicles"),
    ]).then(([mm, u, v]) => {
      setM(mm.data); setUsers(u.data); setVehicles(v.data); setCommission(mm.data.commission_pct);
    });
  };
  useEffect(() => { load(); }, []);

  const saveCommission = async () => {
    await api.post("/admin/config/commission", { commission_pct: +commission });
    toast.success(`Comissão atualizada para ${commission}%`); load();
  };

  const verify = async (id) => {
    await api.post(`/admin/vehicles/${id}/verify`);
    toast.success("Veículo verificado"); load();
  };

  if (!m) return <div className="max-w-6xl mx-auto p-8">Carregando...</div>;

  const cards = [
    { l: "GMV (transacionado)", v: formatBRL(m.gmv), i: ChartLine },
    { l: "Comissão acumulada", v: formatBRL(m.commission), i: CurrencyDollar },
    { l: "Repasses ao proprietário", v: formatBRL(m.payouts), i: CurrencyDollar },
    { l: "Reservas totais", v: m.total_bookings, i: Car },
    { l: "Concluídas", v: m.completed_bookings, i: Car },
    { l: "Veículos ativos", v: m.active_vehicles, i: Car },
    { l: "Usuários", v: m.users_count, i: Users },
    { l: "Ocorrências abertas", v: m.incidents_open, i: Warning },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 pb-24" data-testid="admin-dashboard">
      <span className="overline text-[hsl(22,100%,50%)]">Painel administrativo</span>
      <h1 className="font-display text-3xl md:text-4xl font-black mt-1">LOCAFACIL · Overview</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 stagger">
        {cards.map((c, i) => (
          <div key={i} className="border border-border p-4 bg-white">
            <c.i size={20} weight="duotone" className="text-[hsl(22,100%,50%)]" />
            <p className="mt-2 text-[10px] overline text-muted-foreground">{c.l}</p>
            <p className="font-display text-xl font-black numeric">{c.v}</p>
          </div>
        ))}
      </div>

      <section className="mt-10 border border-border p-5 max-w-md">
        <h2 className="font-display font-bold text-lg">Configuração de comissão</h2>
        <p className="text-sm text-muted-foreground mt-1">Percentual da plataforma sobre cada locação (aplicado a novas reservas).</p>
        <div className="mt-3 flex items-end gap-2">
          <div className="flex-1">
            <Label>Comissão (%)</Label>
            <Input type="number" step="0.5" min="0" max="30" value={commission} onChange={(e) => setCommission(e.target.value)} data-testid="admin-commission" />
          </div>
          <Button onClick={saveCommission} className="bg-[hsl(22,100%,50%)] hover:bg-[hsl(22,100%,45%)]" data-testid="admin-save-commission">Salvar</Button>
        </div>
        <div className="mt-3 flex gap-2">
          {[10, 12, 15].map((p) => (
            <button key={p} onClick={() => setCommission(p)} className="text-xs border border-border px-2 py-1 hover:border-[hsl(22,100%,50%)]" data-testid={`admin-pct-${p}`}>{p}%</button>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display font-bold text-xl mb-3">Top cidades</h2>
        <div className="flex gap-3 flex-wrap">
          {m.top_cities.map((c) => (
            <div key={c.city} className="border border-border px-4 py-2 bg-white">
              <p className="font-medium">{c.city}</p>
              <p className="text-xs text-muted-foreground">{c.count} veículos</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display font-bold text-xl mb-3">Veículos</h2>
        <div className="border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-xs uppercase text-muted-foreground">
              <tr><th className="text-left p-3">Veículo</th><th className="text-left p-3">Cidade</th><th className="text-left p-3">Preço</th><th className="text-left p-3">Status</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {vehicles.slice(0, 20).map((v) => (
                <tr key={v.id} className="border-t border-border">
                  <td className="p-3">{v.brand} {v.model} · {v.year}</td>
                  <td className="p-3">{v.city}/{v.state}</td>
                  <td className="p-3 numeric">{formatBRL(v.daily_price)}</td>
                  <td className="p-3">{v.verified ? <span className="text-[hsl(155,100%,33%)] font-medium">Verificado</span> : <span className="text-amber-600">Pendente</span>}</td>
                  <td className="p-3">{!v.verified && <Button size="sm" variant="outline" onClick={() => verify(v.id)} data-testid={`verify-${v.id}`}>Verificar</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display font-bold text-xl mb-3">Usuários ({users.length})</h2>
        <div className="border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-xs uppercase text-muted-foreground">
              <tr><th className="text-left p-3">Nome</th><th className="text-left p-3">Email</th><th className="text-left p-3">Papel</th><th className="text-left p-3">KYC</th></tr>
            </thead>
            <tbody>
              {users.slice(0, 20).map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="p-3">{u.name}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3 capitalize">{u.role}</td>
                  <td className="p-3">{u.kyc_level === "approved" ? <span className="text-[hsl(155,100%,33%)]">Aprovado</span> : <span className="text-muted-foreground">{u.kyc_level}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
