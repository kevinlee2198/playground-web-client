import { execFileSync } from "node:child_process";
import { buildSchema, parse, validate } from "graphql";
import { jsonToGraphQLQuery } from "json-to-graphql-query";

// Built from the COMMITTED schema (never the working tree) so local runs and CI
// (actions/checkout has HEAD) validate against the same SDL.
const schema = buildSchema(
  execFileSync("git", ["show", "HEAD:schema.graphqls"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  }),
);

/** Validate a GraphQL document string against the schema. Returns error messages; [] = valid. */
export function validateDocument(document: string): string[] {
  return validate(schema, parse(document)).map((e) => e.message);
}

/** Build a document from a json-to-graphql-query selection (as sent by the request helpers) and validate it. */
export function validateOperation(
  kind: "query" | "mutation" | "subscription",
  selection: Record<string, unknown>,
): string[] {
  return validateDocument(jsonToGraphQLQuery({ [kind]: selection }));
}
