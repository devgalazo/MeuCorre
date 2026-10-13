import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nova senha — Corre Moto" },
      { name: "description", content: "Crie uma nova senha para sua conta." },
      { property: "og:title", content: "Nova senha — Corre Moto" },
      { property: "og:description", content: "Crie uma nova senha." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reset,
});

function Reset() {
  const [pw, setPw] = useState("");
  const navigate = useNavigate();
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) { toast.error(error.message); return; }
    toast.success("Senha alterada!");
    navigate({ to: "/hoje" });
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-bold">Criar nova senha</h1>
      <form onSubmit={save} className="mt-6 space-y-3">
        <input type="password" minLength={6} required value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Nova senha" className="h-12 w-full rounded-xl border bg-input/40 px-3 outline-none focus:ring-2 focus:ring-ring" />
        <Button type="submit" size="lg" className="h-12 w-full rounded-xl font-bold">Salvar</Button>
      </form>
    </main>
  );
}
