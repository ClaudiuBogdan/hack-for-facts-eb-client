import { useMemo, useState } from "react";
import { ListContainerSimple } from "../base-filter/ListContainerSimple";
import { ListOption } from "../base-filter/ListOption";
import { OptionItem } from "../base-filter/interfaces";
import { SearchInput } from "../base-filter/SearchInput";
import Fuse from "fuse.js";
import { Info } from "lucide-react";
import { cn, getUserLocale } from "@/lib/utils";
import {
    useEntityTagVocabulary,
    type EntityTagVocabularyFacet,
    type EntityTagVocabularyTag,
} from "@/hooks/filters/useFilterLabels";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";

interface TagListProps {
    selectedOptions: OptionItem[];
    toggleSelect: (option: OptionItem) => void;
    pageSize?: number;
    className?: string;
    /**
     * Which helper copy to show. Include and exclude have DIFFERENT server
     * semantics: include is OR within a facet AND across facets; exclude is
     * flat any-match. Showing the include sentence in the exclude panel gives
     * users a materially wrong mental model.
     */
    semantics?: "include" | "exclude";
}

const HEADER_HEIGHT = 30;
const ROW_HEIGHT = 40;

/**
 * The base-filter kit has no group-header primitive and `ListOption` positions
 * rows absolutely via explicit offsets, so the grouped row model is flattened
 * here: [facet header, ...its tags, facet header, ...]. Headers are rendered
 * WITHOUT `data-list-option`, so keyboard navigation skips them.
 */
type Row =
    | { type: "header"; facet: EntityTagVocabularyFacet; label: string; start: number }
    | {
          type: "tag";
          option: OptionItem<string>;
          description?: string;
          isChild: boolean;
          start: number;
      };

export function TagList({
    selectedOptions,
    toggleSelect,
    className,
    semantics = "include",
}: TagListProps) {
    const [searchFilter, setSearchFilter] = useState("");
    const { vocabulary } = useEntityTagVocabulary();
    const locale = getUserLocale();

    const searchableTags = useMemo(() => {
        if (!vocabulary) return [];
        return vocabulary.facets.flatMap((facet) =>
            facet.tags.map((tag) => ({
                facet,
                tag,
                label: locale === "ro" ? tag.labelRo : tag.labelEn,
            }))
        );
    }, [vocabulary, locale]);

    const fuse = useMemo(
        () =>
            new Fuse(searchableTags, {
                keys: ["label", "tag.tag"],
                threshold: 0.3,
            }),
        [searchableTags]
    );

    const { rows, totalHeight } = useMemo(() => {
        if (!vocabulary) return { rows: [] as Row[], totalHeight: 0 };

        const matchedTags = searchFilter
            ? new Set(fuse.search(searchFilter).map((result) => result.item.tag.tag))
            : null;

        const rows: Row[] = [];
        let offset = 0;
        for (const facet of vocabulary.facets) {
            const facetTags = facet.tags.filter(
                (tag) => matchedTags === null || matchedTags.has(tag.tag)
            );
            if (facetTags.length === 0) continue;

            rows.push({
                type: "header",
                facet,
                label: locale === "ro" ? facet.labelRo : facet.labelEn,
                start: offset,
            });
            offset += HEADER_HEIGHT;

            for (const tag of facetTags) {
                rows.push({
                    type: "tag",
                    option: {
                        id: tag.tag,
                        label: locale === "ro" ? tag.labelRo : tag.labelEn,
                    },
                    description: pickDescription(tag, locale),
                    isChild: tag.parent !== undefined,
                    start: offset,
                });
                offset += ROW_HEIGHT;
            }
        }
        return { rows, totalHeight: offset };
    }, [vocabulary, searchFilter, fuse, locale]);

    return (
        <div className={cn("w-full flex flex-col space-y-3", className)}>
            <SearchInput
                onChange={setSearchFilter}
                placeholder={t`Search tags (ex: Hospital, Local)`}
            />
            {/* The combination rule is invisible without this line. */}
            <p className="text-xs text-muted-foreground px-1">
                {semantics === "exclude" ? (
                    <Trans>Entities carrying any selected tag are excluded.</Trans>
                ) : (
                    <Trans>
                        Tags in the same group combine with OR; different groups combine with
                        AND.
                    </Trans>
                )}
            </p>
            <ListContainerSimple height={totalHeight}>
                {rows.map((row) =>
                    row.type === "header" ? (
                        <div
                            key={`header-${row.facet.facet}`}
                            className="absolute top-0 left-0 w-full flex items-center gap-1.5 px-3 bg-muted/60 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground select-none"
                            style={{
                                height: `${HEADER_HEIGHT}px`,
                                transform: `translateY(${row.start}px)`,
                            }}
                            role="group"
                            aria-label={row.label}
                        >
                            {row.label}
                            {pickFacetNote(row.facet, locale) !== undefined && (
                                <Info
                                    className="w-3 h-3 shrink-0 normal-case text-muted-foreground/70"
                                    aria-label={pickFacetNote(row.facet, locale)}
                                >
                                    <title>{pickFacetNote(row.facet, locale)}</title>
                                </Info>
                            )}
                        </div>
                    ) : (
                        <ListOption
                            key={row.option.id}
                            onClick={() => toggleSelect(row.option)}
                            label={row.option.label}
                            uniqueIdPart={row.option.id}
                            selected={selectedOptions.some((so) => so.id === row.option.id)}
                            optionHeight={ROW_HEIGHT}
                            optionStart={row.start}
                            className={row.isChild ? "pl-5" : undefined}
                        >
                            {row.description !== undefined && (
                                <Info
                                    className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70"
                                    aria-label={row.description}
                                >
                                    <title>{row.description}</title>
                                </Info>
                            )}
                        </ListOption>
                    )
                )}
            </ListContainerSimple>
        </div>
    );
}

/** Module-level wrapper so `FilterListContainer` (whose listComponent contract
 * has no extra props) can render the exclude variant without re-creating the
 * component on every render. */
export function TagExcludeList(props: Omit<TagListProps, "semantics">) {
    return <TagList {...props} semantics="exclude" />;
}

function pickDescription(
    tag: EntityTagVocabularyTag,
    locale: string
): string | undefined {
    return locale === "ro" ? tag.descriptionRo : tag.descriptionEn;
}

function pickFacetNote(
    facet: EntityTagVocabularyFacet,
    locale: string
): string | undefined {
    return locale === "ro" ? facet.noteRo : facet.noteEn;
}
