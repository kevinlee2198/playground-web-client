import { test, expect } from "../fixtures/test-fixtures";
import { http, HttpResponse } from "msw";
import { mockGamesListResponse } from "../fixtures/mock-data/games";
import { mockMeResponse } from "../fixtures/mock-data/me";

test.describe("Discover Feed — browser geolocation", () => {
  test("browser-detected location updates URL, refetches with nearLocation, and shows 'Games near you'", async ({
    authenticatedPage,
    context,
    msw,
  }) => {
    // Capture every games-query input to verify nearLocation reaches the server
    const capturedInputs: string[] = [];

    msw.use(
      http.post("*/graphql", async ({ request }) => {
        const body = (await request.json()) as { query: string };
        if (/\bme\s*\{/.test(body.query)) {
          return HttpResponse.json(mockMeResponse());
        }
        if (/\bgames\s*[\(\{]/.test(body.query)) {
          const inputMatch = body.query.match(
            /games\s*\(\s*input:\s*(\{[^]*?\})\s*,/,
          );
          if (inputMatch) capturedInputs.push(inputMatch[1]);
          return HttpResponse.json(mockGamesListResponse());
        }
        return HttpResponse.json({ data: {} });
      }),
    );

    // Grant browser geolocation BEFORE navigating
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ latitude: 30.2672, longitude: -97.7431 });

    await authenticatedPage.goto("/en/games?tab=discover");

    // The useUserLocation hook writes lat/lng into the URL once detection
    // resolves — wait for that soft navigation before asserting.
    await authenticatedPage.waitForURL(/lat=.+lng=/);
    await authenticatedPage.waitForLoadState("networkidle");

    // 1. URL carries the detected coordinates (no `loc` because browser
    //    geolocation does not produce a place name).
    expect(authenticatedPage.url()).toMatch(/lat=30\./);
    expect(authenticatedPage.url()).toMatch(/lng=-97\./);
    expect(authenticatedPage.url()).not.toMatch(/[?&]loc=/);

    // 2. The refetched games query must carry nearLocation — the backend
    //    filter really is scoped to the 25-mile radius.
    const lastInput = capturedInputs[capturedInputs.length - 1] ?? "";
    expect(lastInput).toContain("nearLocation");
    expect(lastInput).toContain("latitude: 30.2672");
    expect(lastInput).toContain("longitude: -97.7431");

    // 3. Regression guard: the indicator must reflect that the filter is
    //    active. Before the fix it showed "Games everywhere" — keyed on
    //    locationName rather than hasLocation.
    const indicator = authenticatedPage
      .locator("text=/Games (everywhere|near)/")
      .first();
    await expect(indicator).toHaveText("Games near you");
    await expect(indicator).not.toHaveText(/Games everywhere/);

    // 4. The action button must say "Change" — the user has a location, they
    //    just don't have a place name for it.
    await expect(
      authenticatedPage.getByRole("button", { name: /change/i }),
    ).toBeVisible();
  });
});
