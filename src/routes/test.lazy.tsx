import { EntityOptions } from "@/components/filters/entity-filter/EntityOptions";
import { createLazyFileRoute } from "@tanstack/react-router";

export const Route = createLazyFileRoute("/test")({
  component: TestPage,
});

function TestPage() {
    return (
        <div>
            <h1>Test</h1>
            <EntityOptions />
        </div>
    )
}