import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      "label": "Who can enter stats?",
      "open": "Open",
      "openDescription": "Any game participant can enter stats for anyone",
      "selfReport": "Self-report",
      "selfReportDescription": "Users can only enter their own stats",
      "managerOnly": "Manager only",
      "managerOnlyDescription": "Only the game organizer can enter stats",
    };
    return map[key] ?? key;
  },
}));

import { StatEntryModeRadioGroup } from "@/components/game/stat-entry-mode-radio-group";
import { StatEntryMode } from "@/lib/constants";

describe("StatEntryModeRadioGroup", () => {
  it("renders all options", () => {
    render(
      <StatEntryModeRadioGroup
        value={StatEntryMode.OPEN}
        onChange={vi.fn()}
        onBlur={vi.fn()}
      />,
    );
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("Self-report")).toBeInTheDocument();
    expect(screen.getByText("Manager only")).toBeInTheDocument();
  });

  it("renders descriptions for all options", () => {
    render(
      <StatEntryModeRadioGroup
        value={StatEntryMode.OPEN}
        onChange={vi.fn()}
        onBlur={vi.fn()}
      />,
    );
    expect(
      screen.getByText("Any game participant can enter stats for anyone"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Users can only enter their own stats"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Only the game organizer can enter stats"),
    ).toBeInTheDocument();
  });

  it("renders the legend label", () => {
    render(
      <StatEntryModeRadioGroup
        value={StatEntryMode.OPEN}
        onChange={vi.fn()}
        onBlur={vi.fn()}
      />,
    );
    expect(screen.getByText("Who can enter stats?")).toBeInTheDocument();
  });

  it("calls onChange when an option is clicked", () => {
    const onChange = vi.fn();
    render(
      <StatEntryModeRadioGroup
        value={StatEntryMode.OPEN}
        onChange={onChange}
        onBlur={vi.fn()}
      />,
    );
    const selfReportRadio = screen.getByRole("radio", { name: /self-report/i });
    fireEvent.click(selfReportRadio);
    expect(onChange).toHaveBeenCalledWith(StatEntryMode.SELF_REPORT);
  });

  it("marks the current value as checked", () => {
    render(
      <StatEntryModeRadioGroup
        value={StatEntryMode.SELF_REPORT}
        onChange={vi.fn()}
        onBlur={vi.fn()}
      />,
    );
    const selfReportRadio = screen.getByRole("radio", { name: /self-report/i });
    expect(selfReportRadio).toBeChecked();
    const openRadio = screen.getByRole("radio", { name: /open/i });
    expect(openRadio).not.toBeChecked();
  });

  it("disables all radios when disabled prop is true", () => {
    render(
      <StatEntryModeRadioGroup
        value={StatEntryMode.OPEN}
        onChange={vi.fn()}
        onBlur={vi.fn()}
        disabled
      />,
    );
    const radios = screen.getAllByRole("radio");
    for (const radio of radios) {
      expect(radio).toHaveAttribute("aria-disabled", "true");
    }
  });
});
