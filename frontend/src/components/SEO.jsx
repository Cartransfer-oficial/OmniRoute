import { Helmet } from "react-helmet-async";

export default function SEO({
  title,
  description,
  image,
  url,
  type = "website",
  noindex = false,
  jsonLd,
}) {
  const fullTitle = title ? `${title} — DriveHub` : "DriveHub — Marketplace de aluguel de carros no Brasil";
  const desc = description || "Alugue carros direto com proprietários verificados em todo o Brasil. Pagamento seguro com split, contrato digital, retirada em minutos.";
  const img = image || "https://images.pexels.com/photos/37075472/pexels-photo-37075472.jpeg";
  const href = typeof window !== "undefined" ? (url || window.location.href) : (url || "/");

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      <link rel="canonical" href={href} />

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:image" content={img} />
      <meta property="og:url" content={href} />
      <meta property="og:locale" content="pt_BR" />
      <meta property="og:site_name" content="DriveHub" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={img} />

      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
}
