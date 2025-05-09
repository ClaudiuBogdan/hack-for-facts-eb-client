import { MultiSelectInfinite } from "@/components/entity-list";
import { createLazyFileRoute } from "@tanstack/react-router";

export const Route = createLazyFileRoute("/test")({
  component: TestPage,
});

function TestPage() {
    return (
        <div>
            <h1>Test</h1>
            <MultiSelectInfinite
                selected={[]}
                onChange={() => {}}
                placeholder="Select an option"
                pageSize={100}
            />
        </div>
    )
}