// Shared test fixtures for unit tests that load route handlers or modules that
// talk to Supabase, Next.js or Gemini. Importing this file:
//  - maps "@/..." imports to the project root (like jsconfig.json does)
//  - replaces @/lib/supabase/server and @/lib/supabase/client with the fake
//    database from createDb() (set with useDb)
//  - replaces next/server, @google/genai and @supabase/ssr with small fakes
//    controlled through globalThis (see fakeGemini and fakeSsr)
// Not a test file itself (no ".test." in the name), so `npm test` skips it.
import { registerHooks } from "node:module";

const root = new URL("../../", import.meta.url);
const MOCKS = {
  "@/lib/supabase/server": "export async function createClient() { return globalThis.__testDb; }",
  "@/lib/supabase/client": "export function createClient() { return globalThis.__testDb; }",
  "@/lib/supabase/admin": "export function createAdminClient() { return globalThis.__testDb; }",
  "next/server": `
    export const NextResponse = {
      json: (body, init) => Response.json(body, init),
      next: () => {
        const response = new Response(null);
        response.cookies = { items: [], set(name, value, options) { this.items.push({ name, value, options }); } };
        return response;
      },
    };`,
  "@google/genai": `
    export class GoogleGenAI {
      constructor(options) {
        this.options = options;
        this.models = { generateContent: (request) => globalThis.__gemini(request, options) };
      }
    }`,
  "@supabase/ssr": "export function createServerClient(...args) { return globalThis.__ssr(...args); }",
  "@supabase/supabase-js": "export function createClient() { return globalThis.__testDb; }",
};

registerHooks({
  resolve(specifier, context, next) {
    if (specifier in MOCKS) return { url: `mock:${specifier}`, shortCircuit: true };
    if (specifier.startsWith("@/")) return next(new URL(`${specifier.slice(2)}.js`, root).href, context);
    if (specifier.startsWith(".") && !/\.m?js$/.test(specifier) && /\/(lib|app)\//.test(context.parentURL ?? ""))
      return next(`${specifier}.js`, context);
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith("mock:")) return { format: "module", source: MOCKS[url.slice(5)], shortCircuit: true };
    return next(url, context);
  },
});

// Gemini fake: `handler(request)` returns { text } or throws.
export function fakeGemini(handler) {
  const calls = [];
  globalThis.__gemini = async (request, options) => {
    calls.push({ request, options });
    return handler(request, calls.length);
  };
  return calls;
}

export function fakeSsr(factory) {
  globalThis.__ssr = factory;
}

// An error like the ones the Gemini SDK throws.
export function apiError(status, message = "Gemini error") {
  return Object.assign(new Error(message), { status });
}

