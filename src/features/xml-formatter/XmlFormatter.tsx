import { useMemo } from "react";
import { Notice } from "../../components/common/Notice";
import { useT } from "../../i18n/useT";
import { getTool } from "../../registry/tools.meta";
import { DualPaneTool, type DataAdapter } from "../data-tools/DualPaneTool";
import { xmlToTree } from "../data-tools/model";
import {
  browserParser,
  declaredEncoding,
  formatXml,
  isUtf8,
  minifyXml,
  validateXml,
} from "./core/xml";

const adapter: DataAdapter = {
  language: "xml",
  analyze: (text) => {
    const doc = validateXml(text, browserParser());
    return doc.ok ? { ok: true, value: xmlToTree(doc.value.documentElement) } : doc;
  },
  format: (text, indent) => formatXml(text, indent, browserParser()),
  minify: (text) => minifyXml(text, browserParser()),
  download: { filename: "document.xml", mime: "application/xml;charset=utf-8" },
};

export function XmlFormatter() {
  const t = useT();
  const labels = useMemo(
    () => ({
      leftEditor: t("xml.inputLabel"),
      rightEditor: t("xml.outputLabel"),
      placeholder: t("xml.placeholder"),
      sample: t("xml.sample"),
      location: (line: number, column: number) => t("xml.location", { line, column }),
    }),
    [t],
  );
  return (
    <DualPaneTool
      tool={getTool("xml")}
      adapter={adapter}
      labels={labels}
      extraNotice={(texts) => {
        const encoding = texts.left.trim() === "" ? undefined : declaredEncoding(texts.left);
        return encoding !== undefined && !isUtf8(encoding) ? (
          <Notice tone="warning">{t("xml.encodingNotice", { encoding })}</Notice>
        ) : null;
      }}
    />
  );
}
