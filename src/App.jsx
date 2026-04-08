import { Routes, Route, Navigate } from "react-router-dom";

import Recargas from "./pages/Recargas";
import Retiros from "./pages/Retiros";
import Apuestas from "./pages/Apuestas";
import Cuenta from "./pages/Cuenta";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PanelRecargas from "./pages/PanelRecargas";
import PanelApuestas from "./pages/PanelApuestas";
import PanelRetiros from "./pages/PanelRetiros";
import PageStub from "./pages/PageStub";
import AdminModConfig from "./pages/AdminModConfig";

import PrivateRoute from "./components/PrivateRoute";
import RoleRoute from "./components/RoleRoute";
import { UserLayout, AdminLayout } from "./components/AppLayout";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        element={
          <PrivateRoute>
            <UserLayout />
          </PrivateRoute>
        }
      >
        <Route path="/home" element={<Navigate to="/apuestas" replace />} />
        <Route path="/recargas" element={<Recargas />} />
        <Route path="/retiros" element={<Retiros />} />
        <Route path="/apuestas" element={<Apuestas />} />
        <Route path="/cuenta" element={<Cuenta />} />
      </Route>

      <Route
        element={
          <RoleRoute allowedRoles={["admin", "mod"]}>
            <AdminLayout />
          </RoleRoute>
        }
      >
        <Route path="/admin-apuestas" element={<PanelApuestas />} />
        <Route path="/admin-recargas" element={<PanelRecargas />} />
        <Route path="/admin-retiros" element={<PanelRetiros />} />
        <Route
          path="/admin-micuenta"
          element={
            <PageStub
              title="Admin - Mi Cuenta"
              subtitle="Vista base para datos del administrador/moderador."
            />
          }
        />
      </Route>

      <Route
        path="/admin/configuracion-mod"
        element={
          <RoleRoute allowedRoles={["admin"]}>
            <AdminLayout />
          </RoleRoute>
        }
      >
        <Route index element={<AdminModConfig />} />
      </Route>
    </Routes>
  );
}

export default App;
