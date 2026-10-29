import { describe, expect, it } from "vitest";
import { jsonToGraphQLQuery } from "json-to-graphql-query";
import {
  authorizationErrorFragment,
  errorFragment,
  gameViewerCanFragment,
  invalidInputErrorFragment,
} from "@/lib/graphql-fragments";
import { validateOperation } from "../helpers/schema-contract";

describe("error fragments", () => {
  it("validate against the CreateInviteLinkResult union", () => {
    const errors = validateOperation("mutation", {
      createInviteLink: {
        __args: { input: { owner: { leagueId: "l1" } } },
        __typename: true,
        __on: [
          { __typeName: "CreateInviteLinkResponse", __typename: true },
          errorFragment,
          authorizationErrorFragment,
          invalidInputErrorFragment,
        ],
      },
    });
    expect(errors).toEqual([]);
  });

  it("aliases __typename as authorizationErrorType", () => {
    expect(
      jsonToGraphQLQuery({
        query: { x: { __on: [authorizationErrorFragment] } },
      }),
    ).toContain("... on AuthorizationError { authorizationErrorType: __typename }");
  });
});

describe("gameViewerCanFragment", () => {
  it("selects all 21 capability flags", () => {
    expect(Object.keys(gameViewerCanFragment).sort()).toEqual(
      [
        "update", "delete", "start", "end", "cancel", "finalizeResults",
        "unfinalizeResults", "manageEditors", "invite", "enterStats",
        "enterOwnStats", "join", "addParticipants", "addMedia", "moderateMedia",
        "reportResult", "confirmResult", "disputeResult", "voidResult",
        "reschedule", "forfeit",
      ].sort(),
    );
  });

  it("validates against the schema", () => {
    expect(
      validateOperation("query", {
        game: { __args: { id: "1" }, viewerCan: gameViewerCanFragment },
      }),
    ).toEqual([]);
  });
});
