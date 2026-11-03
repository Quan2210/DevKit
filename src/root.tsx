import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import { ToolErrorBoundary } from "./components/common/ToolErrorBoundary";
import "./styles/globals.css";

export const links = () => [
  { rel: "icon", type: "image/svg+xml", href: `${import.meta.env.BASE_URL}favicon.svg` },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        {/* Same-origin file keeps theme init out of the CSP hash list; BASE_URL keeps nested routes working. */}
        <script src={`${import.meta.env.BASE_URL}theme-init.js`} />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary() {
  return <ToolErrorBoundary />;
}
