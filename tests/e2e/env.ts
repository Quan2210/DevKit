/** Where the staged build is served; override for another port or base path (for example VITE_BASE=/). */
export const ORIGIN = process.env.E2E_ORIGIN ?? "http://localhost:4173";
export const BASE_PATH = process.env.VITE_BASE ?? "/DevKit/";
export const BASE_URL = `${ORIGIN}${BASE_PATH}`;
