import { UatMap, UatProperties } from "@/components/maps/UatMap";
import { createLazyFileRoute } from "@tanstack/react-router";
import { LeafletMouseEvent } from "leaflet";

export const Route = createLazyFileRoute("/test")({
    component: TestPage,
});

function TestPage() {
    const handleUatClick = (properties: UatProperties, event: LeafletMouseEvent) => {
        console.log(properties, event);
    }
    return (
        <div className="flex flex-row">
            <UatMap onUatClick={handleUatClick} />
        </div>
    )
}