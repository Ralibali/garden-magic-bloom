import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prepareSeedPhoto } from "@/lib/seedPlans";
export default function PestPhoto() {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const navigate = useNavigate();
  const choose = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const imageData = await prepareSeedPhoto(file);
      navigate("/app/gro", {
        state: {
          source: "pest_photo",
          imageData,
          prompt:
            "Bedöm bladet på bilden. Beskriv vad som syns, möjliga orsaker och hur osäker bedömningen är. Fråga efter sådant som inte framgår. Föreslå vad jag kan kontrollera och när jag bör följa upp. Ge ingen säker diagnos från enbart fotot.",
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bilden kunde inte öppnas");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };
  return (
    <section className="rounded-2xl border bg-primary/5 p-5 space-y-2">
      <h2 className="font-serif text-xl">Fotografera ett blad</h2>
      <p className="text-sm text-muted-foreground">
        Ta en tydlig närbild. Gro kan ge en första bedömning och frågor att
        följa upp. Du granskar bilden och väljer att skicka den efter
        AI-samtycke.
      </p>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={(e) => void choose(e.target.files?.[0])}
      />
      <Button disabled={busy} onClick={() => input.current?.click()}>
        <Camera className="mr-2 h-4 w-4" />
        {busy ? "Öppnar bilden…" : "Ta eller välj foto"}
      </Button>
      {error && <p role="alert" className="text-sm text-destructive">{error}
      </p>}
    </section>
  );
}
