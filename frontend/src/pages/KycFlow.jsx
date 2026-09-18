import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldCheck, IdentificationCard, UserCircle, CreditCard } from "@phosphor-icons/react";

export default function KycFlow() {
  const { user, refresh } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [f, setF] = useState({
    cpf: "", birth_date: "", address: "", city: "", state: "", cep: "",
    cnh_number: "", cnh_category: "B", cnh_valid_until: "",
    cnh_photo: "", id_photo: "", selfie: "",
  });
  const [loading, setLoading] = useState(false);

  const fileToBase64 = (file) => new Promise((res) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.readAsDataURL(file);
  });

  const handleFile = async (field, file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Máx. 5MB"); return; }
    const b64 = await fileToBase64(file);
    setF((x) => ({ ...x, [field]: b64 }));
  };

  const submit = async () => {
    setLoading(true);
    try {
      await api.post("/kyc/submit", f);
      toast.success("Verificação concluída!");
      await refresh();
      nav("/");
    } catch (err) { toast.error(formatApiError(err)); }
    finally { setLoading(false); }
  };

  const canNext1 = f.cpf && f.birth_date && f.address && f.city;
  const canNext2 = f.cnh_number && f.cnh_valid_until && f.cnh_photo;
  const canFinish = f.id_photo && f.selfie;

  const STEPS = [
    { n: 1, l: "Dados pessoais", i: UserCircle },
    { n: 2, l: "CNH", i: IdentificationCard },
    { n: 3, l: "Identidade", i: ShieldCheck },
  ];

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 pb-24" data-testid="kyc-page">
      <span className="overline text-[hsl(22,100%,50%)]">Verificação de identidade</span>
      <h1 className="font-display text-3xl md:text-4xl font-black mt-2">Complete seu perfil para reservar</h1>
      <p className="text-muted-foreground mt-2">Para sua segurança e a de todos, validamos dados essenciais antes da primeira reserva.</p>

      <div className="mt-8 flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex-1 flex items-center gap-2">
            <div className={`w-10 h-10 flex items-center justify-center border font-bold ${step >= s.n ? "bg-[hsl(22,100%,50%)] text-white border-[hsl(22,100%,50%)]" : "border-border text-muted-foreground"}`}>
              <s.i size={20} />
            </div>
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${step > s.n ? "bg-[hsl(22,100%,50%)]" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-3">
          <h2 className="font-display text-xl font-bold">Dados pessoais</h2>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>CPF</Label><Input value={f.cpf} onChange={(e) => setF({ ...f, cpf: e.target.value })} placeholder="000.000.000-00" data-testid="kyc-cpf" /></div>
            <div><Label>Nascimento</Label><Input type="date" value={f.birth_date} onChange={(e) => setF({ ...f, birth_date: e.target.value })} data-testid="kyc-birth" /></div>
            <div className="col-span-2"><Label>Endereço</Label><Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} data-testid="kyc-address" /></div>
            <div><Label>Cidade</Label><Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} data-testid="kyc-city" /></div>
            <div><Label>Estado</Label><Input value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })} placeholder="SP" data-testid="kyc-state" /></div>
            <div><Label>CEP</Label><Input value={f.cep} onChange={(e) => setF({ ...f, cep: e.target.value })} data-testid="kyc-cep" /></div>
          </div>
          <Button disabled={!canNext1} onClick={() => setStep(2)} className="bg-[hsl(22,100%,50%)] hover:bg-[hsl(22,100%,45%)] w-full mt-4" data-testid="kyc-next-1">Próximo</Button>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-3">
          <h2 className="font-display text-xl font-bold">Sua CNH</h2>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Número CNH</Label><Input value={f.cnh_number} onChange={(e) => setF({ ...f, cnh_number: e.target.value })} data-testid="kyc-cnh-num" /></div>
            <div><Label>Categoria</Label><Input value={f.cnh_category} onChange={(e) => setF({ ...f, cnh_category: e.target.value })} data-testid="kyc-cnh-cat" /></div>
            <div className="col-span-2"><Label>Válida até</Label><Input type="date" value={f.cnh_valid_until} onChange={(e) => setF({ ...f, cnh_valid_until: e.target.value })} data-testid="kyc-cnh-val" /></div>
          </div>
          <div>
            <Label>Foto da CNH</Label>
            <Input type="file" accept="image/*" onChange={(e) => handleFile("cnh_photo", e.target.files[0])} data-testid="kyc-cnh-photo" />
            {f.cnh_photo && <img src={f.cnh_photo} alt="" className="mt-2 h-24 border" />}
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
            <Button disabled={!canNext2} onClick={() => setStep(3)} className="bg-[hsl(22,100%,50%)] hover:bg-[hsl(22,100%,45%)] flex-1" data-testid="kyc-next-2">Próximo</Button>
          </div>
        </div>
      )}
      {step === 3 && (
        <div className="space-y-3">
          <h2 className="font-display text-xl font-bold">Documento e selfie</h2>
          <div>
            <Label>Foto do documento (RG/CNH frente)</Label>
            <Input type="file" accept="image/*" onChange={(e) => handleFile("id_photo", e.target.files[0])} data-testid="kyc-id-photo" />
            {f.id_photo && <img src={f.id_photo} alt="" className="mt-2 h-24 border" />}
          </div>
          <div>
            <Label>Selfie segurando o documento</Label>
            <Input type="file" accept="image/*" onChange={(e) => handleFile("selfie", e.target.files[0])} data-testid="kyc-selfie" />
            {f.selfie && <img src={f.selfie} alt="" className="mt-2 h-24 border" />}
          </div>
          <p className="text-xs text-muted-foreground bg-neutral-50 border border-border p-3">Seus documentos são criptografados e usados apenas para verificação. Nunca compartilhamos com terceiros sem autorização (LGPD).</p>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => setStep(2)}>Voltar</Button>
            <Button disabled={!canFinish || loading} onClick={submit} className="bg-[hsl(22,100%,50%)] hover:bg-[hsl(22,100%,45%)] flex-1" data-testid="kyc-submit">
              {loading ? "Enviando..." : "Concluir verificação"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
