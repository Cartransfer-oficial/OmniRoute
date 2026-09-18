import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import VehicleCard from "@/components/vehicle/VehicleCard";
import VehicleMap from "@/components/vehicle/VehicleMap";
import SearchBar from "@/components/vehicle/SearchBar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FunnelSimple, MapTrifold, GridFour } from "@phosphor-icons/react";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const CATEGORIES = [
  { k: "economico", l: "Econômico" }, { k: "hatch", l: "Hatch" },
  { k: "sedan", l: "Sedan" }, { k: "suv", l: "SUV" },
  { k: "minivan", l: "7 lugares" }, { k: "pickup", l: "Picape" },
  { k: "ev", l: "Elétrico" }, { k: "premium", l: "Premium" },
];
const FEATURES = [
  { k: "carplay", l: "Apple CarPlay" }, { k: "android_auto", l: "Android Auto" },
  { k: "gps", l: "GPS" }, { k: "child_seat", l: "Cadeirinha" },
  { k: "isofix", l: "ISOFIX" }, { k: "4x4", l: "4x4" },
  { k: "sunroof", l: "Teto solar" }, { k: "leather", l: "Bancos de couro" },
  { k: "cruise_control", l: "Piloto automático" }, { k: "wireless_charging", l: "Carregador wireless" },
];

