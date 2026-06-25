import { createClient } from "@supabase/supabase-js";

const rawUrl = (import.meta as any).env?.VITE_SUPABASE_URL || "";
const rawKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "";

const supabaseUrl = typeof rawUrl === "string" ? rawUrl.trim() : "";
const supabaseAnonKey = typeof rawKey === "string" ? rawKey.trim() : "";

const isValidUrl = (url: string) => {
  try {
    return /^https?:\/\/\S+$/.test(url) && !url.includes("ENTER_YOUR");
  } catch {
    return false;
  }
};

let supabaseClient: any = null;

if (isValidUrl(supabaseUrl) && supabaseAnonKey && !supabaseAnonKey.includes("ENTER_YOUR")) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    console.log("[Supabase] Client initialized successfully.");
  } catch (err) {
    console.error("[Supabase] Failed to initialize Supabase client:", err);
  }
} else {
  console.warn("[Supabase] Credentials are missing or invalid. RepoSense is falling back to local-only state.");
}

const createMockClient = () => {
  const handler: ProxyHandler<any> = {
    get(target, prop) {
      if (prop === "then") {
        return typeof target.then === "function" ? target.then.bind(target) : undefined;
      }
      if (prop === "onAuthStateChange") {
        return () => ({ data: { subscription: { unsubscribe: () => {} } } });
      }
      if (prop === "getSession") {
        return () => Promise.resolve({ data: { session: null }, error: null });
      }
      
      const nextTarget = () => {};
      const promise = Promise.resolve({ data: null, error: null });
      Object.assign(nextTarget, promise);
      (nextTarget as any).then = promise.then.bind(promise);
      
      return new Proxy(nextTarget, handler);
    },
    apply(target, thisArg, argList) {
      const promise = Promise.resolve({ data: null, error: null });
      const dummyFn = () => {};
      Object.assign(dummyFn, promise);
      (dummyFn as any).then = promise.then.bind(promise);
      return new Proxy(dummyFn, handler);
    }
  };
  return new Proxy({}, handler);
};

export const supabase = supabaseClient || createMockClient();
