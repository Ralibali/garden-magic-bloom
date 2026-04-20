import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import React, { Suspense } from "react";
import { HelmetProvider } from "react-helmet-async";
import CookieConsent from "./components/CookieConsent";
import { TrackingProvider } from "./components/TrackingProvider";

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
const GardeningCoach = React.lazy(() => import("./pages/GardeningCoach"));
const Install = React.lazy(() => import("./pages/Install"));
const ResetPassword = React.lazy(() => import("./pages/ResetPassword"));

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
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <span className="text-4xl animate-[pulse_1.5s_ease-in-out_infinite]">🌱</span>
        <div className="absolute -inset-3 rounded-full bg-primary/10 animate-[ping_2s_ease-in-out_infinite] opacity-30" />
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-sm font-medium text-foreground">Odlingsdagboken</span>
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-[bounce_1s_ease-in-out_infinite]" />
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-[bounce_1s_ease-in-out_0.15s_infinite]" />
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-[bounce_1s_ease-in-out_0.3s_infinite]" />
        </div>
      </div>
    </div>
  </div>
);

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-md text-center space-y-4">
            <span className="text-4xl">⚠️</span>
            <h1 className="text-xl font-bold text-foreground">Något gick fel</h1>
            <p className="text-sm text-muted-foreground">{this.state.error?.message}</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm">Ladda om</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  console.log('[ProtectedRoute] loading:', loading, 'isAuthenticated:', isAuthenticated);
  if (loading) return <LoadingFallback />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// Redirect /guider/:slug → /blogg/:slug (consolidate duplicate content)
function GuiderRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/blogg/${slug}`} replace />;
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
    <TrackingProvider />
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/terms" element={<Terms />} />
          {/* SEO: /guider konsoliderad till /blogg (301 i vercel.json, client-side fallback här) */}
          <Route path="/guider" element={<Navigate to="/blogg" replace />} />
          <Route path="/guider/:slug" element={<GuiderRedirect />} />
          <Route path="/blogg" element={<Guides />} />
          <Route path="/blogg/tagg/:tag" element={<Guides />} />
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
            <Route path="gro" element={<GardeningCoach />} />
          </Route>
          <Route path="/install" element={<Install />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  </BrowserRouter>
);

const App = () => (
  <HelmetProvider>
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
  </HelmetProvider>
);

export default App;
