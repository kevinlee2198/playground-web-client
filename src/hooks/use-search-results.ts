import { searchUsers } from "@/components/search/actions";
import { useDebounce } from "@/hooks/use-debounce";
import type { UserSearchEdge } from "@/lib/types/user";
import { useCallback, useEffect, useState, useTransition } from "react";

interface UseSearchResultsOptions {
  /** Raw (untrimmed) input value from the search field */
  inputValue: string;
  /** Debounce delay in milliseconds */
  delay?: number;
  /** Maximum number of results to fetch */
  limit?: number;
  /** Fallback error message when the server returns no error string */
  fallbackError: string;
}

interface UseSearchResultsReturn {
  debouncedValue: string;
  results: UserSearchEdge[];
  error: string | null;
  isPending: boolean;
  /** Re-fetch the current debounced query (useful for retry-on-error) */
  retry: () => void;
}

export function useSearchResults({
  inputValue,
  delay = 300,
  limit = 5,
  fallbackError,
}: UseSearchResultsOptions): UseSearchResultsReturn {
  const debouncedValue = useDebounce(inputValue.trim(), delay);

  const [results, setResults] = useState<UserSearchEdge[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const fetchResults = useCallback(
    (query: string) => {
      startTransition(async () => {
        const result = await searchUsers(query, limit);
        if (result.success) {
          setResults(result.edges ?? []);
          setError(null);
        } else {
          setResults([]);
          setError(result.error ?? fallbackError);
        }
      });
    },
    [limit, fallbackError],
  );

  // Clear results synchronously during render when the debounced query is cleared
  const [prevDebouncedValue, setPrevDebouncedValue] = useState(debouncedValue);
  if (prevDebouncedValue !== debouncedValue) {
    setPrevDebouncedValue(debouncedValue);
    if (!debouncedValue) {
      setResults([]);
      setError(null);
    }
  }

  // Fetch results when debounced value changes
  useEffect(() => {
    if (!debouncedValue) return;
    fetchResults(debouncedValue);
  }, [debouncedValue, fetchResults]);

  const retry = useCallback(() => {
    if (debouncedValue) {
      setError(null);
      fetchResults(debouncedValue);
    }
  }, [debouncedValue, fetchResults]);

  return { debouncedValue, results, error, isPending, retry };
}
