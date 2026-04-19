import { type FormEvent, useEffect, useMemo, useState } from "react";
import { t } from "@lingui/core/macro";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { EntitySearchInput } from "@/components/entities/EntitySearch";
import { useEntityLabel } from "@/hooks/filters/useFilterLabels";
import type { EntitySearchNode } from "@/schemas/entities";
import type {
  CampaignAdminEntityConfigDetail,
  CampaignAdminUpdateEntityConfigBody,
} from "@/features/campaigns/buget/admin/types";

type CampaignAdminEntityConfigSheetProps = {
  readonly open: boolean;
  readonly entityCui: string | null;
  readonly entity: CampaignAdminEntityConfigDetail | null;
  readonly createMode?: boolean;
  readonly isLoading: boolean;
  readonly errorMessage?: string | null;
  readonly submitErrorMessage?: string | null;
  readonly isSubmitting: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onEntitySelect?: (entity: EntitySearchNode) => void;
  readonly onSubmit: (
    body: CampaignAdminUpdateEntityConfigBody,
  ) => Promise<void> | void;
};

type CampaignAdminEntityConfigEditorProps = {
  readonly entityCui: string | null;
  readonly entity: CampaignAdminEntityConfigDetail | null;
  readonly createMode?: boolean;
  readonly isLoading: boolean;
  readonly errorMessage?: string | null;
  readonly submitErrorMessage?: string | null;
  readonly isSubmitting: boolean;
  readonly onEntitySelect?: (entity: EntitySearchNode) => void;
  readonly onSubmit: (
    body: CampaignAdminUpdateEntityConfigBody,
  ) => Promise<void> | void;
  readonly layout?: "sheet" | "inline";
};

