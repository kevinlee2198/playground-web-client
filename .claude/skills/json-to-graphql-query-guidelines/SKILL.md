---
name: json-to-graphql-query-guidelines
description: Use when writing a graphql query/mutation/subscription in this project
---

# JSON-to-GraphQL-Query Best Practice

Guidelines on how to use the `json-to-graphql-query` library to create a GraphQL query in this project

## Core Workflow

1. **Domain modeling** - Map business domains to GraphQL type system
2. **Schema design** - Create types, interfaces, unions with federation directives
3. **Resolver implementation** - Write efficient resolvers with DataLoader patterns
4. **Security** - Add query complexity limits, depth limiting, field-level auth
5. **Optimization** - Performance tune with caching, persisted queries, monitoring

## Reference Guide

Load detailed guidance based on context:

| Topic          | Reference             | Load When                                     |
| -------------- | --------------------- | --------------------------------------------- |
| Usage examples | `references/usage.md` | Types, interfaces, unions, enums, input types |

## Key Principles

- Follow best practices in the usage
- Note how the library differs from the standard graphql - especially when querying with multiple inline fragments