// A small in-memory stand-in for the Supabase client.
//  - tables: { name: [rows] }
//  - user: the signed-in user, or null
//  - fail: { table: ["read" | "insert" | "update" | "delete" | "upsert"] } makes those calls fail
//  - rpc: { name: (args, db) => data }
//  - files: { "bucket/path": "contents" } for storage downloads
export function createDb({ tables = {}, user = null, fail = {}, rpc = {}, files = {}, auth = {} } = {}) {
  const db = {
    tables, user, fail, files,
    calls: [],
    auth: {
      getUser: async () => ({ data: { user: db.user }, error: null }),
      ...auth,
    },
    async rpc(name, args) {
      db.calls.push({ rpc: name, args });
      if (db.fail.rpc?.includes(name)) return { data: null, error: { message: `${name} failed` } };
      if (!rpc[name]) return { data: null, error: { message: `no function ${name}` } };
      return { data: await rpc[name](args, db), error: null };
    },
    storage: {
      from: (bucket) => ({
        createSignedUrl: async (path) =>
          db.fail.storage ? { data: null, error: { message: "missing" } } : { data: { signedUrl: `https://files.test/${bucket}/${path}` }, error: null },
        createSignedUrls: async (paths) =>
          db.fail.storage
            ? { data: null, error: { message: "missing" } }
            : { data: paths.map((path) => ({ path, signedUrl: `https://files.test/${bucket}/${path}` })), error: null },
        download: async (path) => {
          const body = db.files[`${bucket}/${path}`];
          return body === undefined ? { data: null, error: { message: "not found" } } : { data: new Blob([body]), error: null };
        },
        remove: async () => ({ error: null }),
      }),
    },
    from(table) {
      const filters = [];
      let operation = "read", value, single = false, limit = Infinity, order = null;
      const query = {
        select() { return this; },
        eq(key, target) { filters.push((row) => row[key] === target); return this; },
        or(expression) {
          const alternatives = expression.split(",").map((part) => {
            const [key, operator, target] = part.split(".");
            return (row) => operator === "eq" && row[key] === target;
          });
          filters.push((row) => alternatives.some((matches) => matches(row)));
          return this;
        },
        neq(key, target) { filters.push((row) => row[key] !== target); return this; },
        gt(key, target) { filters.push((row) => row[key] > target); return this; },
        gte(key, target) { filters.push((row) => row[key] >= target); return this; },
        lt(key, target) { filters.push((row) => row[key] < target); return this; },
        lte(key, target) { filters.push((row) => row[key] <= target); return this; },
        in(key, targets) { filters.push((row) => targets.includes(row[key])); return this; },
        not(key, op, target) { filters.push((row) => (op === "is" ? row[key] !== target : true)); return this; },
        overlaps(key, targets) { filters.push((row) => (row[key] ?? []).some((item) => targets.includes(item))); return this; },
        order(key, options = {}) { order = { key, ascending: options.ascending !== false }; return this; },
        limit(count) { limit = count; return this; },
        maybeSingle() { single = true; return this; },
        single() { single = true; return this; },
        insert(input) { operation = "insert"; value = input; return this; },
        update(input) { operation = "update"; value = input; return this; },
        upsert(input) { operation = "upsert"; value = input; return this; },
        delete() { operation = "delete"; return this; },
        then(resolve, reject) {
          db.calls.push({ table, operation });
          if (db.fail[table]?.includes(operation))
            return Promise.resolve({ data: null, error: { message: `${table} ${operation} failed`, code: db.fail.code } }).then(resolve, reject);
          tables[table] ??= [];
          let rows;
          if (operation === "insert") {
            rows = [].concat(value).map((row, i) => ({ id: `new-${tables[table].length + i}`, ...row }));
            tables[table].push(...rows);
          } else if (operation === "upsert") {
            rows = [];
            for (const item of [].concat(value)) {
              const existing = tables[table].find((row) =>
                row.message_id === item.message_id && row.user_id === item.user_id
              );
              if (!existing) {
                const inserted = { id: `new-${tables[table].length}`, ...item };
                tables[table].push(inserted);
                rows.push(inserted);
              } else {
                rows.push(existing);
              }
            }
          } else {
            rows = tables[table].filter((row) => filters.every((filter) => filter(row)));
            if (operation === "update") rows.forEach((row) => Object.assign(row, value));
            if (operation === "delete") tables[table] = tables[table].filter((row) => !rows.includes(row));
            if (order) {
              const { key, ascending } = order;
              rows = [...rows].sort((a, b) => (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0) * (ascending ? 1 : -1));
            }
            rows = rows.slice(0, limit);
          }
          return Promise.resolve({ data: single ? rows[0] ?? null : rows, error: null }).then(resolve, reject);
        },
      };
      return query;
    },
  };
  globalThis.__testDb = db;
  return db;
}

export function request(method = "GET", body, { origin = "http://localhost", url = "http://localhost/api/test" } = {}) {
  return new Request(url, {
    method,
    headers: { Origin: origin, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

export const params = (values) => ({ params: Promise.resolve(values) });

// Runs fn with console.error / console.warn / console.log silenced.
export async function quietly(fn) {
  const saved = { error: console.error, warn: console.warn, log: console.log };
  console.error = console.warn = console.log = () => {};
  try {
    return await fn();
  } finally {
    Object.assign(console, saved);
  }
}