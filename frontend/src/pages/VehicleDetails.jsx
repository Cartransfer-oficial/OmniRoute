import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api, formatBRL } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import VehicleMap from "@/components/vehicle/VehicleMap";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Star, ShieldCheck, MapPin, Users, GasPump, Gauge, Suitcase, SteeringWheel,
  Snowflake, MusicNote, Baby, BatteryCharging, Lightning, Info,
} from "@phosphor-icons/react";

const FEATURE_LABELS = {
  carplay: { l: "Apple CarPlay", i: MusicNote },
  android_auto: { l: "Android Auto", i: MusicNote },
  gps: { l: "GPS", i: MapPin },
  child_seat: { l: "Cadeirinha", i: Baby },
  isofix: { l: "ISOFIX", i: Baby },
  "4x4": { l: "Tração 4x4", i: SteeringWheel },
  sunroof: { l: "Teto solar", i: Lightning },
  leather: { l: "Bancos de couro", i: SteeringWheel },
  cruise_control: { l: "Piloto automático", i: Gauge },
  wireless_charging: { l: "Carregador wireless", i: BatteryCharging },
  air_conditioning: { l: "Ar-condicionado", i: Snowflake },
  usb: { l: "USB", i: BatteryCharging },
};

export default function VehicleDetails() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [v, setV] = useState(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [pickup, setPickup] = useState("at_owner");
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [{ data }, { data: rev }] = await Promise.all([
          api.get(`/vehicles/${id}`),
          api.get(`/reviews/vehicle/${id}`),
        ]);
        setV(data);
        setReviews(rev);
      } finally { setLoading(false); }
    })();
  }, [id]);

  const days = start && end ? Math.max(1, Math.ceil((new Date(end) - new Date(start)) / 86400000)) : 0;
  const subtotal = v ? days * v.daily_price : 0;
  const commission = subtotal * 0.12;
  const deposit = v?.deposit || 0;
  const total = subtotal + deposit;

  const reserve = async () => {
    if (!user) { nav("/login"); return; }
    if (user.role === "owner") {
      toast.info("Contas de proprietário não podem reservar. Use uma conta de locatário.");
      return;
    }
    if (!start || !end) { toast.error("Selecione as datas"); return; }
    if (user.kyc_level !== "approved") {
      toast.info("Complete a verificação de identidade primeiro");
      nav("/verificacao");
      return;
    }
    try {
      const { data } = await api.post("/bookings", {
        vehicle_id: id, start_date: start, end_date: end, pickup_type: pickup,
      });
      toast.success("Reserva criada! Realize o pagamento.");
      nav(`/reserva/${data.id}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Erro ao criar reserva");
    }
  };

  if (loading) return <div className="max-w-7xl mx-auto p-8">Carregando...</div>;
  if (!v) return <div className="max-w-7xl mx-auto p-8">Veículo não encontrado</div>;

  return (
    <div data-testid="vehicle-details" className="max-w-7xl mx-auto px-4 md:px-8 py-6 pb-32">
      <SEO
        title={`Alugar ${v.brand} ${v.model} ${v.year} em ${v.city}`}
        description={`${v.brand} ${v.model} ${v.year} · ${v.transmission === "automatic" ? "Automático" : "Manual"} · ${v.seats} lugares · ${v.city}/${v.state}. A partir de ${formatBRL(v.daily_price)}/dia com pagamento seguro pela DriveHub.`}
        image={v.photos?.[0]}
        type="product"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Product",
          "name": `${v.brand} ${v.model} ${v.year}`,
          "image": v.photos || [],
          "description": `${v.category} · ${v.transmission} · ${v.seats} lugares · ${v.fuel}`,
          "brand": { "@type": "Brand", "name": v.brand },
          "aggregateRating": v.rating_count > 0 ? {
            "@type": "AggregateRating",
            "ratingValue": v.rating_avg,
            "reviewCount": v.rating_count,
          } : undefined,
          "offers": {
            "@type": "Offer",
            "price": v.daily_price,
            "priceCurrency": "BRL",
            "availability": "https://schema.org/InStock",
            "areaServed": v.city,
          },
        }}
      />
      {/* GALLERY */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-6">
        <img src={v.photos?.[0]} alt="" className="w-full aspect-[4/3] object-cover" />
        <div className="grid grid-cols-2 gap-2">
          {(v.photos?.slice(1, 5) || []).map((p, i) => (
            <img key={i} src={p} alt="" className="w-full aspect-[4/3] object-cover" />
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_380px] gap-8">
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex gap-2 flex-wrap mb-2">
                <Badge className="bg-neutral-900 text-white">{v.category}</Badge>
                {v.verified && <Badge className="bg-[hsl(155,100%,33%)] text-white"><ShieldCheck size={12} weight="fill" className="mr-1" />Verificado</Badge>}
                <Badge variant="outline"><MapPin size={12} className="mr-1" />{v.city}, {v.state}</Badge>
              </div>
              <h1 className="font-display text-3xl md:text-5xl font-black">{v.brand} {v.model}</h1>
              <p className="text-muted-foreground mt-1">{v.year} · {v.version} · {v.color}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1"><Star weight="fill" className="text-amber-500" size={18} /><span className="font-bold">{(v.rating_avg || 0).toFixed(1)}</span></div>
              <p className="text-xs text-muted-foreground">{v.rating_count || 0} avaliações</p>
            </div>
          </div>

          {/* SPECS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
            {[
              { i: Users, l: `${v.seats} lugares` },
              { i: SteeringWheel, l: v.transmission === "automatic" ? "Automático" : "Manual" },
              { i: GasPump, l: v.fuel },
              { i: Suitcase, l: `${v.luggage} malas` },
            ].map((s, i) => (
              <div key={i} className="border border-border p-4 bg-white">
                <s.i size={22} weight="duotone" className="text-[hsl(210,100%,22%)]" />
                <p className="mt-2 text-sm font-medium capitalize">{s.l}</p>
              </div>
            ))}
          </div>

          {/* FEATURES */}
          {!!v.features?.length && (
            <div className="mt-8">
              <h2 className="font-display text-xl font-bold mb-3">Características</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {v.features.map((f) => {
                  const meta = FEATURE_LABELS[f] || { l: f, i: Info };
                  return (
                    <div key={f} className="flex items-center gap-2 text-sm py-2">
                      <meta.i size={18} weight="duotone" className="text-[hsl(210,100%,22%)]" />
                      {meta.l}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* RULES */}
          {!!v.rules?.length && (
            <div className="mt-8">
              <h2 className="font-display text-xl font-bold mb-3">Regras</h2>
              <ul className="space-y-2 text-sm">
                {v.rules.map((r, i) => <li key={i} className="flex gap-2"><span className="text-[hsl(210,100%,22%)]">•</span>{r}</li>)}
                <li className="flex gap-2"><span className="text-[hsl(210,100%,22%)]">•</span>Quilometragem incluída: {v.included_km_per_day} km/dia (R$ {v.extra_km_price}/km excedente)</li>
                {v.allow_pets && <li className="flex gap-2"><span className="text-[hsl(210,100%,22%)]">•</span>Animais permitidos</li>}
                {v.airport_pickup && <li className="flex gap-2"><span className="text-[hsl(210,100%,22%)]">•</span>Retirada em aeroporto disponível</li>}
                {v.delivery_available && <li className="flex gap-2"><span className="text-[hsl(210,100%,22%)]">•</span>Entrega no local: {formatBRL(v.delivery_fee)}</li>}
              </ul>
            </div>
          )}

          {/* MAP */}
          <div className="mt-8">
            <h2 className="font-display text-xl font-bold mb-3">Localização aproximada</h2>
            <p className="text-xs text-muted-foreground mb-3"><Info size={12} className="inline mr-1" />O endereço exato é revelado apenas após confirmação da reserva.</p>
            <VehicleMap vehicles={[v]} height="360px" />
          </div>

          {/* REVIEWS */}
          {reviews.length > 0 && (
            <div className="mt-8">
              <h2 className="font-display text-xl font-bold mb-3">Avaliações ({reviews.length})</h2>
              <div className="space-y-4">
                {reviews.slice(0, 5).map((r) => (
                  <div key={r.id} className="border border-border p-4">
                    <div className="flex justify-between items-start">
                      <span className="font-medium">{r.from_name}</span>
                      <div className="flex gap-0.5">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} weight="fill" size={14} className="text-amber-500" />)}</div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">{r.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* BOOKING CTA */}
        <aside data-testid="booking-panel" className="md:sticky md:top-20 md:self-start border border-border p-6 bg-white">
          <div className="flex items-baseline gap-1">
            <span className="font-display text-3xl font-black text-[hsl(210,100%,22%)]">{formatBRL(v.daily_price)}</span>
            <span className="text-sm text-muted-foreground">/dia</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Caução: {formatBRL(v.deposit)}</p>
          <Separator className="my-4" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="overline text-[10px]">Retirada</Label>
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} data-testid="booking-start" />
            </div>
            <div>
              <Label className="overline text-[10px]">Devolução</Label>
              <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} data-testid="booking-end" />
            </div>
          </div>
          <div className="mt-3">
            <Label className="overline text-[10px]">Retirada em</Label>
            <select
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
              className="w-full border border-border h-9 px-2 text-sm mt-1"
              data-testid="booking-pickup"
            >
              <option value="at_owner">Local do proprietário</option>
              {v.airport_pickup && <option value="airport">Aeroporto</option>}
              {v.delivery_available && <option value="delivery">Entrega no meu endereço</option>}
            </select>
          </div>

          {days > 0 && (
            <div className="mt-4 space-y-2 text-sm border-t border-border pt-4">
              <div className="flex justify-between"><span>{formatBRL(v.daily_price)} × {days} dias</span><span className="numeric">{formatBRL(subtotal)}</span></div>
              <div className="flex justify-between text-muted-foreground text-xs"><span>Taxa de serviço (12%)</span><span className="numeric">Incluída</span></div>
              {deposit > 0 && <div className="flex justify-between"><span>Caução (bloqueio)</span><span className="numeric">{formatBRL(deposit)}</span></div>}
              <Separator />
              <div className="flex justify-between font-bold text-base"><span>Total</span><span className="numeric text-[hsl(210,100%,22%)]">{formatBRL(total)}</span></div>
              <p className="text-[10px] text-muted-foreground">Split automático: proprietário recebe {formatBRL(subtotal - commission)} · plataforma {formatBRL(commission)}</p>
            </div>
          )}

          <Button
            className="w-full mt-4 bg-[hsl(210,100%,22%)] hover:bg-[hsl(210,100%,15%)] text-white h-11 text-base font-bold"
            onClick={reserve}
            data-testid="btn-reserve"
          >
            Reservar agora
          </Button>

          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck size={16} weight="fill" className="text-[hsl(155,100%,33%)]" />
            Pagamento seguro, contrato digital, suporte 24/7
          </div>
        </aside>
      </div>
    </div>
  );
}
