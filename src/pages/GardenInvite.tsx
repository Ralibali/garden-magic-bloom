import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/hooks/useAuth";
export default function GardenInvite() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [valid, setValid] = useState(false);
  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get(
      "garden_invite",
    );
    window.history.replaceState({}, "", window.location.pathname);
    if (token && /^[a-f0-9]{64}$/.test(token)) {
      try {
        sessionStorage.setItem("pending_garden_invite", token);
        setValid(true);
      } catch {
        setValid(false);
      }
    } else setValid(!!sessionStorage.getItem("pending_garden_invite"));
  }, []);
  useEffect(() => {
    if (valid && !loading && isAuthenticated) {
      navigate("/app/settings", { replace: true });
    }
  }, [valid, loading, isAuthenticated, navigate]);
  return (
    <main className="mx-auto max-w-lg p-8 space-y-4">
      <Helmet>
        <title>Inbjudan till odling</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="referrer" content="no-referrer" />
      </Helmet>
      <h1 className="font-serif text-2xl">Dela en odling</h1>
      <p>
        {valid
          ? "Logga in eller skapa konto för att granska och acceptera inbjudan."
          : "Inbjudan kunde inte öppnas. Be odlaren om en ny länk."}
      </p>
      {valid && (
        <Link className="underline" to="/login">
          Logga in eller skapa konto
        </Link>
      )}
    </main>
  );
}
