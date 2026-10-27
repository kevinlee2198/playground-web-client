import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const { mockUpdatePreferences, mockToastAdd } = vi.hoisted(() => ({
  mockUpdatePreferences: vi.fn(),
  mockToastAdd: vi.fn(),
}));

vi.mock("@/app/[locale]/settings/actions", () => ({
  updatePreferences: mockUpdatePreferences,
}));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => `t:${key}`,
}));
vi.mock("@/components/ui/toast", () => ({
  toast: { add: mockToastAdd },
}));

import { GamesSettingsForm } from "@/app/[locale]/settings/games/games-settings-form";

function submitWithChange() {
  const { container } = render(
    <GamesSettingsForm measurementUnit="METRIC" preferredSports={[]} />,
  );
  fireEvent.click(screen.getAllByRole("button", { pressed: false })[0]);
  fireEvent.submit(container.querySelector("form")!);
}

describe("GamesSettingsForm server errors", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows an inline error on the field named by InvalidInputError", async () => {
    mockUpdatePreferences.mockResolvedValue({
      success: false,
      errorType: "InvalidInputError",
      message: "m",
      field: "measurementUnit",
      code: "NULL_NOT_ALLOWED",
    });

    submitWithChange();

    expect(await screen.findByText("t:invalidField")).toBeTruthy();
    expect(mockToastAdd).toHaveBeenCalledWith(
      expect.objectContaining({ title: "t:saveError" }),
    );
  });

  it("falls back to toast only when field is null", async () => {
    mockUpdatePreferences.mockResolvedValue({
      success: false,
      errorType: "GRAPHQL_ERROR",
      message: "m",
      field: null,
      code: null,
    });

    submitWithChange();

    await waitFor(() =>
      expect(mockToastAdd).toHaveBeenCalledWith(
        expect.objectContaining({ title: "t:saveError" }),
      ),
    );
    expect(screen.queryByText("t:invalidField")).toBeNull();
  });
});