function isValidDateInput(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

export function CampaignAdminEntityConfigEditor({
  entityCui,
  entity,
  createMode = false,
  isLoading,
  errorMessage,
  submitErrorMessage,
  isSubmitting,
  onEntitySelect,
  onSubmit,
  layout = "inline",
}: CampaignAdminEntityConfigEditorProps) {
  const [budgetPublicationDate, setBudgetPublicationDate] = useState("");
  const [officialBudgetUrl, setOfficialBudgetUrl] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const entityLabelStore = useEntityLabel(entityCui ? [entityCui] : []);

  useEffect(() => {
    setBudgetPublicationDate(entity?.values.budgetPublicationDate ?? "");
    setOfficialBudgetUrl(entity?.values.officialBudgetUrl ?? "");
    setClientError(null);
  }, [entity?.entityCui, entity?.values.budgetPublicationDate, entity?.values.officialBudgetUrl]);

  const effectiveErrorMessage = clientError ?? submitErrorMessage ?? errorMessage ?? null;
  const resolvedEntityName = useMemo(() => {
    const directName = entity?.entityName?.trim();
    if (directName && directName.length > 0) {
      return directName;
    }

    if (!entityCui) {
      return null;
    }

    const cachedLabel = entityLabelStore.map(entityCui);
    return cachedLabel.startsWith("id::") ? null : cachedLabel;
  }, [entity?.entityName, entityCui, entityLabelStore]);
  const helperText = useMemo(
    () =>
      createMode && entity?.configured
        ? t`A config already exists for this entity. Saving will update the existing record.`
        : entity?.configured
        ? t`Save sends a full replacement with optimistic concurrency protection.`
        : t`This entity is currently unconfigured. Saving will create the first stored config row.`,
    [createMode, entity?.configured],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextBudgetPublicationDate = budgetPublicationDate.trim();
    const nextOfficialBudgetUrl = officialBudgetUrl.trim();

    if (
      nextBudgetPublicationDate.length > 0 &&
      !isValidDateInput(nextBudgetPublicationDate)
    ) {
      setClientError(t`Budget publication date must use YYYY-MM-DD.`);
      return;
    }

    if (
      nextOfficialBudgetUrl.length > 0 &&
      !isValidHttpUrl(nextOfficialBudgetUrl)
    ) {
      setClientError(t`Official budget URL must be an absolute http(s) URL.`);
      return;
    }

    if (
      nextBudgetPublicationDate.length === 0 &&
      nextOfficialBudgetUrl.length === 0
    ) {
      setClientError(t`At least one config value is required.`);
      return;
    }

    setClientError(null);
    await onSubmit({
      expectedUpdatedAt: entity?.updatedAt ?? null,
      values: {
        budgetPublicationDate: nextBudgetPublicationDate || null,
        officialBudgetUrl: nextOfficialBudgetUrl || null,
      },
    });
  };

  const content = (
    <div className={layout === "sheet" ? "space-y-6 py-6" : "space-y-6"}>
      {createMode ? (
        <section className="space-y-3">
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-foreground">
              {t`Choose entity`}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t`Search for a UAT to create a new config. If a config already exists, the panel will load it for editing.`}
            </p>
          </div>
          <EntitySearchInput
            className="max-w-none pt-0 mx-0"
            placeholder={t`Search UAT by name or CUI...`}
            selectionBehavior="callback-only"
            entitySearchFilter={{
              isUat: true,
              excludeCounty: true,
            }}
            onSelect={(selectedEntity) => {
              entityLabelStore.add([
                {
                  id: selectedEntity.cui,
                  label: selectedEntity.name,
                },
              ]);
              onEntitySelect?.(selectedEntity);
            }}
          />

          {entityCui ? (
            <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {t`Selected UAT`}
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {resolvedEntityName ?? t`Loading entity name…`}
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {entityCui}
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : effectiveErrorMessage && entity === null ? (
        <Alert variant="destructive">
          <AlertTitle>{t`Failed to load entity config`}</AlertTitle>
          <AlertDescription>{effectiveErrorMessage}</AlertDescription>
        </Alert>
      ) : entityCui === null ? (
        <Alert>
          <AlertTitle>{t`No entity selected`}</AlertTitle>
          <AlertDescription>
            {createMode
              ? t`Use the search above to choose an entity for the new config.`
              : t`Open a configured row or enter a CUI to load the config editor.`}
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {createMode && entity?.configured ? (
            <Alert>
              <AlertTitle>{t`Config already exists`}</AlertTitle>
              <AlertDescription>
                {t`This entity already has a saved config. You can update it here instead of creating a duplicate.`}
              </AlertDescription>
            </Alert>
          ) : null}

          <section className="space-y-3">
            <dl className="grid gap-3 rounded-xl border border-border/60 bg-background/60 p-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  {t`Entity CUI`}
                </dt>
                <dd className="mt-1 font-mono text-sm text-foreground">
                  {entity?.entityCui ?? entityCui}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  {t`Configured`}
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {entity?.configured ? t`Yes` : t`No`}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  {t`Entity name`}
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {resolvedEntityName ?? t`Unavailable`}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  {t`Updated at`}
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {entity?.updatedAt ?? t`Unavailable`}
                </dd>
              </div>
            </dl>
          </section>

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            {effectiveErrorMessage ? (
              <Alert variant="destructive">
                <AlertTitle>{t`Unable to save entity config`}</AlertTitle>
                <AlertDescription>{effectiveErrorMessage}</AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor={`entity-config-budget-date-${entityCui}`}>
                {t`Budget publication date`}
              </Label>
              <Input
                id={`entity-config-budget-date-${entityCui}`}
                type="date"
                value={budgetPublicationDate}
                onChange={(event) => {
                  setBudgetPublicationDate(event.target.value);
                  if (clientError !== null) {
                    setClientError(null);
                  }
                }}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`entity-config-url-${entityCui}`}>
                {t`Official budget URL`}
              </Label>
              <Input
                id={`entity-config-url-${entityCui}`}
                type="url"
                value={officialBudgetUrl}
                onChange={(event) => {
                  setOfficialBudgetUrl(event.target.value);
                  if (clientError !== null) {
                    setClientError(null);
                  }
                }}
                placeholder="https://"
                disabled={isSubmitting}
              />
            </div>

            <div className="flex items-center gap-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t`Saving…` : t`Save config`}
              </Button>
              <p className="text-xs text-muted-foreground">{helperText}</p>
            </div>
          </form>
        </>
      )}
    </div>
  );

  if (layout === "inline") {
    return content;
  }

  return content;
}

export function CampaignAdminEntityConfigSheet({
  open,
  entityCui,
  entity,
  createMode = false,
  isLoading,
  errorMessage,
  submitErrorMessage,
  isSubmitting,
  onOpenChange,
  onEntitySelect,
  onSubmit,
}: CampaignAdminEntityConfigSheetProps) {
  const entityLabelStore = useEntityLabel(entityCui ? [entityCui] : []);
  const resolvedEntityName = useMemo(() => {
    const directName = entity?.entityName?.trim();
    if (directName && directName.length > 0) {
      return directName;
    }

    if (!entityCui) {
      return null;
    }

    const cachedLabel = entityLabelStore.map(entityCui);
    return cachedLabel.startsWith("id::") ? null : cachedLabel;
  }, [entity?.entityName, entityCui, entityLabelStore]);
  const entityTitle =
    createMode && entityCui === null
      ? t`Create entity config`
      : resolvedEntityName || entityCui || t`Entity config`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader className="space-y-2 border-b border-border/60 pb-4">
          <SheetTitle>{entityTitle}</SheetTitle>
          <SheetDescription>
            {t`Edit the campaign entity config for this municipality.`}
          </SheetDescription>
        </SheetHeader>

        <CampaignAdminEntityConfigEditor
          layout="sheet"
          entityCui={entityCui}
          entity={entity}
          createMode={createMode}
          isLoading={isLoading}
          errorMessage={errorMessage}
          submitErrorMessage={submitErrorMessage}
          isSubmitting={isSubmitting}
          onEntitySelect={onEntitySelect}
          onSubmit={onSubmit}
        />
      </SheetContent>
    </Sheet>
  );
}
