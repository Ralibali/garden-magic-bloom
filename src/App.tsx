import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import React, { Suspense } from "react";
import CookieConsent from "./components/CookieConsent";

// Eager: landing + login (critical path)
import Index from "./pages/Index";
import Login from "./pages/Login";

// Lazy: everything behind auth
const AppLayout = React.lazy(() => import("./components/AppLayout"));
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const Beds = React.lazy(() => import("./pages/Beds"));
const Sowings = React.lazy(() => import("./pages/Sowings"));
const Harvests = React.lazy(() => import("./pages/Harvests"));
const Statistics = React.lazy(() => import("./pages/Statistics"));
const Reminders = React.lazy(() => import("./pages/Reminders"));
const SettingsPage = React.lazy(() => import("./pages/Settings"));
const Premium = React.lazy(() => import("./pages/Premium"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const Admin = React.lazy(() => import("./pages/Admin"));
const Terms = React.lazy(() => import("./pages/Terms"));
const Guides = React.lazy(() => import("./pages/Guides"));
const GuideArticle = React.lazy(() => import("./pages/GuideArticle"));
const SowingCalendar = React.lazy(() => import("./pages/SowingCalendar"));
const CropRotation = React.lazy(() => import("./pages/CropRotation"));
const SeedInventory = React.lazy(() => import("./pages/SeedInventory"));
const Timeline = React.lazy(() => import("./pages/Timeline"));
const CompanionPlanting = React.lazy(() => import("./pages/CompanionPlanting"));
const PestLog = React.lazy(() => import("./pages/PestLog"));
const PhotoDiary = React.lazy(() => import("./pages/PhotoDiary"));
const PlantLibrary = React.lazy(() => import("./pages/PlantLibrary"));
const PlantProfilePage = React.lazy(() => import("./pages/PlantProfilePage"));
const MyPlants = React.lazy(() => import("./pages/MyPlants"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <span className="text-2xl">🌱</span>
      <span className="text-sm text-muted-foreground">Laddar...</span>
    </div>
  </div>
);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingFallback />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function CacheClearer() {
  const { user } = useAuth();
  const prevUserId = React.useRef<string | null>(user?.id ?? null);

  React.useEffect(() => {
    if (user?.id !== prevUserId.current) {
      queryClient.clear();
      prevUserId.current = user?.id ?? null;
    }
  }, [user?.id]);

  return null;
}

const AppRoutes = () => (
  <BrowserRouter>
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/guider" element={<Guides />} />
        <Route path="/guider/:slug" element={<GuideArticle />} />
        <Route path="/blogg" element={<Guides />} />
        <Route path="/blogg/:slug" element={<GuideArticle />} />
        <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="beds" element={<Beds />} />
          <Route path="sowings" element={<Sowings />} />
          <Route path="harvests" element={<Harvests />} />
          <Route path="statistics" element={<Statistics />} />
          <Route path="reminders" element={<Reminders />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="premium" element={<Premium />} />
          <Route path="admin" element={<Admin />} />
          <Route path="calendar" element={<SowingCalendar />} />
          <Route path="rotation" element={<CropRotation />} />
          <Route path="seeds" element={<SeedInventory />} />
          <Route path="timeline" element={<Timeline />} />
          <Route path="companion" element={<CompanionPlanting />} />
          <Route path="pests" element={<PestLog />} />
          <Route path="photos" element={<PhotoDiary />} />
          <Route path="plants" element={<PlantLibrary />} />
          <Route path="plants/:id" element={<PlantProfilePage />} />
          <Route path="my-plants" element={<MyPlants />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <CacheClearer />
        <AppRoutes />
        <CookieConsent />
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
