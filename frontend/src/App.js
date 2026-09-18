import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import "@/App.css";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/layout/Navbar";
import BottomNav from "@/components/layout/BottomNav";
import Home from "@/pages/Home";
import Search from "@/pages/Search";
import VehicleDetails from "@/pages/VehicleDetails";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import KycFlow from "@/pages/KycFlow";
import BookingDetails from "@/pages/BookingDetails";
import MyBookings from "@/pages/MyBookings";
import OwnerDashboard from "@/pages/OwnerDashboard";
import AddVehicle from "@/pages/AddVehicle";
import AdminDashboard from "@/pages/AdminDashboard";
import Profile from "@/pages/Profile";
import HowItWorks from "@/pages/HowItWorks";

function Protected({ children, roles }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function Shell() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/buscar" element={<Search />} />
          <Route path="/veiculo/:id" element={<VehicleDetails />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Register />} />
          <Route path="/como-funciona" element={<HowItWorks />} />
          <Route path="/verificacao" element={<Protected><KycFlow /></Protected>} />
          <Route path="/perfil" element={<Protected><Profile /></Protected>} />
          <Route path="/reserva/:id" element={<Protected><BookingDetails /></Protected>} />
          <Route path="/minhas-reservas" element={<Protected roles={["renter", "admin"]}><MyBookings /></Protected>} />
          <Route path="/proprietario" element={<Protected roles={["owner", "admin"]}><OwnerDashboard /></Protected>} />
          <Route path="/anuncie" element={<Protected roles={["owner", "admin"]}><AddVehicle /></Protected>} />
          <Route path="/admin" element={<Protected roles={["admin"]}><AdminDashboard /></Protected>} />
        </Routes>
      </main>
      <BottomNav />
    </>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <Shell />
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
