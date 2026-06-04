import { BASE_URL } from "./config.js";

const buildUrl = (path, params = {}) => {
  const url = new URL(BASE_URL + path, window.location.origin);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") {
      url.searchParams.append(k, v);
    }
  });
  return url.toString();
};

const injectProvider = (data) => {
  if (typeof data !== 'object' || data === null) return data;
  const defaultProvider = localStorage.getItem("nhcx_default_provider_id");
  if (defaultProvider && !data.provider_id) {
    return { ...data, provider_id: defaultProvider };
  }
  return data;
};

/** Wrapper around fetch — throws on non-2xx responses. */
export const http = {
  get: async (path, params = {}) => {
    try {
      const enrichedParams = injectProvider(params);
      const res = await fetch(buildUrl(path, enrichedParams), {
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        throw new Error(`GET ${path} failed: ${res.status} ${res.statusText}`);
      }
      return await res.json();
    } catch (err) {
      window.dispatchEvent(
        new CustomEvent("api-error", { detail: err.message }),
      );
      throw err;
    }
  },

  post: async (path, body = {}) => {
    try {
      const enrichedBody = injectProvider(body);
      const res = await fetch(BASE_URL + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(enrichedBody),
      });
      if (!res.ok) {
        throw new Error(`POST ${path} failed: ${res.status} ${res.statusText}`);
      }
      return await res.json();
    } catch (err) {
      window.dispatchEvent(
        new CustomEvent("api-error", { detail: err.message }),
      );
      throw err;
    }
  },

  patch: async (path, body = {}) => {
    try {
      const enrichedBody = injectProvider(body);
      const res = await fetch(BASE_URL + path, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(enrichedBody),
      });
      if (!res.ok) {
        throw new Error(
          `PATCH ${path} failed: ${res.status} ${res.statusText}`,
        );
      }
      return await res.json();
    } catch (err) {
      window.dispatchEvent(
        new CustomEvent("api-error", { detail: err.message }),
      );
      throw err;
    }
  },
};
