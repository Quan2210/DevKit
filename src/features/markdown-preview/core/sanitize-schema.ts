import { defaultSchema, type Options } from "rehype-sanitize";

/**
 * Strict allowlist for rendered Markdown (docs/03 §3.4). Built on rehype-sanitize's GitHub-style
 * default, which already drops script, style, iframe, object, embed, form, svg and math, every
 * `on*` handler and the `style` attribute. On top of that:
 *  - links may only use http, https and mailto;
 *  - `src` keeps http, https and data so the image policy can decide (it only lets data: images
 *    of four raster types through, and blocks the rest unless the user opts in);
 *  - ids keep the default `user-content-` prefix so a heading id can never clobber a DOM global.
 */
export const sanitizeSchema: Options = {
  ...defaultSchema,
  protocols: {
    ...defaultSchema.protocols,
    href: ["http", "https", "mailto"],
    src: ["http", "https", "data"],
  },
};
