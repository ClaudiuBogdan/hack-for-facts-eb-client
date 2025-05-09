import { DemoFilter } from "@/components/filters/DemoFilter";
import { createLazyFileRoute } from "@tanstack/react-router";

export const Route = createLazyFileRoute("/test")({
    component: TestPage,
});

function TestPage() {
    return (
        <div className="flex flex-row">
            <div className="w-[28rem]">
                <DemoFilter />
            </div>
            <div className="h-100">
                <div className="h-full w-full bg-red-500">
                    <div className="h-full w-full bg-blue-500">
                        <div className="h-full w-full bg-green-500">
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}