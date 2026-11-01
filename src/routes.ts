import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";
import { routableTools } from "./registry/tools.meta";

export default [
  layout("components/layout/AppShellRoute.tsx", [
    index("routes/home.tsx"),
    ...routableTools().map((tool) => route(`tools/${tool.slug}`, tool.routeFile)),
    // Splat route: renders for any unknown URL. `/404` is prerendered and copied to 404.html.
    route("*", "routes/not-found.tsx"),
  ]),
] satisfies RouteConfig;
