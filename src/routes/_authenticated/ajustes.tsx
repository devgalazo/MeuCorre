import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Empty } from "@/components/app/bits";

export const Route = createFileRoute("/_authenticated/ajustes")({
  head: () => ({ meta: [{ title: "Ajustes — Corre Moto" }, { name: "description", content: "Ajustes no Corre Moto." }, { property: "og:title", content: "Ajustes — Corre Moto" }, { property: "og:description", content: "Ajustes no Corre Moto." }] }),
  component: () => (
    <div>
      <PageHeader title="Ajustes" />
      <Empty>Esta tela ainda será construída.</Empty>
    </div>
  ),
});
