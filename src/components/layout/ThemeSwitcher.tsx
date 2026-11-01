import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import { useT } from "../../i18n/useT";
import type { Theme } from "../../lib/theme";
import { Segmented } from "../common/Segmented";

export function ThemeSwitcher() {
  const t = useT();
  const [theme, setTheme] = useTheme();
  const icon = "size-4";
  return (
    <Segmented<Theme>
      label={t("theme.label")}
      iconOnly
      value={theme}
      onChange={setTheme}
      options={[
        { value: "light", label: t("theme.light"), icon: <Sun aria-hidden className={icon} /> },
        { value: "dark", label: t("theme.dark"), icon: <Moon aria-hidden className={icon} /> },
        {
          value: "system",
          label: t("theme.system"),
          icon: <Monitor aria-hidden className={icon} />,
        },
      ]}
    />
  );
}