function Filters({ filters, setFilters, applyReload }) {
  const toggleFeature = (f) => {
    const s = new Set(filters.features);
    s.has(f) ? s.delete(f) : s.add(f);
    setFilters({ ...filters, features: [...s] });
  };
  return (
    <div className="space-y-6">
      <div>
        <Label className="overline block mb-2">Categoria</Label>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map((c) => (
            <label key={c.k} className={`border p-2 text-xs cursor-pointer transition-colors ${filters.category === c.k ? "border-[hsl(22,100%,50%)] bg-orange-50 text-[hsl(22,100%,40%)] font-medium" : "border-border hover:border-neutral-400"}`}>
              <input
                type="radio"
                name="category"
                checked={filters.category === c.k}
                onChange={() => setFilters({ ...filters, category: c.k })}
                className="sr-only"
                data-testid={`filter-cat-${c.k}`}
              />
              {c.l}
            </label>
          ))}
        </div>
        {filters.category && (
          <button className="mt-2 text-xs text-muted-foreground underline" onClick={() => setFilters({ ...filters, category: "" })}>Limpar</button>
        )}
      </div>

      <div>
        <Label className="overline block mb-2">Câmbio</Label>
        <div className="flex gap-2">
          {[
            { k: "", l: "Todos" }, { k: "automatic", l: "Automático" }, { k: "manual", l: "Manual" },
          ].map((t) => (
            <button
              key={t.k}
              data-testid={`filter-trans-${t.k || "all"}`}
              onClick={() => setFilters({ ...filters, transmission: t.k })}
              className={`px-3 py-1.5 text-xs border ${filters.transmission === t.k ? "border-[hsl(22,100%,50%)] bg-orange-50 text-[hsl(22,100%,40%)]" : "border-border"}`}
            >
              {t.l}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="overline block mb-2">Passageiros mínimo</Label>
        <div className="flex gap-2">
          {[2, 4, 5, 7].map((n) => (
            <button
              key={n}
              onClick={() => setFilters({ ...filters, min_seats: filters.min_seats === n ? 0 : n })}
              className={`w-11 h-11 border ${filters.min_seats === n ? "border-[hsl(22,100%,50%)] bg-orange-50 text-[hsl(22,100%,40%)] font-bold" : "border-border"}`}
              data-testid={`filter-seats-${n}`}
            >
              {n}+
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="overline block mb-2">Preço por dia · até R$ {filters.max_price}</Label>
        <Slider
          value={[filters.max_price]}
          onValueChange={(v) => setFilters({ ...filters, max_price: v[0] })}
          min={100}
          max={1000}
          step={50}
          data-testid="filter-max-price"
        />
      </div>

      <div>
        <Label className="overline block mb-2">Características</Label>
        <div className="space-y-2 max-h-64 overflow-auto pr-1">
          {FEATURES.map((f) => (
            <label key={f.k} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={filters.features.includes(f.k)}
                onCheckedChange={() => toggleFeature(f.k)}
                data-testid={`filter-feat-${f.k}`}
              />
              {f.l}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="overline block">Regras</Label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox checked={filters.pets} onCheckedChange={(v) => setFilters({ ...filters, pets: !!v })} data-testid="filter-pets" />
          Permite animais
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox checked={filters.airport} onCheckedChange={(v) => setFilters({ ...filters, airport: !!v })} data-testid="filter-airport" />
          Retirada em aeroporto
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox checked={filters.delivery} onCheckedChange={(v) => setFilters({ ...filters, delivery: !!v })} data-testid="filter-delivery" />
          Entrega no local
        </label>
      </div>

      <Button className="w-full bg-[hsl(22,100%,50%)] hover:bg-[hsl(22,100%,45%)]" onClick={applyReload} data-testid="apply-filters">Aplicar filtros</Button>
    </div>
  );
}

export default function Search() {
  const [params] = useSearchParams();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("grid");
  const [filters, setFilters] = useState({
    city: params.get("city") || "",
    category: params.get("category") || "",
    transmission: "",
    min_seats: parseInt(params.get("min_seats") || "0"),
    max_price: 1000,
    features: [],
    pets: false,
    airport: false,
    delivery: false,
  });

  const load = async () => {
    setLoading(true);
    const q = {};
    if (filters.city) q.city = filters.city;
    if (filters.category) q.category = filters.category;
    if (filters.transmission) q.transmission = filters.transmission;
    if (filters.min_seats) q.min_seats = filters.min_seats;
    if (filters.max_price < 1000) q.max_price = filters.max_price;
    if (filters.features.length) q.features = filters.features.join(",");
    if (filters.pets) q.pets = true;
    if (filters.airport) q.airport = true;
    if (filters.delivery) q.delivery = true;
    try {
      const { data } = await api.get("/vehicles", { params: q });
      setVehicles(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  return (
    <div data-testid="search-page" className="max-w-7xl mx-auto px-4 md:px-8 py-6 pb-24 md:pb-10">
      <div className="mb-6"><SearchBar /></div>

      <div className="flex items-center justify-between mb-4 gap-2">
        <h1 className="font-display text-2xl font-bold">
          {vehicles.length} <span className="text-muted-foreground font-normal text-base">veículos encontrados</span>
        </h1>
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="md:hidden" data-testid="mobile-filters-trigger">
                <FunnelSimple size={16} className="mr-1" /> Filtros
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="overflow-y-auto w-full sm:max-w-md">
              <SheetHeader><SheetTitle>Filtros</SheetTitle></SheetHeader>
              <div className="mt-4"><Filters filters={filters} setFilters={setFilters} applyReload={load} /></div>
            </SheetContent>
          </Sheet>
          <Tabs value={view} onValueChange={setView}>
            <TabsList>
              <TabsTrigger value="grid" data-testid="view-grid"><GridFour size={16} /></TabsTrigger>
              <TabsTrigger value="map" data-testid="view-map"><MapTrifold size={16} /></TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8">
        <aside className="hidden md:block sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto pr-2">
          <Filters filters={filters} setFilters={setFilters} applyReload={load} />
        </aside>
        <div>
          {view === "grid" ? (
            loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-[4/3] bg-neutral-100 animate-pulse" />)}
              </div>
            ) : vehicles.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
                {vehicles.map((v) => <VehicleCard key={v.id} v={v} />)}
              </div>
            ) : (
              <div className="text-center py-20 border border-dashed border-border">
                <p className="text-muted-foreground">Nenhum veículo compatível com seus filtros.</p>
              </div>
            )
          ) : (
            <VehicleMap vehicles={vehicles} height="70vh" />
          )}
        </div>
      </div>
    </div>
  );
}
