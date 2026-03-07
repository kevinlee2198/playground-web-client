---
name: json-to-graphql-query-guidelines
description: How to build GraphQL queries and mutations in this project using json-to-graphql-query. Use whenever writing, modifying, or reviewing GraphQL query/mutation objects, or when working with graphql-request.ts or graphql-fragments.ts.
---

# json-to-graphql-query in This Project

This project builds GraphQL queries as plain JavaScript objects and converts them with `jsonToGraphQLQuery`. Queries are never written as raw strings.

## How Queries Are Sent

`src/lib/graphql-request.ts` provides four functions. Pass the inner query/mutation object — the wrapper (`{ query: ... }` or `{ mutation: ... }`) and `jsonToGraphQLQuery` conversion are handled internally.

```typescript
// Unauthenticated
const result = await query({ players: { id: true, firstName: true } });

// Authenticated (attaches Bearer token from Keycloak)
const result = await authQuery({ viewer: { id: true, email: true } });

// Mutations
const result = await mutate({ createPlayer: { __args: { input: { firstName: "Jo" } }, id: true } }, {});
const result = await authMutate({ updateGame: { __args: { input }, id: true } });
```

## Query Object Syntax

For the full API reference, read `references/usage.md` or use the `context7` MCP to query the `json-to-graphql-query` library docs.

Key patterns used in this project:

| Pattern | Syntax | Example |
|---|---|---|
| Select field | `fieldName: true` | `id: true` |
| Nested object | `fieldName: { ... }` | `player: { id: true, firstName: true }` |
| Arguments | `__args: { ... }` | `__args: { id: "abc" }` |
| Single inline fragment | `__on: { __typeName: "Type", ... }` | See below |
| Multiple inline fragments | `__on: [{ __typeName: "A", ... }, { __typeName: "B", ... }]` | See below |
| Spread fragments | `__all_on: ["FragA", "FragB"]` | Named fragment spreads |
| Aliases | `__aliasFor: "fieldName"` | Rename a field in the result |
| Enum values | `new EnumType("VALUE")` | `status: new EnumType("ACTIVE")` |
| Variables | `new VariableType("varName")` | `id: new VariableType("playerId")` |
| Variable declarations | `__variables: { varName: "Type!" }` | Top-level query variables |

## Inline Fragments (Important)

This is where `json-to-graphql-query` differs most from standard GraphQL syntax. The project uses inline fragments heavily for union/interface types.

**Single type:**
```typescript
__on: { __typeName: "ImageResource", width: true, height: true }
```

**Multiple types (use an array):**
```typescript
__on: [
  { __typeName: "TextChatMessage", content: true },
  { __typeName: "MediaChatMessage", caption: true, resource: resourceFragment },
]
```

The array form is essential when querying union types or interfaces with multiple concrete types. Using a single object when you need multiple fragments will silently drop all but the last one.

## Fragment Pattern

This project extracts reusable field selections into fragment objects in `src/lib/graphql-fragments.ts`. Spread them into queries to avoid duplication:

```typescript
import { participantNodeFragment, locationFragment } from "@/lib/graphql-fragments";

const result = await authQuery({
  game: {
    __args: { id: gameId },
    id: true,
    sportType: true,
    location: locationFragment,
    participants: { nodes: participantNodeFragment },
  },
});
```

When adding a new domain entity or query, check `graphql-fragments.ts` for existing fragments before writing field selections inline. Add new fragments there when a selection is reused across multiple queries.
