import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Seo } from "@/hooks/useSeo";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sprout } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Seo
        title="Sidan hittades inte – Odlingsdagboken"
        description="Sidan du letade efter finns inte. Gå tillbaka till startsidan."
        path={location.pathname}
        noindex
      />
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Sprout className="h-8 w-8 text-primary" />
        </div>
        <h1 className="font-serif text-5xl font-bold text-foreground mb-3">404</h1>
        <p className="text-lg text-muted-foreground mb-6">
          Här växer det inget just nu. Sidan du letade efter finns inte.
        </p>
        <Button asChild size="lg" className="gap-2">
          <a href="/">
            <ArrowLeft className="h-4 w-4" /> Tillbaka till startsidan
          </a>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
