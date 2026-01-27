import Home from "@/app/[locale]/page";
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

// Example test - doesn't really work yet
test("Page", () => {
  render(<Home />);
  expect(screen.getByRole("heading", { level: 1, name: "Home" })).toBeDefined();
});
