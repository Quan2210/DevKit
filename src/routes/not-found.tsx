import { Link } from "react-router";

export function meta() {
  return [{ title: "Không tìm thấy trang - DevKit" }];
}

// Placeholder for the M0 scaffold; real copy comes from the i18n catalog in M1.
export default function NotFound() {
  return (
    <main>
      <h1>Không tìm thấy trang</h1>
      <Link to="/">Về trang chủ</Link>
    </main>
  );
}
