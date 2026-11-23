/**
 * Public interfaces supporting R3.4.
 * @module components/student/useStudentData
 */
"use client";
import { useCallback, useEffect, useState } from "react";

/**
 * Fetch a student API response as JSON and throw the API error message for unsuccessful responses.
 * @function studentRequest
 * @memberof module:components/student/useStudentData
 * @static
 * @param {string} url - Student API endpoint URL.
 * @param {Object} options - Fetch options or function configuration.
 * @returns {Promise<Object>} The parsed JSON response payload.
 */
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

/**
 * Load student API data in a React hook and expose loading, error and refresh state.
 * @function useStudentData
 * @memberof module:components/student/useStudentData
 * @static
 * @param {string} url - Student API endpoint URL.
 * @returns {Object} The { data, error, loading, retry } state and reload callback.
 */
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
