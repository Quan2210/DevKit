import { useMemo, useState } from "react";
import { Button } from "../../components/common/Button";
import { CopyButton } from "../../components/common/CopyButton";
import { ErrorBanner } from "../../components/common/ErrorBanner";
import { Notice } from "../../components/common/Notice";
import { Panel } from "../../components/common/Panel";
import { StatusBadge } from "../../components/common/StatusBadge";
import { Textarea } from "../../components/common/Input";
import { UndoBar } from "../../components/common/UndoBar";
import { CodeEditor } from "../../components/editors/CodeEditor";
import { ToolShell } from "../../components/layout/ToolShell";
import { useNow } from "../../hooks/useNow";
import { getGuide } from "../../i18n";
import { formatDateTime, formatRelative } from "../../i18n/format";
import { useT } from "../../i18n/useT";
import { getTool } from "../../registry/tools.meta";
import { decodeJwt, describeTimes, type TimeClaim } from "./core/jwt";
import { SAMPLE_TOKEN } from "./sample";

const CLAIM_LABEL = {
  iat: "jwt.claim.iat",
  nbf: "jwt.claim.nbf",
  exp: "jwt.claim.exp",
} as const satisfies Record<TimeClaim, string>;

export function JwtDecoder() {
  const t = useT();
  const tool = getTool("jwt");
  const [token, setToken] = useState("");
  const [cleared, setCleared] = useState<string | null>(null);
  const now = useNow();

  const blank = token.trim() === "";
  const decoded = useMemo(() => (blank ? null : decodeJwt(token)), [blank, token]);
  const times = useMemo(
    () => (decoded?.ok ? describeTimes(decoded.value.payload, Math.floor(now / 1000)) : null),
    [decoded, now],
  );
  const error = decoded && !decoded.ok ? decoded.error : null;
  const value = decoded?.ok ? decoded.value : null;

  const clear = () => {
    if (token === "") return;
    setCleared(token);
    setToken("");
  };

  return (
    <ToolShell
      tool={tool}
      guide={getGuide("vi", tool.id)}
      toolbar={
        <>
          <Button variant="ghost" onClick={() => setToken(SAMPLE_TOKEN)}>
            {t("action.sample")}
          </Button>
          <Button variant="ghost" onClick={clear} disabled={token === ""}>
            {t("action.clear")}
          </Button>
        </>
      }
      notice={
        <div className="space-y-2">
          <Notice tone="warning">{t("jwt.warning")}</Notice>
          {error ? <ErrorBanner title={error.message} detail={error.detail} /> : null}
          {cleared !== null ? (
            <UndoBar
              message={t("undo.cleared")}
              onUndo={() => {
                setToken(cleared);
                setCleared(null);
              }}
              onExpire={() => setCleared(null)}
            />
          ) : null}
        </div>
      }
      status={
        value ? (
          <>
            <StatusBadge tone="info">{t("jwt.signatureNote")}</StatusBadge>
            <span>
              {`${t("jwt.signature")}: `}
              <code className="break-all">{value.signature || t("jwt.signatureEmpty")}</code>
            </span>
          </>
        ) : (
          <span className="text-text-muted">{t("jwt.empty")}</span>
        )
      }
    >
      <div className="space-y-4">
        <Textarea
          label={t("jwt.token")}
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder={t("jwt.placeholder")}
          rows={4}
          spellCheck={false}
          autoComplete="off"
          className="break-all"
        />

        {value ? (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel
                title={t("jwt.header")}
                actions={<CopyButton text={value.headerJson} label={t("jwt.copyHeader")} />}
                className="h-72"
              >
                <CodeEditor
                  language="json"
                  readOnly
                  value={value.headerJson}
                  ariaLabel={t("jwt.headerLabel")}
                />
              </Panel>
              <Panel
                title={t("jwt.payload")}
                actions={<CopyButton text={value.payloadJson} label={t("jwt.copyPayload")} />}
                className="h-72"
              >
                <CodeEditor
                  language="json"
                  readOnly
                  value={value.payloadJson}
                  ariaLabel={t("jwt.payloadLabel")}
                />
              </Panel>
            </div>

            {times ? (
              <Panel title={t("jwt.times")}>
                <div className="space-y-3 p-3 text-sm">
                  <div className="flex flex-wrap gap-2">
                    {times.expiry === "none" ? (
                      <StatusBadge tone="neutral">{t("jwt.noExp")}</StatusBadge>
                    ) : times.expiry === "expired" ? (
                      <StatusBadge tone="danger">
                        {t("jwt.expired", {
                          relative: formatRelative(times.expiresInSeconds ?? 0),
                        })}
                      </StatusBadge>
                    ) : (
                      <StatusBadge tone="success">
                        {t("jwt.valid", { relative: formatRelative(times.expiresInSeconds ?? 0) })}
                      </StatusBadge>
                    )}
                    {times.notYetValid ? (
                      <StatusBadge tone="warning">
                        {t("jwt.notYetValid", {
                          relative: formatRelative(times.validInSeconds ?? 0),
                        })}
                      </StatusBadge>
                    ) : null}
                  </div>
                  {times.invalidClaims.length > 0 ? (
                    <p className="text-warning-fg">
                      {t("jwt.invalidClaims", { claims: times.invalidClaims.join(", ") })}
                    </p>
                  ) : null}
                  {times.claims.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-text-muted">
                            <th scope="col" className="py-1 pr-4 font-medium" />
                            <th scope="col" className="py-1 pr-4 font-medium">
                              {t("jwt.local")}
                            </th>
                            <th scope="col" className="py-1 font-medium">
                              {t("jwt.utc")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {times.claims.map(({ claim, date }) => (
                            <tr key={claim} className="border-t border-border">
                              <th scope="row" className="py-1.5 pr-4 font-medium">
                                {t(CLAIM_LABEL[claim])}
                              </th>
                              <td className="py-1.5 pr-4 tabular-nums">{formatDateTime(date)}</td>
                              <td className="py-1.5 tabular-nums">
                                {formatDateTime(date, {
                                  dateStyle: "medium",
                                  timeStyle: "medium",
                                  timeZone: "UTC",
                                })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              </Panel>
            ) : null}
          </>
        ) : null}
      </div>
    </ToolShell>
  );
}
