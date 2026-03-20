type Edge<T> = { node: T; cursor: string };

type Connection<T> = {
  edges: Edge<T>[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
};

export function buildConnection<T extends { id?: string }>(
  nodes: T[],
): Connection<T> {
  return {
    edges: nodes.map((node) => ({
      node,
      cursor: `cursor-${node.id ?? "1"}`,
    })),
    pageInfo: { hasNextPage: false, endCursor: null },
  };
}

export function emptyConnection(): Connection<never> {
  return {
    edges: [],
    pageInfo: { hasNextPage: false, endCursor: null },
  };
}
