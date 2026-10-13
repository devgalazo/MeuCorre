import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Empty } from "@/components/app/bits";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({ meta: [{ title: "Histórico — Corre Moto" }, { name: "description", content: "Histórico no Corre Moto." }, { property: "og:title", content: "Histórico — Corre Moto" }, { property: "og:description", content: "Histórico no Corre Moto." }] }),
  component: () => (
    <div>
      <PageHeader title="Histórico" />
      <Empty>Esta tela ainda será construída.</Empty>
    </div>
  ),
});
