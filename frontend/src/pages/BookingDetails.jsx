import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api, formatBRL, formatDate } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ShieldCheck, Car, ChatCircle, CheckCircle, WhatsappLogo, Phone, MapPin } from "@phosphor-icons/react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const STATUS_LABELS = {
  pending_payment: { l: "Aguardando pagamento", c: "bg-amber-100 text-amber-800" },
  confirmed: { l: "Confirmada", c: "bg-blue-100 text-blue-800" },
  checked_in: { l: "Em uso", c: "bg-orange-100 text-orange-800" },
  completed: { l: "Concluída", c: "bg-green-100 text-green-800" },
  cancelled: { l: "Cancelada", c: "bg-neutral-200 text-neutral-700" },
};

export default function BookingDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [b, setB] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  const load = async () => {
    const [{ data: booking }, { data: messages }] = await Promise.all([
      api.get(`/bookings/${id}`),
      api.get(`/messages/${id}`).catch(() => ({ data: [] })),
    ]);
    setB(booking); setMsgs(messages); setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  const pay = async () => {
    setPaying(true);
    try {
      await api.post(`/bookings/${id}/pay`);
      toast.success("Pagamento confirmado! Reserva ativa.");
      await load();
      setTimeout(() => {
        const el = document.querySelector('[data-testid="whatsapp-owner-btn"]');
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    } catch (e) { toast.error(e?.response?.data?.detail); }
    finally { setPaying(false); }
  };

  // Build WhatsApp deeplink with pre-filled booking summary
  const buildWaLink = (phone, isRenter) => {
    if (!phone) return null;
    const clean = phone.replace(/\D/g, "");
    if (!clean) return null;
    const other = isRenter ? b.owner_contact : b.renter_contact;
    const greeting = isRenter
      ? `Olá ${b.owner_name}! Sou ${b.renter_name}, acabei de reservar seu ${b.vehicle_snapshot.brand} ${b.vehicle_snapshot.model} pelo LOCAFACIL.`
      : `Olá ${b.renter_name}! Sou ${b.owner_name}, proprietário do ${b.vehicle_snapshot.brand} ${b.vehicle_snapshot.model} que você reservou pelo LOCAFACIL.`;
    const msg = [
      greeting,
      "",
      `📅 Período: ${formatDate(b.start_date)} até ${formatDate(b.end_date)} (${b.pricing.days} diárias)`,
      `💰 Total pago: ${formatBRL(b.pricing.total)}`,
      b.pickup_address ? `📍 Local de retirada: ${b.pickup_address}` : null,
      `🔖 Reserva: #${b.id.slice(0, 8)}`,
      "",
      "Vamos combinar a retirada?",
    ].filter(Boolean).join("\n");
    return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
  };

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      await api.post("/messages", { booking_id: id, body: text });
      setText("");
      const { data } = await api.get(`/messages/${id}`);
      setMsgs(data);
    } catch (e) { toast.error("Não foi possível enviar"); }
  };

  const cancel = async () => {
    if (!confirm("Cancelar esta reserva?")) return;
    await api.post(`/bookings/${id}/cancel`);
    toast.success("Reserva cancelada"); load();
  };

  const checkin = async () => {
    await api.post(`/bookings/${id}/checkin`, { booking_id: id, km: 0, fuel_level: "cheio", photos: [], notes: "Check-in via app" });
    toast.success("Check-in registrado!"); load();
  };
  const checkout = async () => {
    await api.post(`/bookings/${id}/checkout`, { booking_id: id, km: 0, fuel_level: "cheio", photos: [], notes: "Check-out via app" });
    toast.success("Check-out registrado! Veículo devolvido."); load();
  };

  if (loading || !b) return <div className="max-w-4xl mx-auto p-8">Carregando...</div>;

  const status = STATUS_LABELS[b.status] || { l: b.status, c: "bg-neutral-100" };
  const isRenter = user?.id === b.renter_id;
  const isOwner = user?.id === b.owner_id;

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 pb-24" data-testid="booking-details">
      <Link to={isRenter ? "/minhas-reservas" : "/proprietario"} className="text-sm text-muted-foreground hover:underline">← Voltar</Link>
      <div className="flex items-start justify-between mt-2 gap-4 flex-wrap">
        <div>
          <span className="overline text-[hsl(22,100%,50%)]">Reserva #{b.id.slice(0, 8)}</span>
          <h1 className="font-display text-3xl md:text-4xl font-black mt-1">{b.vehicle_snapshot.brand} {b.vehicle_snapshot.model}</h1>
          <p className="text-muted-foreground">{formatDate(b.start_date)} → {formatDate(b.end_date)} · {b.pricing.days} diárias</p>
        </div>
        <Badge className={`${status.c}`}>{status.l}</Badge>
      </div>

      <Tabs defaultValue="summary" className="mt-8">
        <TabsList>
          <TabsTrigger value="summary" data-testid="tab-summary">Resumo</TabsTrigger>
          <TabsTrigger value="chat" data-testid="tab-chat"><ChatCircle size={14} className="mr-1" />Chat</TabsTrigger>
          <TabsTrigger value="contract" data-testid="tab-contract">Contrato</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-6 grid md:grid-cols-2 gap-6">
          {/* CONTACT PANEL — visible only after payment */}
          {(b.status === "confirmed" || b.status === "checked_in" || b.status === "completed") && (b.owner_contact || b.renter_contact) && (
            <div className="md:col-span-2 border-2 border-[hsl(155,100%,33%)] bg-green-50 p-5">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <h3 className="font-display font-bold text-lg flex items-center gap-2">
                    <CheckCircle weight="fill" className="text-[hsl(155,100%,33%)]" />
                    Pagamento confirmado — combine a retirada
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Agora vocês podem se comunicar diretamente para combinar a retirada do veículo.
                  </p>
                </div>
              </div>

              {isRenter && b.owner_contact && (
                <div className="mt-4 bg-white border border-border p-4">
                  <p className="overline text-xs text-muted-foreground">Proprietário</p>
                  <p className="font-display font-bold text-lg">{b.owner_contact.name}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {b.owner_contact.whatsapp && (
                      <a
                        href={buildWaLink(b.owner_contact.whatsapp, true)}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid="whatsapp-owner-btn"
                        className="inline-flex items-center gap-2 bg-[hsl(155,100%,33%)] hover:bg-[hsl(155,100%,28%)] text-white px-4 py-2 font-bold transition-colors"
                      >
                        <WhatsappLogo weight="fill" size={20} />
                        Abrir WhatsApp com o proprietário
                      </a>
                    )}
                    {b.owner_contact.phone && (
                      <a href={`tel:${b.owner_contact.phone}`} className="inline-flex items-center gap-2 border border-border px-4 py-2 hover:border-neutral-400">
                        <Phone size={16} />{b.owner_contact.phone}
                      </a>
                    )}
                  </div>
                </div>
              )}

              {isOwner && b.renter_contact && (
                <div className="mt-4 bg-white border border-border p-4">
                  <p className="overline text-xs text-muted-foreground">Locatário</p>
                  <p className="font-display font-bold text-lg">{b.renter_contact.name}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {b.renter_contact.whatsapp && (
                      <a
                        href={buildWaLink(b.renter_contact.whatsapp, false)}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid="whatsapp-renter-btn"
                        className="inline-flex items-center gap-2 bg-[hsl(155,100%,33%)] hover:bg-[hsl(155,100%,28%)] text-white px-4 py-2 font-bold transition-colors"
                      >
                        <WhatsappLogo weight="fill" size={20} />
                        Abrir WhatsApp com o locatário
                      </a>
                    )}
                    {b.renter_contact.phone && (
                      <a href={`tel:${b.renter_contact.phone}`} className="inline-flex items-center gap-2 border border-border px-4 py-2 hover:border-neutral-400">
                        <Phone size={16} />{b.renter_contact.phone}
                      </a>
                    )}
                  </div>
                </div>
              )}

              {b.pickup_address && (
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <MapPin size={16} className="text-[hsl(22,100%,50%)]" />
                  <span><b>Local de retirada:</b> {b.pickup_address}</span>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-3">O botão abre o WhatsApp com uma mensagem pré-preenchida contendo todos os dados da reserva — basta enviar.</p>
            </div>
          )}

          <div className="border border-border p-6">
            <h3 className="font-display font-bold text-lg mb-3">Detalhes financeiros</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>{formatBRL(b.pricing.daily_price)} × {b.pricing.days} dias</span><span>{formatBRL(b.pricing.subtotal)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Comissão plataforma ({b.pricing.commission_pct}%)</span><span>{formatBRL(b.pricing.commission_amount)}</span></div>
              <div className="flex justify-between text-[hsl(155,100%,33%)]"><span>Proprietário recebe</span><span className="font-bold">{formatBRL(b.pricing.owner_amount)}</span></div>
              {b.pricing.deposit > 0 && <div className="flex justify-between"><span>Caução (bloqueio)</span><span>{formatBRL(b.pricing.deposit)}</span></div>}
              <hr />
              <div className="flex justify-between font-bold text-base"><span>Total</span><span>{formatBRL(b.pricing.total)}</span></div>
            </div>
            {b.payment && (
              <div className="mt-4 flex items-center gap-2 text-xs text-[hsl(155,100%,33%)]">
                <CheckCircle weight="fill" /> Pago em {formatDate(b.payment.paid_at)} · Repasse: {b.payment.payout_status === "released" ? "Liberado" : "Agendado"}
              </div>
            )}
          </div>

          <div className="border border-border p-6">
            <h3 className="font-display font-bold text-lg mb-3">Ações</h3>
            <div className="space-y-2">
              {b.status === "pending_payment" && isRenter && (
                <Button onClick={pay} disabled={paying} className="w-full bg-[hsl(22,100%,50%)] hover:bg-[hsl(22,100%,45%)]" data-testid="btn-pay">
                  {paying ? "Processando..." : `Pagar ${formatBRL(b.pricing.total)}`}
                </Button>
              )}
              {b.status === "confirmed" && (
                <Button onClick={checkin} className="w-full" data-testid="btn-checkin"><Car className="mr-2" />Check-in (retirar veículo)</Button>
              )}
              {b.status === "checked_in" && (
                <Button onClick={checkout} className="w-full bg-[hsl(155,100%,33%)] hover:bg-[hsl(155,100%,28%)]" data-testid="btn-checkout">
                  <CheckCircle className="mr-2" />Check-out (devolver)
                </Button>
              )}
              {(b.status === "pending_payment" || b.status === "confirmed") && (
                <Button variant="outline" onClick={cancel} className="w-full" data-testid="btn-cancel">Cancelar reserva</Button>
              )}
              <p className="text-xs text-muted-foreground pt-2">
                <ShieldCheck size={12} className="inline mr-1 text-[hsl(155,100%,33%)]" />
                Pagamento processado via split marketplace (mock — plugue Mercado Pago / Pagar.me nas chaves)
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="chat" className="mt-6">
          <div className="border border-border p-4 h-96 overflow-y-auto space-y-2 bg-neutral-50">
            {msgs.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhuma mensagem ainda.</p>}
            {msgs.map((m) => (
              <div key={m.id} className={`flex ${m.from_id === user.id ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] p-3 text-sm ${m.from_id === user.id ? "bg-[hsl(22,100%,50%)] text-white" : "bg-white border border-border"}`}>
                  <p className="text-[10px] opacity-70 mb-1">{m.from_name}</p>
                  {m.body}
                  {m.flagged && <p className="text-[10px] mt-1 opacity-80">⚠ Dados de contato bloqueados</p>}
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={send} className="mt-3 flex gap-2">
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva uma mensagem..." data-testid="chat-input" />
            <Button type="submit" className="bg-[hsl(22,100%,50%)] hover:bg-[hsl(22,100%,45%)]" data-testid="chat-send">Enviar</Button>
          </form>
          <p className="text-[10px] text-muted-foreground mt-1">Por segurança, telefones e e-mails são ocultados automaticamente. Toda negociação deve permanecer na plataforma.</p>
        </TabsContent>

        <TabsContent value="contract" className="mt-6">
          <div className="border border-border p-8 bg-white font-serif leading-relaxed text-sm">
            <h2 className="font-display text-xl font-black mb-4">CONTRATO DE LOCAÇÃO ENTRE PARTICULARES — LOCAFACIL</h2>
            <p><strong>LOCADOR (proprietário):</strong> {b.owner_name}</p>
            <p><strong>LOCATÁRIO:</strong> {b.renter_name}</p>
            <p><strong>VEÍCULO:</strong> {b.vehicle_snapshot.brand} {b.vehicle_snapshot.model} ({b.vehicle_snapshot.year})</p>
            <p><strong>PERÍODO:</strong> {formatDate(b.start_date)} até {formatDate(b.end_date)} ({b.pricing.days} diárias)</p>
            <p><strong>VALOR:</strong> {formatBRL(b.pricing.subtotal)} · Caução: {formatBRL(b.pricing.deposit)} · Total: {formatBRL(b.pricing.total)}</p>
            <hr className="my-4" />
            <p>1. A LOCAFACIL atua exclusivamente como marketplace tecnológico intermediador, não sendo proprietária do veículo nem parte na relação locatícia.</p>
            <p className="mt-2">2. O LOCATÁRIO se compromete a utilizar o veículo conforme legislação de trânsito, devolvê-lo nas mesmas condições e responder por avarias, multas e danos causados durante o período.</p>
            <p className="mt-2">3. O LOCADOR garante a legitimidade da posse, documentação em dia e condições mecânicas adequadas para circulação.</p>
            <p className="mt-2">4. Cancelamento gratuito até 48h antes da retirada. Após esse prazo, aplicam-se as regras da política de cancelamento.</p>
            <p className="mt-2">5. Rescisão, ocorrências e demais cláusulas conforme Termos de Uso da LOCAFACIL.</p>
            <p className="mt-6 text-[10px] text-muted-foreground">Aceite eletrônico registrado em {formatDate(b.contract_accepted_at)} — modelo para revisão jurídica antes do lançamento comercial.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
