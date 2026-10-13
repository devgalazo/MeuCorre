import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Empty } from "@/components/app/bits";

export const Route = createFileRoute("/_authenticated/lancar")({
  head: () => ({ meta: [{ title: "Lançar dia — Corre Moto" }, { name: "description", content: "Lançar dia no Corre Moto." }, { property: "og:title", content: "Lançar dia — Corre Moto" }, { property: "og:description", content: "Lançar dia no Corre Moto." }] }),
  component: () => (
    <div>
      <PageHeader title="Lançar dia" />
      <Empty>Esta tela ainda será construída.</Empty>
    </div>
  ),
});
