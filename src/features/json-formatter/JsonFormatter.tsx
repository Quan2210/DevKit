import { useMemo } from "react";
import { useT } from "../../i18n/useT";
import { getTool } from "../../registry/tools.meta";
import { DualPaneTool, type DataAdapter } from "../data-tools/DualPaneTool";
import { jsonToTree } from "../data-tools/model";
import { diffJson, treeMarks } from "./core/diff";
import { formatJson, minifyJson, parseJson } from "./core/json";
import { applyEdit, isLossy, parseEditedValue } from "./core/edit";
import { formatPath, offsetOfPath, parsePath, pathAtOffset } from "./core/path";
import { queryText } from "./core/query";

const adapter: DataAdapter = {
  language: "json",
  analyze: (text) => {
    const parsed = parseJson(text);
    return parsed.ok ? { ok: true, value: jsonToTree(parsed.value) } : parsed;
  },
  format: (text, indent, sort) => formatJson(text, indent, sort === "off" ? undefined : sort),
  minify: (text) => minifyJson(text),
  sortable: true,
  compare: (left, right) => {
    const a = parseJson(left);
    const b = parseJson(right);
    if (!a.ok || !b.ok) return null;
    const diffs = diffJson(a.value, b.value);
    const marks = treeMarks(diffs);
    return { count: diffs.length, items: diffs, left: marks.left, right: marks.right };
  },
  editor: {
    pathAtOffset,
    offsetOfPath,
    formatPath,
    parsePath,
    edit: { apply: applyEdit, parseValue: parseEditedValue, isLossy },
    query: { run: queryText, formatPath },
    accept: ".json,.txt,application/json,text/plain",
    maxBytes: 25 * 1024 * 1024,
    saveAs: {
      filename: "data.json",
      minFilename: "data.min.json",
      mime: "application/json;charset=utf-8",
    },
  },
};

export function JsonFormatter() {
  const t = useT();
  const labels = useMemo(
    () => ({
      leftEditor: t("json.inputLabel"),
      rightEditor: t("json.outputLabel"),
      placeholder: t("json.placeholder"),
      sample: t("json.sample"),
      location: (line: number, column: number) => t("json.location", { line, column }),
    }),
    [t],
  );
  return <DualPaneTool tool={getTool("json")} adapter={adapter} labels={labels} />;
}
