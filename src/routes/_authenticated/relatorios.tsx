import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Empty } from "@/components/app/bits";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — Corre Moto" }, { name: "description", content: "Relatórios no Corre Moto." }, { property: "og:title", content: "Relatórios — Corre Moto" }, { property: "og:description", content: "Relatórios no Corre Moto." }] }),
  component: () => (
    <div>
      <PageHeader title="Relatórios" />
      <Empty>Esta tela ainda será construída.</Empty>
    </div>
  ),
});
