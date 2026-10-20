"use client";
import { useCallback, useEffect, useState } from "react";

export async function studentRequest(url, options) {
  const response = await fetch(url, { cache: "no-store", ...options });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || "Could not complete the request.");
    error.status = response.status;
    throw error;
  }
  return data;
}

export function useStudentData(url) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [version, setVersion] = useState(0);
  const retry = useCallback(() => setVersion((value) => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    studentRequest(url, { signal: controller.signal }).then(
      (data) => setState({ data, error: null, loading: false }),
      (error) => {
        if (!controller.signal.aborted) setState({ data: null, error, loading: false });
      },
    );
    return () => controller.abort();
  }, [url, version]);
  return { ...state, retry };
}
