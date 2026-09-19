import { useEffect, useState } from "react";
import { api, formatBRL, formatDate } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  CurrencyDollar, Users, Car, Warning, ChartLine, ShieldCheck,
  MapPin, Envelope, WhatsappLogo, InstagramLogo, FacebookLogo, Phone,
} from "@phosphor-icons/react";

const KYC_LABELS = { basic: "Básico", identity: "Identidade", cnh: "CNH", payment: "Pagamento", approved: "Aprovado" };

function UserDetailModal({ uid, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const reload = () => api.get(`/admin/users/${uid}`).then(({ data }) => setData(data));
  useEffect(() => { if (uid) reload(); /* eslint-disable-next-line */ }, [uid]);

  const suspend = async () => {
    if (!window.confirm(`Suspender ${data.user.name}? Isso pausa todos os veículos e encerra sessões ativas.`)) return;
    try {
      await api.post(`/admin/users/${uid}/suspend`);
      toast.success("Usuário suspenso");
      reload(); onChanged?.();
    } catch (e) { toast.error(e?.response?.data?.detail || "Erro"); }
  };
  const unsuspend = async () => {
    await api.post(`/admin/users/${uid}/unsuspend`);
    toast.success("Usuário reativado"); reload(); onChanged?.();
  };

  if (!uid) return null;
  return (
    <Dialog open={!!uid} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="user-detail-modal">
        <DialogHeader><DialogTitle>Detalhes do usuário</DialogTitle></DialogHeader>
        {!data ? <p>Carregando...</p> : (
          <div className="space-y-4">
            <div className="border border-border p-4 bg-neutral-50">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-2xl font-bold">{data.user.name}</h3>
                  <p className="text-sm text-muted-foreground capitalize">{data.user.role} · Cadastro em {formatDate(data.user.created_at)}</p>
                  {data.user.suspended && <Badge className="bg-red-100 text-red-800 mt-1">⚠ Suspenso</Badge>}
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <Badge className={data.user.kyc_level === "approved" ? "bg-[hsl(155,100%,33%)] text-white" : "bg-amber-100 text-amber-800"}>
                    <ShieldCheck size={12} className="mr-1" />KYC: {KYC_LABELS[data.user.kyc_level] || data.user.kyc_level}
                  </Badge>
                  {data.user.role !== "admin" && (
                    data.user.suspended
                      ? <Button size="sm" onClick={unsuspend} className="mt-2" data-testid="btn-unsuspend">Reativar conta</Button>
                      : <Button size="sm" variant="destructive" onClick={suspend} className="mt-2" data-testid="btn-suspend">Suspender conta</Button>
                  )}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2"><Envelope size={14} className="text-[hsl(210,100%,22%)]" /> {data.user.email}</div>
                {data.user.phone && <div className="flex items-center gap-2"><Phone size={14} className="text-[hsl(210,100%,22%)]" /> {data.user.phone}</div>}
                {data.user.whatsapp && <div className="flex items-center gap-2"><WhatsappLogo size={14} className="text-[hsl(155,100%,33%)]" /> {data.user.whatsapp}</div>}
                {data.user.instagram && <div className="flex items-center gap-2"><InstagramLogo size={14} className="text-pink-600" /> {data.user.instagram}</div>}
                {data.user.facebook && <div className="flex items-center gap-2"><FacebookLogo size={14} className="text-blue-600" /> {data.user.facebook}</div>}
              </div>
              {data.user.bio && <p className="mt-3 text-sm italic">"{data.user.bio}"</p>}
            </div>

            {data.user.kyc_data && (
              <div className="border border-border p-4">
                <h4 className="font-display font-bold mb-2">Dados KYC</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><b>CPF:</b> {data.user.kyc_data.cpf}</div>
                  <div><b>Nascimento:</b> {data.user.kyc_data.birth_date}</div>
                  <div><b>CNH:</b> {data.user.kyc_data.cnh_number} · Cat. {data.user.kyc_data.cnh_category}</div>
                  <div><b>Válida até:</b> {data.user.kyc_data.cnh_valid_until}</div>
                  <div className="col-span-2"><b>Endereço:</b> {data.user.kyc_data.address}, {data.user.kyc_data.city}/{data.user.kyc_data.state} · CEP {data.user.kyc_data.cep}</div>
                </div>
                {data.user.kyc_data.cnh_photo && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div><Label className="text-xs">CNH</Label><img src={data.user.kyc_data.cnh_photo} alt="CNH" className="w-full h-24 object-cover border" /></div>
                    <div><Label className="text-xs">Documento</Label><img src={data.user.kyc_data.id_photo} alt="ID" className="w-full h-24 object-cover border" /></div>
                    <div><Label className="text-xs">Selfie</Label><img src={data.user.kyc_data.selfie} alt="Selfie" className="w-full h-24 object-cover border" /></div>
                  </div>
                )}
              </div>
            )}

            <Tabs defaultValue="vehicles">
              <TabsList>
                <TabsTrigger value="vehicles">Veículos ({data.vehicles.length})</TabsTrigger>
                <TabsTrigger value="renter">Como locatário ({data.bookings_as_renter.length})</TabsTrigger>
                <TabsTrigger value="owner">Como proprietário ({data.bookings_as_owner.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="vehicles" className="space-y-2 mt-2">
                {data.vehicles.length === 0 && <p className="text-sm text-muted-foreground p-4">Nenhum veículo cadastrado.</p>}
                {data.vehicles.map((v) => (
                  <div key={v.id} className="border border-border p-3 flex gap-3 items-center">
                    <img src={v.photos?.[0]} alt="" className="w-16 h-16 object-cover" />
                    <div className="flex-1">
                      <p className="font-bold">{v.brand} {v.model} · {v.year}</p>
                      <p className="text-xs text-muted-foreground">{v.city}/{v.state} · {formatBRL(v.daily_price)}/dia · {v.status}</p>
                    </div>
                    <Badge variant={v.verified ? "default" : "outline"}>{v.verified ? "Verificado" : "Pendente"}</Badge>
                  </div>
                ))}
              </TabsContent>
              <TabsContent value="renter" className="space-y-2 mt-2">
                {data.bookings_as_renter.map((b) => (
                  <div key={b.id} className="border border-border p-3">
                    <p className="font-medium">{b.vehicle_snapshot.brand} {b.vehicle_snapshot.model}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(b.start_date)} → {formatDate(b.end_date)} · {b.status}</p>
                    <p className="text-xs">Total: {formatBRL(b.pricing.total)}</p>
                  </div>
                ))}
                {data.bookings_as_renter.length === 0 && <p className="text-sm text-muted-foreground p-4">Nenhuma reserva como locatário.</p>}
              </TabsContent>
              <TabsContent value="owner" className="space-y-2 mt-2">
                {data.bookings_as_owner.map((b) => (
                  <div key={b.id} className="border border-border p-3">
                    <p className="font-medium">{b.vehicle_snapshot.brand} {b.vehicle_snapshot.model}</p>
                    <p className="text-xs text-muted-foreground">Locatário: {b.renter_name} · {b.status}</p>
                    <p className="text-xs">Repasse: {formatBRL(b.pricing.owner_amount)}</p>
                  </div>
                ))}
                {data.bookings_as_owner.length === 0 && <p className="text-sm text-muted-foreground p-4">Nenhuma reserva como proprietário.</p>}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function VehicleDetailModal({ vid, onClose, onVerified }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!vid) return;
    api.get(`/admin/vehicles/${vid}`).then(({ data }) => setData(data));
  }, [vid]);
  if (!vid) return null;
  const verify = async () => {
    await api.post(`/admin/vehicles/${vid}/verify`);
    toast.success("Veículo verificado");
    onVerified?.();
    onClose();
  };
  return (
    <Dialog open={!!vid} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="vehicle-detail-modal">
        <DialogHeader><DialogTitle>Detalhes do veículo</DialogTitle></DialogHeader>
        {!data ? <p>Carregando...</p> : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {(data.vehicle.photos || []).map((p, i) => (
                <img key={i} src={p} alt="" className="w-full aspect-square object-cover border" />
              ))}
            </div>
            <div>
              <h3 className="font-display text-2xl font-bold">{data.vehicle.brand} {data.vehicle.model} · {data.vehicle.year}</h3>
              <p className="text-sm text-muted-foreground">{data.vehicle.version} · {data.vehicle.color} · Placa: {data.vehicle.plate_full}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <Badge>{data.vehicle.category}</Badge>
                <Badge variant="outline">{data.vehicle.transmission}</Badge>
                <Badge variant="outline">{data.vehicle.fuel}</Badge>
                <Badge variant="outline">{data.vehicle.seats} lugares</Badge>
                <Badge variant="outline">{data.vehicle.km} km</Badge>
                {data.vehicle.verified ? <Badge className="bg-[hsl(155,100%,33%)] text-white">Verificado</Badge> : <Badge className="bg-amber-100 text-amber-800">Pendente</Badge>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm border border-border p-3">
              <div><b>Localização:</b> {data.vehicle.neighborhood}, {data.vehicle.city}/{data.vehicle.state}</div>
              <div><b>Coordenadas:</b> {data.vehicle.lat}, {data.vehicle.lng}</div>
              <div><b>Diária:</b> {formatBRL(data.vehicle.daily_price)}</div>
              <div><b>Caução:</b> {formatBRL(data.vehicle.deposit)}</div>
              <div><b>KM/dia:</b> {data.vehicle.included_km_per_day}</div>
              <div><b>KM excedente:</b> {formatBRL(data.vehicle.extra_km_price)}</div>
            </div>
            {data.vehicle.features?.length > 0 && (
              <div>
                <Label className="overline">Comodidades</Label>
                <p className="text-sm">{data.vehicle.features.join(" · ")}</p>
              </div>
            )}
            <div className="border border-border p-3">
              <Label className="overline">Proprietário</Label>
              <p className="font-medium">{data.owner?.name} · {data.owner?.email}</p>
              <p className="text-sm">{data.owner?.phone} · WA: {data.owner?.whatsapp}</p>
            </div>
            <div>
              <Label className="overline">Reservas deste veículo ({data.bookings.length})</Label>
              <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
                {data.bookings.map((b) => (
                  <div key={b.id} className="text-xs border border-border p-2">
                    {b.renter_name} · {formatDate(b.start_date)} → {formatDate(b.end_date)} · {b.status} · {formatBRL(b.pricing?.total)}
                  </div>
                ))}
              </div>
            </div>
            {!data.vehicle.verified && (
              <Button onClick={verify} className="w-full bg-[hsl(155,100%,33%)] hover:bg-[hsl(155,100%,28%)]" data-testid="modal-verify-btn">
                <ShieldCheck className="mr-2" />Marcar como verificado
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function AdminDashboard() {
  const [m, setM] = useState(null);
  const [users, setUsers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [commission, setCommission] = useState(12);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [tab, setTab] = useState("all");

  const load = () => {
    Promise.all([
      api.get("/admin/metrics"),
      api.get("/admin/users"),
      api.get("/admin/vehicles"),
      api.get("/admin/analytics"),
    ]).then(([mm, u, v, a]) => {
      setM(mm.data); setUsers(u.data); setVehicles(v.data); setAnalytics(a.data);
      setCommission(mm.data.commission_pct);
    });
  };
  useEffect(() => { load(); }, []);

  const saveCommission = async () => {
    await api.post("/admin/config/commission", { commission_pct: +commission });
    toast.success(`Comissão atualizada para ${commission}%`); load();
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

  const filteredUsers = users.filter((u) => tab === "all" || u.role === tab);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 pb-24" data-testid="admin-dashboard">
      <span className="overline text-[hsl(210,100%,22%)]">Painel administrativo</span>
      <h1 className="font-display text-3xl md:text-4xl font-black mt-1">DriveHub · Overview</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 stagger">
        {cards.map((c, i) => (
          <div key={i} className="border border-border p-4 bg-white">
            <c.i size={20} weight="duotone" className="text-[hsl(210,100%,22%)]" />
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
          <Button onClick={saveCommission} className="bg-[hsl(210,100%,22%)] hover:bg-[hsl(210,100%,15%)]" data-testid="admin-save-commission">Salvar</Button>
        </div>
        <div className="mt-3 flex gap-2">
          {[10, 12, 15].map((p) => (
            <button key={p} onClick={() => setCommission(p)} className="text-xs border border-border px-2 py-1 hover:border-[hsl(210,100%,22%)]" data-testid={`admin-pct-${p}`}>{p}%</button>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display font-bold text-xl mb-3">📊 Analytics — quem está performando</h2>
        {analytics && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-border p-5 bg-white">
              <h3 className="font-display font-bold mb-3">🏆 Veículos mais alugados</h3>
              {analytics.top_vehicles.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma reserva ainda.</p>}
              <ol className="space-y-2">
                {analytics.top_vehicles.map((v, i) => (
                  <li key={v.vehicle_id} className="flex items-center gap-3 text-sm" data-testid={`top-veh-${i}`}>
                    <span className="font-display font-black text-lg text-[hsl(210,100%,22%)] w-6">#{i + 1}</span>
                    {v.photo && <img src={v.photo} alt="" className="w-12 h-12 object-cover" />}
                    <div className="flex-1">
                      <p className="font-medium">{v.label}</p>
                      <p className="text-xs text-muted-foreground">{v.bookings} reservas · {formatBRL(v.gmv)} GMV</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="border border-border p-5 bg-white">
              <h3 className="font-display font-bold mb-3">⭐ Top proprietários (faturamento)</h3>
              {analytics.top_owners.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma reserva ainda.</p>}
              <ol className="space-y-2">
                {analytics.top_owners.map((o, i) => (
                  <li key={o.owner_id} className="flex items-center gap-3 text-sm" data-testid={`top-owner-${i}`}>
                    <span className="font-display font-black text-lg text-[hsl(180,90%,45%)] w-6">#{i + 1}</span>
                    <button onClick={() => setSelectedUser(o.owner_id)} className="flex-1 text-left hover:underline">
                      <p className="font-medium">{o.name}</p>
                      <p className="text-xs text-muted-foreground">{o.bookings} reservas · {formatBRL(o.earnings)} recebidos</p>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
            <div className="border border-border p-5 bg-amber-50">
              <h3 className="font-display font-bold mb-3">⚠ Proprietários que precisam de ajuda</h3>
              <p className="text-xs text-muted-foreground mb-2">Têm carros cadastrados mas ainda não venderam.</p>
              {analytics.underperforming_owners.length === 0 && <p className="text-sm text-muted-foreground">Todos os proprietários estão vendendo. 🎉</p>}
              <ul className="space-y-2">
                {analytics.underperforming_owners.map((o) => (
                  <li key={o.owner_id} className="flex items-center gap-3 text-sm" data-testid={`under-owner-${o.owner_id}`}>
                    <button onClick={() => setSelectedUser(o.owner_id)} className="flex-1 text-left hover:underline">
                      <p className="font-medium">{o.name}</p>
                      <p className="text-xs text-muted-foreground">{o.vehicles} veículo(s) sem reservas</p>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border border-border p-5 bg-white">
              <h3 className="font-display font-bold mb-3">📈 Distribuição por categoria</h3>
              <ul className="space-y-2">
                {analytics.categories.map((c) => {
                  const max = Math.max(...analytics.categories.map((x) => x.count));
                  const pct = (c.count / max) * 100;
                  return (
                    <li key={c.category} className="text-sm">
                      <div className="flex justify-between mb-0.5"><span className="capitalize">{c.category}</span><span className="font-bold numeric">{c.count}</span></div>
                      <div className="h-2 bg-neutral-100 overflow-hidden"><div style={{ width: `${pct}%` }} className="h-full bg-[hsl(210,100%,22%)]" /></div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
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
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-xl">Veículos ({vehicles.length})</h2>
          <span className="text-xs text-muted-foreground">Clique para ver fotos e detalhes completos</span>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {vehicles.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelectedVehicle(v.id)}
              data-testid={`admin-veh-${v.id}`}
              className="text-left border border-border overflow-hidden card-hover"
            >
              <img src={v.photos?.[0]} alt="" className="w-full aspect-[4/3] object-cover" />
              <div className="p-3">
                <p className="font-display font-bold">{v.brand} {v.model}</p>
                <p className="text-xs text-muted-foreground">{v.city}/{v.state} · {formatBRL(v.daily_price)}/dia</p>
                <div className="mt-1">
                  {v.verified
                    ? <Badge className="bg-[hsl(155,100%,33%)] text-white text-xs">Verificado</Badge>
                    : <Badge className="bg-amber-100 text-amber-800 text-xs">Pendente</Badge>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-xl">Usuários ({users.length})</h2>
          <span className="text-xs text-muted-foreground">Clique em uma linha para ver o cadastro completo</span>
        </div>
        <div className="flex gap-2 mb-3">
          {[
            { k: "all", l: "Todos" }, { k: "renter", l: "Locatários" },
            { k: "owner", l: "Proprietários" }, { k: "admin", l: "Admins" },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              data-testid={`admin-tab-${t.k}`}
              className={`text-sm px-3 py-1.5 border ${tab === t.k ? "border-[hsl(210,100%,22%)] bg-sky-50 text-[hsl(210,100%,18%)] font-medium" : "border-border"}`}
            >
              {t.l}
            </button>
          ))}
        </div>
        <div className="border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Nome</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Contato</th>
                <th className="text-left p-3">Papel</th>
                <th className="text-left p-3">KYC</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => setSelectedUser(u.id)}
                  data-testid={`admin-user-${u.id}`}
                  className="border-t border-border cursor-pointer hover:bg-sky-50 transition-colors"
                >
                  <td className="p-3 font-medium">{u.name}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3 text-xs">
                    {u.whatsapp && <span className="inline-flex items-center gap-1 mr-2"><WhatsappLogo size={12} className="text-[hsl(155,100%,33%)]" />{u.whatsapp}</span>}
                    {u.instagram && <span className="inline-flex items-center gap-1"><InstagramLogo size={12} className="text-pink-600" />{u.instagram}</span>}
                  </td>
                  <td className="p-3 capitalize">{u.role}</td>
                  <td className="p-3">
                    {u.suspended && <Badge className="bg-red-100 text-red-800 text-xs mr-1">Suspenso</Badge>}
                    {u.kyc_level === "approved"
                      ? <Badge className="bg-[hsl(155,100%,33%)] text-white text-xs">Aprovado</Badge>
                      : <Badge className="bg-neutral-100 text-neutral-700 text-xs">{KYC_LABELS[u.kyc_level] || u.kyc_level}</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <UserDetailModal uid={selectedUser} onClose={() => setSelectedUser(null)} onChanged={load} />
      <VehicleDetailModal vid={selectedVehicle} onClose={() => setSelectedVehicle(null)} onVerified={load} />
    </div>
  );
}
