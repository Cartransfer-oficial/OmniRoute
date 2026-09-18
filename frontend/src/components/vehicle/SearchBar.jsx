import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { MapPin, Calendar as CalendarIcon, Users, MagnifyingGlass } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";

export default function SearchBar({ dark = false }) {
  const nav = useNavigate();
  const [city, setCity] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [seats, setSeats] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (city) params.set("city", city);
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    if (seats && seats !== "any") params.set("min_seats", seats);
    nav(`/buscar?${params.toString()}`);
  };

  const labelCls = dark ? "text-white/80" : "text-neutral-700";
  const wrapCls = dark
    ? "bg-white/95 backdrop-blur border border-white/40"
    : "bg-white border border-border";

  return (
    <form onSubmit={submit} data-testid="search-bar" className={`${wrapCls} p-3 md:p-4 shadow-2xl`}>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="md:col-span-2">
          <Label className={`overline text-[10px] block mb-1 ${labelCls}`}>
            <MapPin size={12} className="inline mr-1" />Onde
          </Label>
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Cidade (ex: Florianópolis)"
            data-testid="search-city"
            className="border-0 border-b border-border rounded-none focus-visible:ring-0 focus-visible:border-[hsl(22,100%,50%)] px-1 h-9 font-medium"
          />
        </div>
        <div>
          <Label className={`overline text-[10px] block mb-1 ${labelCls}`}>
            <CalendarIcon size={12} className="inline mr-1" />Retirada
          </Label>
          <Input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            data-testid="search-start"
            className="border-0 border-b border-border rounded-none focus-visible:ring-0 h-9"
          />
        </div>
        <div>
          <Label className={`overline text-[10px] block mb-1 ${labelCls}`}>Devolução</Label>
          <Input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            data-testid="search-end"
            className="border-0 border-b border-border rounded-none focus-visible:ring-0 h-9"
          />
        </div>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label className={`overline text-[10px] block mb-1 ${labelCls}`}>
              <Users size={12} className="inline mr-1" />Pessoas
            </Label>
            <Select value={seats} onValueChange={setSeats}>
              <SelectTrigger data-testid="search-seats" className="border-0 border-b border-border rounded-none h-9 focus:ring-0">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Todos</SelectItem>
                <SelectItem value="2">2+</SelectItem>
                <SelectItem value="4">4+</SelectItem>
                <SelectItem value="5">5+</SelectItem>
                <SelectItem value="7">7+</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            type="submit"
            data-testid="search-submit"
            className="bg-[hsl(22,100%,50%)] hover:bg-[hsl(22,100%,45%)] text-white h-10 px-4 shrink-0"
          >
            <MagnifyingGlass size={18} weight="bold" />
            <span className="hidden md:inline ml-1">Encontrar</span>
          </Button>
        </div>
      </div>
    </form>
  );
}
