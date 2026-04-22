import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@/test/test-utils";
import { describe, expect, it, vi } from "vitest";
import { createTestQueryClient } from "@/test/test-utils";
import { CampaignAdminEntityConfigPasteDialog } from "./CampaignAdminEntityConfigPasteDialog";

const getCampaignAdminEntityConfigMock = vi.fn();
const updateCampaignAdminEntityConfigMock = vi.fn();

vi.mock("@/features/campaigns/buget/admin/api/campaign-admin-entity-config", () => ({
  getCampaignAdminEntityConfig: (...args: unknown[]) =>
    getCampaignAdminEntityConfigMock(...args),
  updateCampaignAdminEntityConfig: (...args: unknown[]) =>
    updateCampaignAdminEntityConfigMock(...args),
}));

function renderDialog(children: ReactNode) {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
  );
}

describe("CampaignAdminEntityConfigPasteDialog", () => {
  it("previews parsed rows and applies sequential updates", async () => {
    getCampaignAdminEntityConfigMock.mockResolvedValue({
      campaignKey: "funky",
      entityCui: "12345678",
      entityName: "Oras Test",
      configured: false,
      values: {
        budgetPublicationDate: null,
        officialBudgetUrl: null,
        public_debate: null,
      },
      updatedAt: null,
      updatedByUserId: null,
    });
    updateCampaignAdminEntityConfigMock.mockResolvedValue(undefined);
    const onApplied = vi.fn();

    renderDialog(
      <CampaignAdminEntityConfigPasteDialog
        open
        campaignKey="funky"
        onOpenChange={vi.fn()}
        onApplied={onApplied}
      />,
    );

    fireEvent.change(screen.getByLabelText("Paste rows"), {
      target: {
        value:
          "Entity CUI\tBudget Publication Date\tOfficial Budget URL\n"
          + "12345678\t2026-04-20\thttps://oras.test/final.pdf",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Preview pasted rows" }));

    expect(await screen.findByText("1 rows ready")).toBeInTheDocument();
    expect(screen.getByText("12345678")).toBeInTheDocument();
    expect(screen.getByText("Fetch before save")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Apply updates" }));

    await waitFor(() => {
      expect(getCampaignAdminEntityConfigMock).toHaveBeenCalledWith({
        campaignKey: "funky",
        entityCui: "12345678",
      });
      expect(updateCampaignAdminEntityConfigMock).toHaveBeenCalledWith({
        campaignKey: "funky",
        entityCui: "12345678",
        body: {
          expectedUpdatedAt: null,
          values: {
            budgetPublicationDate: "2026-04-20",
            officialBudgetUrl: "https://oras.test/final.pdf",
            public_debate: null,
          },
        },
      });
    });

    expect(await screen.findByText("1 of 1 rows saved")).toBeInTheDocument();
    expect(onApplied).toHaveBeenCalled();
  });

  it("shows import issues before apply", async () => {
    renderDialog(
      <CampaignAdminEntityConfigPasteDialog
        open
        campaignKey="funky"
        onOpenChange={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Paste rows"), {
      target: {
        value:
          "Entity CUI\tBudget Publication Date\tOfficial Budget URL\n"
          + "12345678\t2026/04/20\tftp://oras.test/bad.pdf",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Preview pasted rows" }));

    expect(await screen.findByText("Import issues")).toBeInTheDocument();
    expect(screen.getByText(/Invalid budget publication date/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply updates" })).toBeDisabled();
  });

  it("preserves existing public debate config when pasted rows use legacy headers", async () => {
    getCampaignAdminEntityConfigMock.mockResolvedValue({
      campaignKey: "funky",
      entityCui: "12345678",
      entityName: "Oras Test",
      configured: true,
      values: {
        budgetPublicationDate: "2026-03-20",
        officialBudgetUrl: "https://oras.test/original.pdf",
        public_debate: {
          date: "2026-05-10",
          time: "18:00",
          location: "Council Hall",
          announcement_link: "https://oras.test/public-debate",
          online_participation_link: "https://oras.test/public-debate/live",
          description: "Budget discussion",
        },
      },
      updatedAt: "2026-04-18T09:00:00.000Z",
      updatedByUserId: "admin-1",
    });
    updateCampaignAdminEntityConfigMock.mockResolvedValue(undefined);

    renderDialog(
      <CampaignAdminEntityConfigPasteDialog
        open
        campaignKey="funky"
        onOpenChange={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Paste rows"), {
      target: {
        value:
          "Entity CUI\tBudget Publication Date\tOfficial Budget URL\tUpdated At\n"
          + "12345678\t2026-04-20\thttps://oras.test/final.pdf\t2026-04-18T09:00:00.000Z",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Preview pasted rows" }));
    expect(await screen.findByText("1 rows ready")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Apply updates" }));

    await waitFor(() => {
      expect(getCampaignAdminEntityConfigMock).toHaveBeenCalledWith({
        campaignKey: "funky",
        entityCui: "12345678",
      });
      expect(updateCampaignAdminEntityConfigMock).toHaveBeenCalledWith({
        campaignKey: "funky",
        entityCui: "12345678",
        body: {
          expectedUpdatedAt: "2026-04-18T09:00:00.000Z",
          values: {
            budgetPublicationDate: "2026-04-20",
            officialBudgetUrl: "https://oras.test/final.pdf",
            public_debate: {
              date: "2026-05-10",
              time: "18:00",
              location: "Council Hall",
              announcement_link: "https://oras.test/public-debate",
              online_participation_link: "https://oras.test/public-debate/live",
              description: "Budget discussion",
            },
          },
        },
      });
    });
  });
});
