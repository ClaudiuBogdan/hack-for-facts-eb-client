import { fireEvent, render, screen, waitFor } from "@/test/test-utils";
import { describe, expect, it, vi } from "vitest";
import { CampaignAdminEntityConfigSheet } from "./CampaignAdminEntityConfigSheet";
import type { CampaignAdminEntityConfigDetail } from "@/features/campaigns/buget/admin/types";

vi.mock("@/components/entities/EntitySearch", () => ({
  EntitySearchInput: ({
    onSelect,
  }: {
    readonly onSelect?: (entity: {
      cui: string;
      name: string;
      entity_type: string;
      is_uat: boolean;
    }) => void;
  }) => (
    <button
      type="button"
      onClick={() =>
        onSelect?.({
          cui: "87654321",
          name: "Comuna Test",
          entity_type: "admin_municipality",
          is_uat: true,
        })
      }
    >
      Search entity
    </button>
  ),
}));

function createEntityDetail(
  overrides: Partial<CampaignAdminEntityConfigDetail> = {},
): CampaignAdminEntityConfigDetail {
  return {
    campaignKey: "funky",
    entityCui: "12345678",
    entityName: "Oras Test",
    configured: true,
    isConfigured: true,
    values: {
      budgetPublicationDate: "2026-03-15",
      officialBudgetUrl: "https://oras.test/buget.pdf",
    },
    updatedAt: "2026-04-19T08:00:00.000Z",
    updatedByUserId: "admin-user",
    ...overrides,
  };
}

describe("CampaignAdminEntityConfigSheet", () => {
  it("submits the edited config with optimistic concurrency metadata", async () => {
    const onSubmit = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);

    render(
      <CampaignAdminEntityConfigSheet
        open
        entityCui="12345678"
        entity={createEntityDetail()}
        isLoading={false}
        isSubmitting={false}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("Budget publication date"), {
      target: { value: "2026-04-20" },
    });
    fireEvent.change(screen.getByLabelText("Official budget URL"), {
      target: { value: "https://oras.test/updated.pdf" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save config" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        expectedUpdatedAt: "2026-04-19T08:00:00.000Z",
        values: {
          budgetPublicationDate: "2026-04-20",
          officialBudgetUrl: "https://oras.test/updated.pdf",
        },
      });
    });
  });

  it("validates empty and invalid values on the client before submitting", async () => {
    const onSubmit = vi.fn();

    render(
      <CampaignAdminEntityConfigSheet
        open
        entityCui="12345678"
        entity={createEntityDetail({
          configured: false,
          values: {
            budgetPublicationDate: null,
            officialBudgetUrl: null,
          },
          updatedAt: null,
        })}
        isLoading={false}
        isSubmitting={false}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save config" }));

    expect(
      await screen.findByText("At least one config value is required."),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Official budget URL"), {
      target: { value: "not-a-url" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save config" }));

    expect(
      await screen.findByText(
        "Official budget URL must be an absolute http(s) URL.",
      ),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("supports create mode entity selection and warns when config already exists", async () => {
    const onEntitySelect = vi.fn();

    render(
      <CampaignAdminEntityConfigSheet
        open
        entityCui="87654321"
        entity={createEntityDetail({
          entityCui: "87654321",
          entityName: "Comuna Test",
        })}
        createMode
        isLoading={false}
        isSubmitting={false}
        onOpenChange={vi.fn()}
        onEntitySelect={onEntitySelect}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Search entity" }));

    expect(onEntitySelect).toHaveBeenCalledWith({
      cui: "87654321",
      name: "Comuna Test",
      entity_type: "admin_municipality",
      is_uat: true,
    });
    expect(
      screen.getByText("Config already exists"),
    ).toBeInTheDocument();
  });
});
