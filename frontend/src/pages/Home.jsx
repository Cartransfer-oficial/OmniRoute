import { Link } from "react-router-dom";
import SearchBar from "@/components/vehicle/SearchBar";
import SEO from "@/components/SEO";
import { ShieldCheck, Car, HandCoins, Lightning, MapPin, Star } from "@phosphor-icons/react";

const HERO = "https://images.pexels.com/photos/37075472/pexels-photo-37075472.jpeg";

const CATEGORIES = [
  { key: "economico", label: "Econômico", img: "https://images.pexels.com/photos/12579276/pexels-photo-12579276.jpeg" },
  { key: "suv", label: "SUV", img: "https://images.pexels.com/photos/7154537/pexels-photo-7154537.jpeg" },
  { key: "minivan", label: "7 lugares", img: "https://images.unsplash.com/photo-1609521263047-f8f205293f24" },
  { key: "ev", label: "Elétrico", img: "https://images.pexels.com/photos/24376862/pexels-photo-24376862.jpeg" },
  { key: "pickup", label: "Picape", img: "https://images.pexels.com/photos/11532838/pexels-photo-11532838.jpeg" },
  { key: "sedan", label: "Sedan", img: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d" },
];

export default function Home() {
  return (
    <div data-testid="home-page">
      <SEO
        title="Marketplace de aluguel de carros"
        description="Encontre o carro certo, onde estiver, quando precisar. Alugue direto com proprietários verificados em todo o Brasil. SUV, sedan, 7 lugares, elétrico, com pagamento seguro e contrato digital."
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "DriveHub — Marketplace de aluguel de carros",
          "description": "Marketplace brasileiro de locação de veículos entre pessoas e empresas.",
          "inLanguage": "pt-BR",
          "isPartOf": { "@type": "WebSite", "name": "DriveHub" },
        }}
      />
      {/* HERO */}
      <section className="relative -mt-16 pt-16 min-h-[92vh] flex items-end md:items-center">
        <img src={HERO} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 hero-overlay" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 pb-20 md:pb-0 w-full">
          <div className="max-w-3xl">
            <span data-testid="hero-overline" className="overline text-[hsl(180,90%,60%)]">Marketplace de Mobilidade · Brasil</span>
            <h1 className="mt-4 text-4xl sm:text-5xl lg:text-7xl font-black text-white leading-[0.95]">
              O carro que você <span className="text-[hsl(180,90%,45%)]">precisa</span>.<br />
              Onde estiver. Quando precisar.
            </h1>
            <p className="mt-6 text-base md:text-lg text-white/80 max-w-xl">
              Alugue direto de proprietários verificados. Sem burocracia, sem taxas escondidas, com contrato digital e pagamento seguro.
            </p>
          </div>
          <div className="mt-10 max-w-5xl">
            <SearchBar dark />
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="overline text-[hsl(210,100%,22%)]">Encontre por categoria</span>
            <h2 className="mt-2 text-3xl md:text-4xl font-display font-bold">Para cada tipo de viagem</h2>
          </div>
          <Link to="/buscar" data-testid="see-all-vehicles" className="hidden md:inline text-sm font-medium text-[hsl(210,100%,22%)] hover:underline">Ver todos os veículos →</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 stagger">
          {CATEGORIES.map((c) => (
            <Link
              key={c.key}
              to={`/buscar?category=${c.key}`}
              data-testid={`cat-${c.key}`}
              className="relative aspect-[3/4] overflow-hidden border border-border card-hover"
            >
              <img src={c.img} alt={c.label} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              <div className="absolute bottom-0 p-4">
                <h3 className="font-display font-bold text-white text-lg leading-tight">{c.label}</h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-neutral-950 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <span className="overline text-[hsl(180,90%,45%)]">Como funciona</span>
          <h2 className="mt-2 text-3xl md:text-5xl font-display font-black max-w-2xl">
            Simples, seguro e transparente.
          </h2>
          <div className="mt-12 grid md:grid-cols-4 gap-8">
            {[
              { icon: MapPin, t: "Encontre", d: "Busque por cidade, datas e o que você realmente precisa: 7 lugares, automático, cadeirinha, elétrico..." },
              { icon: ShieldCheck, t: "Verifique", d: "Proprietário verificado, veículo verificado. CNH e identidade validadas antes de qualquer reserva." },
              { icon: HandCoins, t: "Pague seguro", d: "Pagamento processado pela plataforma com split automático entre proprietário e comissão transparente." },
              { icon: Car, t: "Dirija", d: "Retire, use, devolva. Check-in e check-out digitais com fotos. Contrato eletrônico para ambas as partes." },
            ].map((s, i) => (
              <div key={i} className="border border-white/10 p-6 bg-white/[0.03]">
                <s.icon size={32} weight="duotone" className="text-[hsl(180,90%,45%)]" />
                <h3 className="mt-4 font-display text-xl font-bold">{i + 1}. {s.t}</h3>
                <p className="mt-2 text-sm text-white/70 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="py-20 max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: ShieldCheck, t: "Verificação em camadas", d: "Identidade, CNH, meio de pagamento e histórico. Cada etapa auditável." },
            { icon: Lightning, t: "Reserva em minutos", d: "Do primeiro clique ao contrato digital assinado em menos de 5 minutos." },
            { icon: Star, t: "Comunidade avaliada", d: "Avaliações bidirecionais e proteção contra fraudes de reviews." },
          ].map((t, i) => (
            <div key={i} className="border border-border p-6 bg-white card-hover">
              <t.icon size={28} weight="duotone" className="text-[hsl(210,100%,22%)]" />
              <h3 className="mt-4 font-display text-xl font-bold">{t.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{t.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[hsl(210,100%,22%)] text-white py-16">
        <div className="max-w-5xl mx-auto px-4 md:px-8 text-center">
          <h2 className="font-display text-3xl md:text-5xl font-black">
            Tem um carro parado? Faça ele trabalhar.
          </h2>
          <p className="mt-4 text-lg text-white/90 max-w-2xl mx-auto">
            Cadastre seu veículo no DriveHub e comece a receber locações verificadas. Nós cuidamos da tecnologia, contrato e pagamento — você recebe.
          </p>
          <Link
            to="/anuncie"
            data-testid="cta-owner"
            className="inline-block mt-8 bg-white text-[hsl(210,100%,22%)] px-8 py-3 font-bold hover:bg-neutral-100 transition-colors"
          >
            Anunciar meu carro
          </Link>
        </div>
      </section>

      <footer className="bg-neutral-950 text-white/60 py-10 pb-24 md:pb-10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col md:flex-row justify-between gap-4 text-sm">
          <div>
            <div className="font-display text-2xl font-black text-white">DriveHub</div>
            <p className="mt-2">Marketplace de mobilidade. Intermediador tecnológico entre proprietários e locatários.</p>
          </div>
          <div className="text-xs md:text-right">
            <p>© 2026 DriveHub. LGPD compliant.</p>
            <p className="mt-1">Termos · Privacidade · Cancelamento</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
