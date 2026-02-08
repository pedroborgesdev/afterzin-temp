import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import EventDetail from "./pages/EventDetail";
import Auth from "./pages/Auth";
import TicketBag from "./pages/TicketBag";
import Profile from "./pages/Profile";
import ProducerDashboard from "./pages/ProducerDashboard";
import ProducerEventNew from "./pages/ProducerEventNew";
import ProducerEventEdit from "./pages/ProducerEventEdit";
import ProducerPublicProfile from "./pages/ProducerPublicProfile";
import ProducerScan from "./pages/ProducerScan";
import ProducerScanEvent from "./pages/ProducerScanEvent";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import CheckoutCancel from "./pages/CheckoutCancel";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/evento/:id" element={<EventDetail />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/mochila" element={<TicketBag />} />
            <Route path="/perfil" element={<Profile />} />
            <Route path="/produtor" element={<ProducerDashboard />} />
            <Route path="/produtor/eventos/novo" element={<ProducerEventNew />} />
            <Route path="/produtor/eventos/:id" element={<ProducerEventEdit />} />
            <Route path="/produtor/perfil/:producerId" element={<ProducerPublicProfile />} />
            <Route path="/produtor/validar" element={<ProducerScan />} />
            <Route path="/produtor/validar/:eventId" element={<ProducerScanEvent />} />
            <Route path="/checkout/sucesso" element={<CheckoutSuccess />} />
            <Route path="/checkout/cancelado" element={<CheckoutCancel />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
