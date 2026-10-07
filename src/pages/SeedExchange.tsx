import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";
const db = supabase as any;
type Listing = {
  id: string;
  user_id: string;
  title: string;
  crop: string;
  kind: string;
  offer: string;
  locality: string;
  description: string;
  status: string;
  expires_at: string;
};
type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  created_at: string;
};
export default function SeedExchange() {
  const { user } = useAuth();
  const cache = useQueryClient();
  const [search, setSearch] = useState(""),
    [open, setOpen] = useState(false),
    [selected, setSelected] = useState<Listing | null>(null),
    [replyTo, setReplyTo] = useState(""),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const empty = {
    title: "",
    crop: "",
    kind: "seed",
    offer: "swap",
    locality: "",
    description: "",
  };
  const [form, setForm] = useState(empty);
  const listings = useQuery({
    queryKey: ["seed-exchange"],
    queryFn: async () => {
      const { data, error } = await db.from("seed_exchange_listings").select(
        "*",
      ).order("created_at", { ascending: false }).limit(150);
      if (error) throw error;
      return data as Listing[];
    },
  });
  const thread = useQuery({
    queryKey: ["seed-exchange-messages", selected?.id],
    enabled: !!selected,
    refetchInterval: selected ? 15000 : false,
    queryFn: async () => {
      const { data, error } = await db.from("seed_exchange_messages").select(
        "*",
      ).eq("listing_id", selected!.id).order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data as Message[]).reverse();
    },
  });
  const create = useMutation({
    mutationFn: async () => {
      const { error } = await db.from("seed_exchange_listings").insert({
        ...form,
        title: form.title.trim(),
        crop: form.crop.trim(),
        locality: form.locality.trim(),
        description: form.description.trim(),
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: ["seed-exchange"] });
      setOpen(false);
      setForm(empty);
      setError("");
    },
    onError: () => setError("Annonsen kunde inte sparas. Försök igen."),
  });
  const close = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("seed_exchange_listings").update({
        status: "closed",
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => cache.invalidateQueries({ queryKey: ["seed-exchange"] }),
    onError: () => setError("Annonsen kunde inte avslutas."),
  });
  const send = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error();
      const { error } = await db.from("seed_exchange_messages").insert({
        listing_id: selected.id,
        recipient_id: selected.user_id === user?.id
          ? replyTo
          : selected.user_id,
        message: message.trim(),
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setMessage("");
      setError("");
      await cache.invalidateQueries({
        queryKey: ["seed-exchange-messages", selected?.id],
      });
    },
    onError: () =>
      setError(
        "Meddelandet kunde inte skickas. Annonsen kan vara avslutad. Försök senare.",
      ),
  });
  const contacts = [
    ...new Set(
      (thread.data ?? []).flatMap((m) => [m.sender_id, m.recipient_id]).filter(
        (id) => id !== user?.id,
      ),
    ),
  ];
  const messages = (thread.data ?? []).filter((m) =>
    selected?.user_id !== user?.id || !replyTo || m.sender_id === replyTo ||
    m.recipient_id === replyTo
  );
  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Fröbyte</h1>
          <p className="mt-2 text-muted-foreground">
            Byt frön och plantor, eller ge bort ditt överskott.
          </p>
        </div>
        <Button
          onClick={() => {
            setError("");
            setOpen(true);
          }}
        >
          Lägg upp annons
        </Button>
      </header>
      <p className="text-sm">
        Ange ort, sort och vad du vill byta till. Kontakt sker här i appen. Dela
        exakt adress först när ni har kommit överens.
      </p>
      <Input
        aria-label="Sök fröbyte"
        placeholder="Sök gröda, sort eller ort"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {listings.isPending
        ? <p>Hämtar annonser…</p>
        : listings.isError
        ? (
          <p role="alert">
            Fröbytet kunde inte hämtas.{" "}
            <Button variant="outline" onClick={() => void listings.refetch()}>
              Försök igen
            </Button>
          </p>
        )
        : !listings.data?.length
        ? (
          <section className="rounded-2xl border p-8">
            <h2 className="font-serif text-2xl">
              Har du fler frön än du behöver?
            </h2>
            <p className="mt-2">
              Var först med att lägga upp en påse eller några plantor. Inga
              annonser skapas automatiskt.
            </p>
          </section>
        )
        : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.data.filter((l) =>
              `${l.title} ${l.crop} ${l.locality}`.toLocaleLowerCase("sv-SE")
                .includes(search.toLocaleLowerCase("sv-SE"))
            ).map((l) => (
              <article
                key={l.id}
                className="rounded-2xl border bg-card p-5 space-y-3"
              >
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {l.kind === "seed" ? "Frön" : "Plantor"} ·{" "}
                  {l.offer === "swap" ? "Bytes" : "Skänkes"} · {l.locality}
                </p>
                <h2 className="font-serif text-xl">{l.title}</h2>
                <p className="text-sm whitespace-pre-wrap">{l.description}</p>
                <p className="text-xs">
                  {l.status === "closed"
                    ? "Avslutad"
                    : new Date(l.expires_at) < new Date()
                    ? "Utgången"
                    : `Aktiv till ${l.expires_at.slice(0, 10)}`}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelected(l);
                      setReplyTo("");
                      setMessage("");
                      setError("");
                    }}
                  >
                    {l.user_id === user?.id
                      ? "Meddelanden"
                      : "Kontakta odlaren"}
                  </Button>
                  {l.user_id === user?.id && l.status === "active" && (
                    <ConfirmDeleteButton
                      itemName={l.title}
                      description="Annonsen avslutas och tar inte emot fler svar. Befintliga meddelanden finns kvar för deltagarna."
                      onConfirm={() => close.mutate(l.id)}
                      disabled={close.isPending}
                    />
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!create.isPending) setOpen(v);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lägg upp frön eller plantor</DialogTitle>
            <DialogDescription>
              Annonsen visas för inloggade odlare i 60 dagar. Skriv inga privata
              kontaktuppgifter i beskrivningen.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            {(["title", "crop", "locality"] as const).map((key, i) => (
              <label key={key} className="block text-sm">
                {["Rubrik", "Gröda eller sort", "Ort"][i]}
                <Input
                  required
                  minLength={key === "title" ? 2 : 1}
                  maxLength={100}
                  value={form[key]}
                  onChange={(e) =>
                    setForm({ ...form, [key]: e.target.value })}
                />
              </label>
            ))}
            <div className="flex gap-3">
              <label>
                Typ{" "}
                <select
                  className="rounded border p-2 bg-background"
                  value={form.kind}
                  onChange={(e) => setForm({ ...form, kind: e.target.value })}
                >
                  <option value="seed">Frön</option>
                  <option value="plant">Plantor</option>
                </select>
              </label>
              <label>
                Erbjudande{" "}
                <select
                  className="rounded border p-2 bg-background"
                  value={form.offer}
                  onChange={(e) => setForm({ ...form, offer: e.target.value })}
                >
                  <option value="swap">Bytes</option>
                  <option value="give">Skänkes</option>
                </select>
              </label>
            </div>
            <label className="block text-sm">
              Beskrivning<Textarea
                maxLength={2000}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })}
                placeholder="Mängd, ålder och vad du vill byta till"
              />
            </label>
            <Button disabled={create.isPending}>Publicera annons</Button>
            {error && <p role="alert">{error}</p>}
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!selected}
        onOpenChange={(v) => {
          if (!v) setSelected(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.title}</DialogTitle>
            <DialogDescription>
              Meddelanden mellan dig och den andra odlaren. Ni kommer själva
              överens om bytet.
            </DialogDescription>
          </DialogHeader>
          {selected?.user_id === user?.id && (
            <label>
              Välj konversation<select
                className="ml-2 rounded border p-2 bg-background"
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
              >
                <option value="">Välj odlare</option>
                {contacts.map((id, i) => (
                  <option key={id} value={id}>Odlare {i + 1}</option>
                ))}
              </select>
            </label>
          )}
          {thread.isError
            ? <p role="alert">Meddelandena kunde inte hämtas.</p>
            : thread.isPending
            ? <p>Hämtar meddelanden…</p>
            : messages.map((m) => (
              <article
                key={m.id}
                className={`rounded-xl p-3 ${
                  m.sender_id === user?.id ? "bg-primary/10" : "bg-muted"
                }`}
              >
                <p className="text-xs text-muted-foreground">
                  {m.sender_id === user?.id ? "Du" : "Odlare"} ·{" "}
                  {new Date(m.created_at).toLocaleString("sv-SE")}
                </p>
                <p className="whitespace-pre-wrap text-sm">{m.message}</p>
              </article>
            ))}
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              send.mutate();
            }}
          >
            <Textarea
              aria-label="Meddelande"
              maxLength={2000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Skriv en fråga om bytet"
            />
            <Button
              disabled={send.isPending || !message.trim() ||
                (selected?.user_id === user?.id && !replyTo) ||
                selected?.status !== "active"}
            >
              Skicka meddelande
            </Button>
            {error && <p role="alert">{error}</p>}
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
