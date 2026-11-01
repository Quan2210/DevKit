import { Link } from "react-router";
import { useT } from "../../i18n/useT";
import { Button } from "./Button";

/**
 * Route-level error UI. Tool routes re-export it as `ErrorBoundary` so one failing tool
 * does not take down the rest of the app (SD-10). It never prints the error or any input.
 */
export function ToolErrorBoundary() {
  const t = useT();
  return (
    <main className="mx-auto max-w-xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">{t("error.title")}</h1>
      <p>{t("error.body")}</p>
      <div className="flex gap-2">
        <Button variant="primary" onClick={() => window.location.reload()}>
          {t("error.reload")}
        </Button>
        <Link
          to="/"
          className="inline-flex min-h-9 items-center px-3 text-sm font-medium text-primary underline"
        >
          {t("notFound.home")}
        </Link>
      </div>
    </main>
  );
}
