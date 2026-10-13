import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Bike } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Corre Moto" },
      { name: "description", content: "Entre ou crie sua conta no Corre Moto." },
      { property: "og:title", content: "Entrar — Corre Moto" },
      { property: "og:description", content: "Acesse seu controle de ganhos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up" | "forgot">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/hoje", replace: true });
      } else if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({
          email, password, options: { emailRedirectTo: window.location.origin + "/hoje" },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/hoje", replace: true });
        else setSent("Enviamos um link de confirmação para seu e-mail. Abra o link para ativar a conta.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset-password" });
        if (error) throw error;
        setSent("Enviamos um link para criar uma nova senha.");
      }
    } catch (err) {
      const msg = (err as Error).message;
      toast.error(msg.includes("Invalid login") ? "E-mail ou senha incorretos." : msg);
    } finally {
      setBusy(false);
    }
  }

  const input = "h-12 w-full rounded-xl border bg-input/40 px-3 text-base outline-none focus:ring-2 focus:ring-ring";
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Bike /></div>
        <span className="font-display text-xl font-bold">Corre Moto</span>
      </div>
      <h1 className="text-2xl font-bold">{mode === "in" ? "Entrar" : mode === "up" ? "Criar conta" : "Recuperar senha"}</h1>
      {sent ? (
        <div className="mt-6 rounded-xl border bg-card p-4 text-sm">{sent}</div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-3">
          <input className={input} type="email" required autoComplete="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
          {mode !== "forgot" && (
            <input className={input} type="password" required minLength={6} autoComplete={mode === "in" ? "current-password" : "new-password"} placeholder="Senha (mín. 6 caracteres)" value={password} onChange={(e) => setPassword(e.target.value)} />
          )}
          <Button type="submit" disabled={busy} size="lg" className="h-12 w-full rounded-xl text-base font-bold">
            {busy ? "Aguarde..." : mode === "in" ? "Entrar" : mode === "up" ? "Criar conta" : "Enviar link"}
          </Button>
        </form>
      )}
      <div className="mt-6 flex flex-col gap-2 text-sm text-muted-foreground">
        {mode !== "in" && <button onClick={() => { setMode("in"); setSent(""); }} className="text-left underline">Já tenho conta — entrar</button>}
        {mode !== "up" && <button onClick={() => { setMode("up"); setSent(""); }} className="text-left underline">Não tenho conta — criar</button>}
        {mode === "in" && <button onClick={() => { setMode("forgot"); setSent(""); }} className="text-left underline">Esqueci minha senha</button>}
      </div>
    </main>
  );
}
