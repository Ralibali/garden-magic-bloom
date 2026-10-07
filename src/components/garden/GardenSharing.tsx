import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";
import { toast } from "@/hooks/use-toast";
const db = supabase as any;
export default function GardenSharing() {
  const { user } = useAuth();
  const cache = useQueryClient();
  const [link, setLink] = useState(""),
    [token, setToken] = useState(""),
    [name, setName] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const value = params.get("garden_invite") ||
      sessionStorage.getItem("pending_garden_invite");
    if (value) {
      setToken(value);
      window.history.replaceState(
        {},
        "",
        window.location.pathname + window.location.search,
      );
    }
  }, []);
  const members = useQuery({
    queryKey: ["garden-members"],
    queryFn: async () => {
      const { data, error } = await db.from("garden_members").select("*");
      if (error) throw error;
      return data as {
        owner_id: string;
        member_id: string;
        display_name: string;
      }[];
    },
  });
  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await db.rpc("create_garden_invitation");
      if (error) throw error;
      return data as string;
    },
    onSuccess: (token) =>
      setLink(
        `https://odlingsdagboken.com/auth/garden-invite#garden_invite=${token}`,
      ),
    onError: () => setError("Kunde inte skapa en inbjudan. Försök igen."),
  });
  const join = useMutation({
    mutationFn: async () => {
      const raw = token.trim();
      const value = raw.includes("#")
        ? new URLSearchParams(raw.split("#")[1]).get("garden_invite")
        : raw;
      const { error } = await db.rpc("accept_garden_invitation", {
        p_token: value,
        p_name: name.trim(),
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      sessionStorage.removeItem("pending_garden_invite");
      setToken("");
      setName("");
      setError("");
      await cache.invalidateQueries();
      toast({ title: "Du har gått med i odlingen" });
    },
    onError: () =>
      setError(
        "Inbjudan kunde inte användas. Kontrollera länken och att den inte gått ut eller redan använts.",
      ),
  });
  const remove = useMutation({
    mutationFn: async (m: { owner_id: string; member_id: string }) => {
      const { error } = await db.from("garden_members").delete().eq(
        "owner_id",
        m.owner_id,
      ).eq("member_id", m.member_id);
      if (error) throw error;
    },
    onSuccess: () => cache.invalidateQueries(),
    onError: () => setError("Åtkomsten kunde inte tas bort."),
  });
  return (
    <section className="rounded-2xl border bg-card p-5 space-y-4">
      <h2 className="text-xl font-serif">Dela din trädgård</h2>
      <p className="text-sm text-muted-foreground">
        En medlem kan se dina bäddar, flytta dem i kartan och logga eller
        redigera sådder, skördar och problem som är kopplade till dem. Kontot,
        privata dagboksanteckningar och betalningar delas inte. Medlemmens egna
        odlingsplatser ligger kvar bredvid de delade.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={create.isPending}
          onClick={() => {
            setError("");
            create.mutate();
          }}
        >
          Skapa inbjudningslänk
        </Button>
        <Button
          variant="outline"
          onClick={async () => {
            const { error } = await db.rpc("revoke_garden_invitations");
            if (error) setError("Kunde inte återkalla länkarna.");
            else {
              setLink("");
              toast({ title: "Oanvända inbjudningslänkar är återkallade" });
            }
          }}
        >
          Återkalla oanvända länkar
        </Button>
      </div>
      {link && (
        <div className="space-y-2">
          <Input aria-label="Inbjudningslänk" value={link} readOnly />
          <p className="text-xs">
            Giltig i sju dagar och för en person. Dela bara med den du vill
            bjuda in.
          </p>
          <Button
            variant="outline"
            onClick={() =>
              void navigator.clipboard.writeText(link).then(() =>
                toast({ title: "Länken är kopierad" })
              ).catch(() => setError("Kopiera länken i fältet ovan."))}
          >
            Kopiera länk
          </Button>
        </div>
      )}
      {members.isError
        ? (
          <p role="alert">
            Medlemmarna kunde inte hämtas.{" "}
            <Button variant="ghost" onClick={() => void members.refetch()}>
              Försök igen
            </Button>
          </p>
        )
        : members.data?.map((m) => (
          <div
            key={`${m.owner_id}-${m.member_id}`}
            className="flex items-center justify-between rounded-xl border p-3"
          >
            <span>
              {m.owner_id === user?.id
                ? m.display_name
                : "Du är medlem i en delad odling"}
            </span>
            <ConfirmDeleteButton
              itemName={m.owner_id === user?.id
                ? m.display_name
                : "ditt medlemskap"}
              description="Åtkomsten upphör. Tidigare loggningar ligger kvar i odlingen."
              onConfirm={() => remove.mutate(m)}
              disabled={remove.isPending}
            />
          </div>
        ))}
      <form
        className="space-y-2 border-t pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          join.mutate();
        }}
      >
        <h3 className="font-semibold">Har du fått en inbjudan?</h3>
        <Input
          aria-label="Inbjudan"
          placeholder="Klistra in länken eller koden"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <Input
          aria-label="Ditt namn i odlingen"
          placeholder="Ditt namn i odlingen"
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button disabled={join.isPending || !token.trim() || !name.trim()}>
          Gå med i odlingen
        </Button>
      </form>
      {error && <p role="alert" className="text-sm text-destructive">{error}
      </p>}
    </section>
  );
}
