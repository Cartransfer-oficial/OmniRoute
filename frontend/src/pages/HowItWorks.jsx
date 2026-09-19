import SEO from "@/components/SEO";

export default function HowItWorks() {
  const steps = [
    { n: "01", t: "Cadastre-se em minutos", d: "Crie sua conta gratuitamente. Locatários passam por verificação de identidade e CNH antes da primeira reserva." },
    { n: "02", t: "Encontre o carro certo", d: "Busca inteligente por cidade, datas, capacidade, câmbio, categoria, cadeirinha, aeroporto — só mostramos veículos compatíveis." },
    { n: "03", t: "Reserve com segurança", d: "Pagamento processado com split automático: proprietário recebe seu valor líquido, plataforma recebe a comissão transparente." },
    { n: "04", t: "Retire e devolva", d: "Check-in digital com fotos, chat interno moderado, contrato eletrônico. Check-out libera o repasse ao proprietário." },
    { n: "05", t: "Avalie", d: "Avaliação bidirecional após cada locação. Comunidade transparente e confiável." },
  ];
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-16 pb-24" data-testid="how-page">
      <SEO
        title="Como funciona"
        description="Aprenda como funciona o marketplace de aluguel de carros DriveHub: cadastro, verificação, reserva com split de pagamento, contrato digital, check-in e check-out."
      />
      <span className="overline text-[hsl(210,100%,22%)]">Como funciona</span>
      <h1 className="font-display text-4xl md:text-6xl font-black mt-2 leading-tight">O marketplace de mobilidade do Brasil.</h1>
      <p className="mt-6 text-lg text-muted-foreground max-w-2xl">A DriveHub é <strong>intermediador tecnológico</strong> — não somos proprietários da frota. Conectamos pessoas e empresas com veículos verificados, contrato digital e pagamento seguro.</p>
      <div className="mt-12 space-y-8">
        {steps.map((s) => (
          <div key={s.n} className="grid grid-cols-[80px_1fr] gap-4 items-start">
            <div className="font-display text-4xl font-black text-[hsl(210,100%,22%)]">{s.n}</div>
            <div>
              <h3 className="font-display text-2xl font-bold">{s.t}</h3>
              <p className="mt-2 text-muted-foreground">{s.d}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
