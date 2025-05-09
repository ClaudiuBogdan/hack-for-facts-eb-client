import { DemoFilter } from "@/components/filters/entity-filter/DemoFilter";
import { createLazyFileRoute } from "@tanstack/react-router";

export const Route = createLazyFileRoute("/test")({
  component: TestPage,
});

function TestPage() {
    return (
        <div>
            <DemoFilter />
        </div>
    )
}