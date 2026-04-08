import { Outlet } from "react-router-dom";
import TopNav from "./TopNav";

const userLinks = [
  { to: "/recargas", label: "Recargas" },
  { to: "/retiros", label: "Retiros" },
  { to: "/apuestas", label: "Apuestas" },
  { to: "/cuenta", label: "Mi cuenta" },
];

const adminLinks = [
  { to: "/admin-apuestas", label: "Admin-Apuestas" },
  { to: "/admin-recargas", label: "Admin-Recargas" },
  { to: "/admin-retiros", label: "Admin-Retiros" },
  { to: "/admin-micuenta", label: "Admin-MiCuenta" },
  { to: "/admin/configuracion-mod", label: "Config Mod" },
];

export function UserLayout() {
  return (
    <div className="page-shell">
      <TopNav links={userLinks} title="Tu Logo" rightSlot="Logo 2" />
      <main className="page-shell__content">
        <Outlet />
      </main>
    </div>
  );
}

export function AdminLayout() {
  return (
    <div className="page-shell">
      <TopNav links={adminLinks} title="Admin Logo" rightSlot="Admin" />
      <main className="page-shell__content">
        <Outlet />
      </main>
    </div>
  );
}
