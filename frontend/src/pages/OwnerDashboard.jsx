import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatBRL, formatDate, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus, Car, CheckCircle, CurrencyDollar, Star, Pause, Play, PencilSimple, Trash, Bell,
} from "@phosphor-icons/react";

const STATUS = {
  pending_payment: { l: "Aguardando pagto", c: "bg-amber-100 text-amber-800" },
  confirmed: { l: "Confirmada", c: "bg-blue-100 text-blue-800" },
  checked_in: { l: "Em uso", c: "bg-sky-100 text-sky-800" },
  completed: { l: "Concluída", c: "bg-green-100 text-green-800" },
  cancelled: { l: "Cancelada", c: "bg-neutral-200 text-neutral-700" },
};

function EditVehicleModal({ vehicle, onClose, onSaved }) {
  const [f, setF] = useState({
    daily_price: vehicle.daily_price, deposit: vehicle.deposit,
    included_km_per_day: vehicle.included_km_per_day, extra_km_price: vehicle.extra_km_price,
    city: vehicle.city, state: vehicle.state, neighborhood: vehicle.neighborhood,
    allow_pets: vehicle.allow_pets, airport_pickup: vehicle.airport_pickup,
    delivery_available: vehicle.delivery_available, delivery_fee: vehicle.delivery_fee,
    photos: (vehicle.photos || []).join("\n"),
    rules: (vehicle.rules || []).join("\n"),
  });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...f,
        daily_price: +f.daily_price, deposit: +f.deposit,
        included_km_per_day: +f.included_km_per_day, extra_km_price: +f.extra_km_price,
        delivery_fee: +f.delivery_fee,
        photos: f.photos.split("\n").map((s) => s.trim()).filter(Boolean),
        rules: f.rules.split("\n").map((s) => s.trim()).filter(Boolean),
      };
      await api.patch(`/vehicles/${vehicle.id}`, payload);
      toast.success("Anúncio atualizado");
      onSaved();
      onClose();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSaving(false); }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="edit-vehicle-modal">
        <DialogHeader>
          <DialogTitle>Editar {vehicle.brand} {vehicle.model}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Preço/dia (R$)</Label><Input type="number" value={f.daily_price} onChange={(e) => setF({ ...f, daily_price: e.target.value })} data-testid="edit-price" /></div>
            <div><Label>Caução (R$)</Label><Input type="number" value={f.deposit} onChange={(e) => setF({ ...f, deposit: e.target.value })} data-testid="edit-deposit" /></div>
            <div><Label>KM incluídos/dia</Label><Input type="number" value={f.included_km_per_day} onChange={(e) => setF({ ...f, included_km_per_day: e.target.value })} /></div>
            <div><Label>Preço km excedente</Label><Input type="number" step="0.1" value={f.extra_km_price} onChange={(e) => setF({ ...f, extra_km_price: e.target.value })} /></div>
            <div><Label>Cidade</Label><Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></div>
            <div><Label>Estado</Label><Input value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })} /></div>
            <div className="col-span-2"><Label>Bairro</Label><Input value={f.neighborhood} onChange={(e) => setF({ ...f, neighborhood: e.target.value })} /></div>
          </div>
          <div>
            <Label>Fotos (uma URL por linha)</Label>
            <Textarea value={f.photos} onChange={(e) => setF({ ...f, photos: e.target.value })} rows={3} data-testid="edit-photos" />
          </div>
          <div>
            <Label>Regras (uma por linha)</Label>
            <Textarea value={f.rules} onChange={(e) => setF({ ...f, rules: e.target.value })} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.allow_pets} onChange={(e) => setF({ ...f, allow_pets: e.target.checked })} />Permite animais</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.airport_pickup} onChange={(e) => setF({ ...f, airport_pickup: e.target.checked })} />Retirada em aeroporto</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.delivery_available} onChange={(e) => setF({ ...f, delivery_available: e.target.checked })} />Entrega no local</label>
            <div><Label className="text-xs">Taxa entrega (R$)</Label><Input type="number" value={f.delivery_fee} onChange={(e) => setF({ ...f, delivery_fee: e.target.value })} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving} className="bg-[hsl(210,100%,22%)] hover:bg-[hsl(210,100%,15%)]" data-testid="edit-save">
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function OwnerDashboard() {
  const [vehicles, setVehicles] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = () => {
    Promise.all([
      api.get("/vehicles/mine/list"),
      api.get("/bookings/mine"),
    ]).then(([v, b]) => { setVehicles(v.data); setBookings(b.data); });
  };
  useEffect(() => { load(); }, []);

  const toggle = async (v) => {
    try {
      const { data } = await api.post(`/vehicles/${v.id}/toggle-status`);
      toast.success(data.status === "active" ? "Anúncio ativado" : "Anúncio pausado");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const remove = async (v) => {
    if (!window.confirm(`Remover ${v.brand} ${v.model}? Não pode ser desfeito.`)) return;
    try {
      await api.delete(`/vehicles/${v.id}`);
      toast.success("Anúncio removido");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const totalEarnings = bookings
    .filter((b) => ["confirmed", "checked_in", "completed"].includes(b.status))
    .reduce((s, b) => s + (b.pricing?.owner_amount || 0), 0);
  const completed = bookings.filter((b) => b.status === "completed").length;
  const pending = bookings.filter((b) => b.status === "pending_payment").length;

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 pb-24" data-testid="owner-dashboard">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <span className="overline text-[hsl(210,100%,22%)]">Painel do proprietário</span>
          <h1 className="font-display text-3xl md:text-4xl font-black mt-1">Sua frota</h1>
        </div>
        <Button asChild className="bg-[hsl(210,100%,22%)] hover:bg-[hsl(210,100%,15%)]" data-testid="btn-add-vehicle">
          <Link to="/anuncie"><Plus size={16} className="mr-1" />Cadastrar veículo</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        {[
          { l: "Veículos", v: vehicles.length, i: Car },
          { l: "Reservas", v: bookings.length, i: CheckCircle },
          { l: "Concluídas", v: completed, i: Star },
          { l: "Faturamento", v: formatBRL(totalEarnings), i: CurrencyDollar },
        ].map((s, i) => (
          <div key={i} className="border border-border p-5 bg-white">
            <s.i size={22} weight="duotone" className="text-[hsl(210,100%,22%)]" />
            <p className="mt-3 text-xs overline text-muted-foreground">{s.l}</p>
            <p className="font-display text-2xl font-black numeric">{s.v}</p>
          </div>
        ))}
      </div>

      {pending > 0 && (
        <div className="mt-6 border border-[hsl(180,90%,45%)] bg-sky-50 p-4 flex items-center gap-3">
          <Bell weight="fill" size={20} className="text-[hsl(210,100%,22%)]" />
          <p className="text-sm"><b>{pending} reserva(s) aguardando pagamento.</b> Você receberá notificação assim que o pagamento for confirmado.</p>
        </div>
      )}

      <h2 className="font-display text-xl font-bold mt-10 mb-3">Meus veículos</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vehicles.map((v) => (
          <div key={v.id} className="border border-border overflow-hidden bg-white flex flex-col" data-testid={`owner-veh-${v.id}`}>
            <Link to={`/veiculo/${v.id}`} className="block">
              <div className="relative aspect-[4/3]">
                <img src={v.photos?.[0]} alt="" className="w-full h-full object-cover" />
                {v.status === "paused" && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-white font-bold text-lg font-display">PAUSADO</span>
                  </div>
                )}
                {v.status === "deleted" && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">REMOVIDO</span>
                  </div>
                )}
              </div>
            </Link>
            <div className="p-3 flex-1">
              <p className="font-display font-bold">{v.brand} {v.model}</p>
              <p className="text-xs text-muted-foreground">{v.year} · {v.city}</p>
              <p className="mt-1 font-bold text-[hsl(210,100%,22%)]">{formatBRL(v.daily_price)}/dia</p>
              <div className="mt-1">
                {v.status === "active" && <Badge className="bg-green-100 text-green-800 text-xs">Ativo</Badge>}
                {v.status === "paused" && <Badge className="bg-amber-100 text-amber-800 text-xs">Pausado</Badge>}
                {v.status === "deleted" && <Badge className="bg-neutral-200 text-neutral-700 text-xs">Removido</Badge>}
              </div>
            </div>
            {v.status !== "deleted" && (
              <div className="p-3 pt-0 flex gap-1">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditing(v)} data-testid={`edit-veh-${v.id}`}>
                  <PencilSimple size={14} className="mr-1" />Editar
                </Button>
                <Button size="sm" variant="outline" onClick={() => toggle(v)} data-testid={`toggle-veh-${v.id}`} title={v.status === "active" ? "Pausar" : "Ativar"}>
                  {v.status === "active" ? <Pause size={14} /> : <Play size={14} />}
                </Button>
                <Button size="sm" variant="outline" onClick={() => remove(v)} data-testid={`del-veh-${v.id}`} title="Remover">
                  <Trash size={14} className="text-destructive" />
                </Button>
              </div>
            )}
          </div>
        ))}
        {vehicles.length === 0 && (
          <div className="col-span-full border border-dashed border-border p-10 text-center">
            <p className="text-muted-foreground">Você ainda não anunciou veículos.</p>
            <Button asChild className="mt-4 bg-[hsl(210,100%,22%)] hover:bg-[hsl(210,100%,15%)]"><Link to="/anuncie">Cadastrar primeiro veículo</Link></Button>
          </div>
        )}
      </div>

      <h2 className="font-display text-xl font-bold mt-10 mb-3">Reservas recentes</h2>
      <div className="border border-border">
        {bookings.length === 0 && <p className="p-6 text-muted-foreground text-sm">Nenhuma reserva ainda.</p>}
        {bookings.slice(0, 10).map((b) => {
          const s = STATUS[b.status] || { l: b.status, c: "" };
          return (
            <Link key={b.id} to={`/reserva/${b.id}`} className="grid grid-cols-[1fr_auto_auto] gap-4 items-center p-4 border-b border-border last:border-0 hover:bg-neutral-50" data-testid={`owner-book-${b.id}`}>
              <div>
                <p className="font-medium">{b.vehicle_snapshot.brand} {b.vehicle_snapshot.model}</p>
                <p className="text-xs text-muted-foreground">{b.renter_name} · {formatDate(b.start_date)} → {formatDate(b.end_date)}</p>
              </div>
              <Badge className={s.c}>{s.l}</Badge>
              <span className="font-bold numeric">{formatBRL(b.pricing?.owner_amount)}</span>
            </Link>
          );
        })}
      </div>

      {editing && <EditVehicleModal vehicle={editing} onClose={() => setEditing(null)} onSaved={load} />}
    </div>
  );
}

// end of file
