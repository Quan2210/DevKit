import { Link } from "react-router";
import { useT } from "../i18n/useT";
import { notFoundMeta } from "../lib/seo";

export const meta = () => notFoundMeta();

export default function NotFound() {
  const t = useT();
  return (
    <div className="mx-auto w-full max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">{t("notFound.title")}</h1>
      <p>{t("notFound.body")}</p>
      <Link to="/" className="inline-flex min-h-9 items-center font-medium text-primary underline">
        {t("notFound.home")}
      </Link>
    </div>
  );
}
