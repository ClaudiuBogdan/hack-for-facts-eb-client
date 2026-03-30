import { forwardRef } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { EntitySearchNode } from "@/schemas/entities";
import { ExternalLink, MapPin } from "lucide-react";
import {
    buildEntitySelectionPath,
    type EntitySelectionBehavior,
} from "@/lib/entity-navigation";

interface SearchResultItemProps {
    entity: EntitySearchNode;
    isActive: boolean;
    id: string;
    selectionBehavior: EntitySelectionBehavior;
    onClick: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export const SearchResultItem = forwardRef<HTMLAnchorElement, SearchResultItemProps>(
    function SearchResultItem({ entity, isActive, id, selectionBehavior, onClick }, ref) {
        const destination = buildEntitySelectionPath({
            cui: entity.cui,
            entityType: entity.entity_type,
            isUat: entity.is_uat,
        }, selectionBehavior);

        return (
            <li role="option" id={id} aria-selected={isActive}>
                <Link
                    ref={ref}
                    to={destination as '/'}
                    preload="intent"
                    search={(prev) => ({ ...prev })}
                    onClick={onClick}
                    className={cn(
                        "block w-full px-6 py-4 transition-colors group focus:outline-none",
                        isActive
                            ? "bg-slate-100 dark:bg-slate-600"
                            : "hover:bg-slate-50 dark:hover:bg-slate-700"
                    )}
                >
                    <div className="flex justify-between items-center">
                        <div className="flex flex-col items-start mr-4 min-w-0">
                            <div className={cn(
                                "font-semibold text-slate-800 dark:text-slate-100 transition-colors truncate",
                                isActive ? "text-primary dark:text-primary-focus" : "group-hover:text-primary"
                            )}>
                                {entity.name}
                            </div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">
                                CUI: {entity.cui}
                            </div>
                            {entity.uat?.county_name && (
                                <div className="mt-0.5 flex items-center text-xs text-slate-400 dark:text-slate-500">
                                    <MapPin aria-hidden="true" className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                                    {entity.uat.name} (Jud. {entity.uat.county_name})
                                </div>
                            )}
                        </div>
                        <ExternalLink aria-hidden="true" className={cn(
                            "h-5 w-5 text-slate-400 dark:text-slate-500 transition-colors flex-shrink-0",
                            isActive ? "text-primary" : "group-hover:text-primary"
                        )} />
                    </div>
                </Link>
            </li>
        );
    }
);
