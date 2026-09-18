import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const CATS = ["economico", "hatch", "sedan", "suv", "minivan", "pickup", "ev", "hybrid", "premium"];
const FEATURES = [
  "carplay", "android_auto", "gps", "child_seat", "isofix", "4x4",
  "sunroof", "leather", "cruise_control", "wireless_charging", "air_conditioning", "usb",
];

export default function AddVehicle() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [f, setF] = useState({
    brand: "", model: "", version: "", year: 2024, plate: "",
    category: "sedan", transmission: "automatic", fuel: "flex",
    seats: 5, doors: 4, luggage: 3, color: "", km: 0,
    daily_price: 200, deposit: 500,
    included_km_per_day: 200, extra_km_price: 1.5,
    city: "", state: "", neighborhood: "",
    lat: -14.235, lng: -51.9253,
    photos: [""], features: [],
    rules: [],
    allow_pets: false, allow_interstate: true,
    airport_pickup: false, delivery_available: false, delivery_fee: 0,
  });
  const [rulesText, setRulesText] = useState("");
  const [photosText, setPhotosText] = useState("");
  const [loading, setLoading] = useState(false);

  const toggleFeature = (k) => {
    setF((s) => ({ ...s, features: s.features.includes(k) ? s.features.filter((x) => x !== k) : [...s.features, k] }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const payload = {
      ...f,
      photos: photosText.split("\n").map((s) => s.trim()).filter(Boolean),
      rules: rulesText.split("\n").map((s) => s.trim()).filter(Boolean),
    };
    try {
      const { data } = await api.post("/vehicles", payload);
      toast.success("Veículo cadastrado!");
      nav(`/veiculo/${data.id}`);
    } catch (err) { toast.error(formatApiError(err)); }
    finally { setLoading(false); }
  };

  if (user && user.role !== "owner" && user.role !== "admin") {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <h1 className="font-display text-2xl font-bold">Sua conta é de locatário</h1>
        <p className="mt-2 text-muted-foreground">Para anunciar um veículo, entre em contato com o suporte para converter sua conta em proprietário.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 pb-24" data-testid="add-vehicle-page">
      <span className="overline text-[hsl(22,100%,50%)]">Novo anúncio</span>
      <h1 className="font-display text-3xl md:text-4xl font-black mt-1">Cadastre seu veículo</h1>
      <p className="text-muted-foreground mt-2">Preencha os dados. Nossa equipe revisa e libera o anúncio.</p>

      <form onSubmit={submit} className="mt-8 space-y-6">
        <section className="border border-border p-5 space-y-3">
          <h2 className="font-display font-bold text-lg">Identificação</h2>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Marca</Label><Input value={f.brand} onChange={(e) => setF({ ...f, brand: e.target.value })} required data-testid="av-brand" /></div>
            <div><Label>Modelo</Label><Input value={f.model} onChange={(e) => setF({ ...f, model: e.target.value })} required data-testid="av-model" /></div>
            <div><Label>Versão</Label><Input value={f.version} onChange={(e) => setF({ ...f, version: e.target.value })} data-testid="av-version" /></div>
            <div><Label>Ano</Label><Input type="number" value={f.year} onChange={(e) => setF({ ...f, year: +e.target.value })} required data-testid="av-year" /></div>
            <div><Label>Placa</Label><Input value={f.plate} onChange={(e) => setF({ ...f, plate: e.target.value })} required placeholder="ABC1D23" data-testid="av-plate" /></div>
            <div><Label>Cor</Label><Input value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} data-testid="av-color" /></div>
          </div>
        </section>

        <section className="border border-border p-5 space-y-3">
          <h2 className="font-display font-bold text-lg">Características</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div><Label>Categoria</Label>
              <select className="w-full h-9 border border-border px-2 text-sm" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} data-testid="av-category">
                {CATS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><Label>Câmbio</Label>
              <select className="w-full h-9 border border-border px-2 text-sm" value={f.transmission} onChange={(e) => setF({ ...f, transmission: e.target.value })} data-testid="av-transmission">
                <option value="automatic">Automático</option><option value="manual">Manual</option>
              </select>
            </div>
            <div><Label>Combustível</Label>
              <select className="w-full h-9 border border-border px-2 text-sm" value={f.fuel} onChange={(e) => setF({ ...f, fuel: e.target.value })} data-testid="av-fuel">
                <option>flex</option><option>gasoline</option><option>ethanol</option><option>diesel</option><option>electric</option><option>hybrid</option>
              </select>
            </div>
            <div><Label>Lugares</Label><Input type="number" value={f.seats} onChange={(e) => setF({ ...f, seats: +e.target.value })} data-testid="av-seats" /></div>
            <div><Label>Portas</Label><Input type="number" value={f.doors} onChange={(e) => setF({ ...f, doors: +e.target.value })} data-testid="av-doors" /></div>
            <div><Label>Malas</Label><Input type="number" value={f.luggage} onChange={(e) => setF({ ...f, luggage: +e.target.value })} data-testid="av-luggage" /></div>
            <div><Label>KM rodados</Label><Input type="number" value={f.km} onChange={(e) => setF({ ...f, km: +e.target.value })} data-testid="av-km" /></div>
          </div>
          <div>
            <Label className="overline text-[10px]">Comodidades</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
              {FEATURES.map((k) => (
                <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={f.features.includes(k)} onCheckedChange={() => toggleFeature(k)} data-testid={`av-feat-${k}`} />
                  {k}
                </label>
              ))}
            </div>
          </div>
        </section>

        <section className="border border-border p-5 space-y-3">
          <h2 className="font-display font-bold text-lg">Localização</h2>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Cidade</Label><Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} required data-testid="av-city" /></div>
            <div><Label>Estado (UF)</Label><Input value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })} required data-testid="av-state" /></div>
            <div className="col-span-2"><Label>Bairro</Label><Input value={f.neighborhood} onChange={(e) => setF({ ...f, neighborhood: e.target.value })} data-testid="av-neighborhood" /></div>
            <div><Label>Latitude</Label><Input type="number" step="0.0001" value={f.lat} onChange={(e) => setF({ ...f, lat: +e.target.value })} data-testid="av-lat" /></div>
            <div><Label>Longitude</Label><Input type="number" step="0.0001" value={f.lng} onChange={(e) => setF({ ...f, lng: +e.target.value })} data-testid="av-lng" /></div>
          </div>
        </section>

        <section className="border border-border p-5 space-y-3">
          <h2 className="font-display font-bold text-lg">Preço e regras</h2>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Preço/dia (R$)</Label><Input type="number" value={f.daily_price} onChange={(e) => setF({ ...f, daily_price: +e.target.value })} required data-testid="av-price" /></div>
            <div><Label>Caução (R$)</Label><Input type="number" value={f.deposit} onChange={(e) => setF({ ...f, deposit: +e.target.value })} data-testid="av-deposit" /></div>
            <div><Label>KM incluídos/dia</Label><Input type="number" value={f.included_km_per_day} onChange={(e) => setF({ ...f, included_km_per_day: +e.target.value })} data-testid="av-inckm" /></div>
            <div><Label>Preço km excedente</Label><Input type="number" step="0.1" value={f.extra_km_price} onChange={(e) => setF({ ...f, extra_km_price: +e.target.value })} data-testid="av-extrakm" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <label className="flex items-center gap-2"><Checkbox checked={f.allow_pets} onCheckedChange={(v) => setF({ ...f, allow_pets: !!v })} data-testid="av-pets" />Permite animais</label>
            <label className="flex items-center gap-2"><Checkbox checked={f.airport_pickup} onCheckedChange={(v) => setF({ ...f, airport_pickup: !!v })} data-testid="av-airport" />Retirada no aeroporto</label>
            <label className="flex items-center gap-2"><Checkbox checked={f.delivery_available} onCheckedChange={(v) => setF({ ...f, delivery_available: !!v })} data-testid="av-delivery" />Entrego no endereço</label>
            <label className="flex items-center gap-2"><Checkbox checked={f.allow_interstate} onCheckedChange={(v) => setF({ ...f, allow_interstate: !!v })} data-testid="av-interstate" />Viagem interestadual</label>
          </div>
          <div><Label>Regras (uma por linha)</Label><Textarea value={rulesText} onChange={(e) => setRulesText(e.target.value)} placeholder="Ex.: Não fumar&#10;Devolver limpo" data-testid="av-rules" /></div>
        </section>

        <section className="border border-border p-5 space-y-3">
          <h2 className="font-display font-bold text-lg">Fotos</h2>
          <Label>URLs das fotos (uma por linha)</Label>
          <Textarea rows={4} value={photosText} onChange={(e) => setPhotosText(e.target.value)} placeholder="https://...&#10;https://..." data-testid="av-photos" />
          <p className="text-xs text-muted-foreground">Dica: hospede fotos no Imgur/Cloudinary e cole os links aqui.</p>
        </section>

        <Button type="submit" disabled={loading} className="w-full h-12 bg-[hsl(22,100%,50%)] hover:bg-[hsl(22,100%,45%)] text-white font-bold" data-testid="av-submit">
          {loading ? "Enviando..." : "Publicar veículo"}
        </Button>
      </form>
    </div>
  );
}
