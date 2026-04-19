import { fireEvent, render, screen } from "@/test/test-utils";
import { describe, expect, it, vi } from "vitest";
import { CampaignAdminEntityConfigToolbar } from "./CampaignAdminEntityConfigToolbar";

describe("CampaignAdminEntityConfigToolbar", () => {
  it("applies entity config filters and converts date inputs to UTC boundaries", () => {
    const onApply = vi.fn();

    render(
      <CampaignAdminEntityConfigToolbar
        search={{ sortBy: "updatedAt", sortOrder: "desc", limit: 50 }}
        isLoading={false}
        onApply={onApply}
        onReset={vi.fn()}
        onRefresh={vi.fn()}
        onOpenEntity={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Entity CUI"), {
      target: { value: " 12345678 " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Advanced" }));
    fireEvent.change(screen.getByLabelText("Updated from"), {
      target: { value: "2026-04-10" },
    });
    fireEvent.change(screen.getByLabelText("Updated to"), {
      target: { value: "2026-04-12" },
    });
    const applyButtons = screen.getAllByRole("button", { name: "Apply filters" });
    fireEvent.click(applyButtons[applyButtons.length - 1]!);

    expect(onApply).toHaveBeenCalledWith({
      entityCui: "12345678",
      updatedAtFrom: "2026-04-10T00:00:00.000Z",
      updatedAtTo: "2026-04-12T23:59:59.999Z",
      sortBy: "updatedAt",
      sortOrder: "desc",
      limit: 50,
    });
  });

  it("resets filters while preserving sort and page size", () => {
    const onReset = vi.fn();

    render(
      <CampaignAdminEntityConfigToolbar
        search={{
          entityCui: "12345678",
          updatedAtFrom: "2026-04-10T00:00:00.000Z",
          sortBy: "entityCui",
          sortOrder: "asc",
          limit: 25,
        }}
        isLoading={false}
        onApply={vi.fn()}
        onReset={onReset}
        onRefresh={vi.fn()}
        onOpenEntity={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect(onReset).toHaveBeenCalledWith({
      sortBy: "entityCui",
      sortOrder: "asc",
      limit: 25,
    });
  });

  it("opens the create flow for a typed entity CUI", async () => {
    const onCreateEntity = vi.fn();

    render(
      <CampaignAdminEntityConfigToolbar
        search={{ sortBy: "updatedAt", sortOrder: "desc", limit: 50 }}
        isLoading={false}
        onApply={vi.fn()}
        onReset={vi.fn()}
        onRefresh={vi.fn()}
        onOpenEntity={vi.fn()}
        onCreateEntity={onCreateEntity}
      />,
    );

    fireEvent.pointerDown(screen.getByRole("button", { name: "Table actions" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Create config" }));

    expect(onCreateEntity).toHaveBeenCalledWith("", {
      entityCui: undefined,
      sortBy: "updatedAt",
      sortOrder: "desc",
      limit: 50,
      updatedAtFrom: undefined,
      updatedAtTo: undefined,
    });
  });
});
