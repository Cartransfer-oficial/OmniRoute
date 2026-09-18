import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { Link } from "react-router-dom";
import { formatBRL } from "@/lib/api";

// Fix leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const priceIcon = (price) =>
  L.divIcon({
    className: "custom-price-marker",
    html: `<div style="background:#FF5A00;color:#fff;padding:6px 10px;border-radius:999px;font-weight:700;font-size:12px;font-family:'Cabinet Grotesk',sans-serif;box-shadow:0 4px 12px rgba(0,0,0,0.2);white-space:nowrap;border:2px solid white;">${formatBRL(price)}</div>`,
    iconSize: [80, 30],
    iconAnchor: [40, 30],
  });

export default function VehicleMap({ vehicles, center = [-14.235, -51.9253], zoom = 4, height = "500px" }) {
  const validVehicles = (vehicles || []).filter((v) => v.lat && v.lng);
  const initial = validVehicles.length
    ? [validVehicles[0].lat, validVehicles[0].lng]
    : center;
  const initialZoom = validVehicles.length ? 11 : zoom;

  return (
    <div data-testid="vehicle-map" style={{ height, width: "100%" }} className="border border-border overflow-hidden">
      <MapContainer center={initial} zoom={initialZoom} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validVehicles.map((v) => (
          <Marker key={v.id} position={[v.lat, v.lng]} icon={priceIcon(v.daily_price)}>
            <Popup>
              <div style={{ minWidth: 180 }}>
                <img src={v.photos?.[0]} alt="" style={{ width: "100%", height: 90, objectFit: "cover", marginBottom: 6 }} />
                <div style={{ fontWeight: 700 }}>{v.brand} {v.model}</div>
                <div style={{ fontSize: 12, color: "#666" }}>{v.city}, {v.state}</div>
                <div style={{ fontWeight: 700, color: "#FF5A00", marginTop: 4 }}>{formatBRL(v.daily_price)}/dia</div>
                <Link to={`/veiculo/${v.id}`} style={{ color: "#FF5A00", fontWeight: 600, fontSize: 12 }}>Ver detalhes →</Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
