import { t } from "./index";

/** Translation function for components. Single locale in v1, so it is a stable module-level function. */
export function useT(): typeof t {
  return t;
}
