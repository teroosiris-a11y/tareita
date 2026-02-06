import React, { useEffect, useState } from "react";
import axios from "axios";
const API = import.meta.env.VITE_API_URL;




export default function PanelApuestas() {
  const [cases, setCases] = useState([]);

  // Crear caja
  const [newCase, setNewCase] = useState({
    name: "",
    price: "",
    image: null,
  });

  // Crear item normal
  const [itemData, setItemData] = useState({
    case_id: "",
    name: "",
    price: "",
    drop_chance: "",
    image: null,
  });

  // Crear especial
  const [specialData, setSpecialData] = useState({
    case_id: "",
    name: "",
    max_drops: "",
    special_chance: "",
    image: null,
  });

  // Asignar valores a especial
  const [assignData, setAssignData] = useState({
    id: "",
    total_value: "",
    duration_days: "",
  });

  
  // Entregar especial manualmente
  const [giveSpecial, setGiveSpecial] = useState({
    user_id: "",
    special_id: ""
  });



  // =====================
  // CARGAR CAJAS ACTIVAS
  // =====================
  const loadCases = async () => {
    try {
      const res = await axios.get(`${API}/cases`);
      setCases(res.data);
    } catch (err) {
      console.error(err);
      alert("Error cargando cajas");
    }
  };

  useEffect(() => {
    loadCases();
  }, []);

    // =======================
    // GESTIONAR APUESTAS
    // =======================
    const [apuestas, setApuestas] = useState([]); // Para manejar las apuestas
    const [selectedApuestaId, setSelectedApuestaId] = useState("");
    const [apostadores, setApostadores] = useState([]);
  
    // Crear nueva apuesta
    const [newApuesta, setNewApuesta] = useState({
      titulo: "",
      comentarios: "",
      probabilidad: "1.8",
    });
  
    // =======================
    // CARGAR APUESTAS ACTIVAS
    // =======================
    const loadApuestas = async () => {
      try {
        const res = await axios.get(`${API}/apuestas/listado`);
        setApuestas(res.data.apuestas ?? []);
      } catch (err) {
        console.error(err);
        alert("Error cargando apuestas");
      }
    };

   



  
    useEffect(() => {
      loadApuestas(); // Cargar apuestas al inicio
    }, []);
    
    const loadApostadores = async (apuestaId) => {
      if (!apuestaId) {
        setApostadores([]);
        return;
      }
      try {
        const res = await axios.get(
          `${API}/apuestas/${apuestaId}/apostadores`
        );
        setApostadores(res.data.apostadores ?? []);
      } catch (err) {
        console.error(err);
        alert("Error cargando apostadores");
      }
    };

    useEffect(() => {
      loadApostadores(selectedApuestaId);
    }, [selectedApuestaId]);
// =====================
    // CREAR APUESTA
    // =====================
    const handleCreateApuesta = async (e) => {
      e.preventDefault();
      try {
        const { titulo, comentarios, probabilidad } = newApuesta;
        const res = await axios.post(`${API}/apuestas/crear`, {
          titulo,
          comentarios,
          probabilidad,
        });
        alert("Apuesta creada");
        setNewApuesta({ titulo: "", comentarios: "", probabilidad: "1.8" });
        loadApuestas(); // Recargar las apuestas después de crear una nueva
      } catch (err) {
        console.error(err);
        alert("Error creando apuesta");
      }
    };


    const handleDeleteApuesta = async (id) => {
      if (!window.confirm("¿Seguro que quieres eliminar esta apuesta?")) return;

      try {
        await axios.delete(`${API}/apuestas/${id}`);
        alert("Apuesta eliminada");
        loadApuestas();
      } catch (err) {
        console.error(err);
        alert("Error eliminando apuesta");
      }
    };
    
    // =====================
    // PAUSAR APOSTAR
    // =====================
    const handlePausarApuestas = async () => {
      if (!selectedApuestaId) {
        alert("Selecciona una apuesta");
        return;
      }
      try {
        await axios.post(`${API}/apuestas/${selectedApuestaId}/pausar`);
        alert("Apuesta pausada");
        loadApuestas();
      } catch (err) {
        console.error(err);
        alert("Error pausando apuestas");
      }
    };
    
    // =====================
    // CONTINUAR APOSTAR
    // =====================
    const handleContinuarApuestas = async () => {
      if (!selectedApuestaId) {
        alert("Selecciona una apuesta");
        return;
      }
      try {
        await axios.post(`${API}/apuestas/${selectedApuestaId}/continuar`);
        alert("Apuesta reactivada");
        loadApuestas();
      } catch (err) {
        console.error(err);
        alert("Error reactivando apuestas");
      }
    };
    
    // =====================
    // CERRAR APOSTAR
    // =====================
    const handleCerrarApuestas = async () => {
      if (!selectedApuestaId) {
        alert("Selecciona una apuesta");
        return;
      }
      try {
        await axios.post(`${API}/apuestas/${selectedApuestaId}/cerrar`);
        alert("Apuesta cerrada");
        loadApuestas();
      } catch (err) {
        console.error(err);
        alert("Error cerrando apuestas");
      }
    };
    const handleMarcarGanador = async (equipoGanador) => {
      if (!selectedApuestaId) {
        alert("Selecciona una apuesta");
        return;
      }
      try {
        await axios.post(`${API}/apuestas/marcar-ganador`, {
          apuestaId: selectedApuestaId,
          equipoGanador,
        });
        alert("Resultado guardado");
        loadApuestas();
      } catch (err) {
        console.error(err);
        alert("Error marcando ganador");
      }
    };

    const handleRevertirResultado = async () => {
      if (!selectedApuestaId) {
        alert("Selecciona una apuesta");
        return;
      }
      try {
        await axios.post(`${API}/apuestas/revertir`, {
          apuestaId: selectedApuestaId,
        });
        alert("Resultado revertido");
        loadApuestas();
      } catch (err) {
        console.error(err);
        alert("Error revirtiendo resultado");
      }
    };

    const handleEliminarBet = async (row) => {
      if (!selectedApuestaId) {
        alert("Selecciona una apuesta");
        return;
      }
      if (
        !window.confirm(
          `¿Seguro que quieres eliminar la apuesta de ${row.username}?`
        )
      ) {
        return;
      }
      try {
        await axios.post(
          `${API}/apuestas/${selectedApuestaId}/apostadores/eliminar`,
          {
            userId: row.user_id,
            equipo: row.equipo,
          }
        );
        alert("Apuesta eliminada y saldo devuelto");
        loadApuestas();
        loadApostadores(selectedApuestaId);
      } catch (err) {
        console.error(err);
        alert("Error eliminando apuesta del usuario");
      }
    };

    const sanitizeFileSegment = (value) =>
      String(value ?? "")
        .trim()
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
        .replace(/\s+/g, "-")
        .toLowerCase();

    const escapeHtml = (value) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const escapeXml = (value) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

    const formatNumber = (value) =>
      Number.isFinite(value) ? Number(value).toFixed(2) : "";

    const buildCell = (value, style = "", colSpan = 0) =>
      `<td${colSpan ? ` colspan="${colSpan}"` : ""}${
        style ? ` style="${style}"` : ""
      }>${escapeHtml(value)}</td>`;

    const buildRow = (cells) => `<tr>${cells.join("")}</tr>`;

    const buildEquipoStyle = (equipo) => {
      if (equipo === "gana") {
        return "background-color:#c6efce;color:#006100;";
      }
      if (equipo === "pierde") {
        return "background-color:#ffc7ce;color:#9c0006;";
      }
      
      return "";
    };

    const buildApuestaExcelTable = (apuesta, apuestaApostadores) => {
      const rows = apuestaApostadores.map((row) => {
        const netaValue = apuesta?.ganador
          ? Number(calcularGananciaNeta(row, apuesta))
          : null;
        return {
          id: row.user_id,
          usuario: row.username,
          equipo: row.equipo,
          monto: Number(row.monto ?? 0),
          ganancia: Number(row.ganancia ?? 0),
          gananciaNeta: Number.isFinite(netaValue) ? netaValue : null,
        };
      });
      const totalGananciaNeta = rows.reduce((acc, row) => {
        if (!Number.isFinite(row.gananciaNeta)) {
          return acc;
        }
        return acc + row.gananciaNeta;
      }, 0);

      const headerRow = buildRow([
        "<th>ID</th>",
        "<th>Usuario</th>",
        "<th>Equipo</th>",
        "<th>Monto</th>",
        "<th>Ganancia</th>",
        "<th>Ganancia neta</th>",
      ]);
      const bodyRows =
        rows.length === 0
          ? buildRow([
              buildCell("No hay apostadores", "text-align:center;", 6),
            ])
          : rows.map((row) =>
              buildRow([
                buildCell(row.id),
                buildCell(row.usuario),
                buildCell(row.equipo, buildEquipoStyle(row.equipo)),
                buildCell(formatNumber(row.monto), "text-align:right;"),
                buildCell(formatNumber(row.ganancia), "text-align:right;"),
                buildCell(formatNumber(row.gananciaNeta), "text-align:right;"),
              ])
            );
      const totalRow = buildRow([
        buildCell(""),
        buildCell(""),
        buildCell(""),
        buildCell(""),
        buildCell("Total", "font-weight:bold;text-align:right;"),
        buildCell(
          formatNumber(totalGananciaNeta),
          "font-weight:bold;text-align:right;"
        ),
      ]);
      return `<table border="1" cellspacing="0" cellpadding="4">
  <thead>
    ${headerRow}
  </thead>
  <tbody>
    ${Array.isArray(bodyRows) ? bodyRows.join("") : bodyRows}
    ${rows.length > 0 ? totalRow : ""}
  </tbody>
</table>`;
    };

    const sanitizeSheetName = (value) =>
      String(value ?? "")
        .trim()
        .replace(/[:\\/?*\[\]]/g, "")
        .slice(0, 31);

    const ensureUniqueSheetNames = (names) => {
      const seen = new Map();
      return names.map((name) => {
        const base = name || "Apuesta";
        const count = seen.get(base) ?? 0;
        seen.set(base, count + 1);
        if (count === 0) {
          return base;
        }
        const suffix = ` (${count + 1})`;
        const trimmed = base.slice(0, 31 - suffix.length);
        return `${trimmed}${suffix}`;
      });
    };

    const handleDescargarExcel = () => {
      if (!selectedApuestaId) {
        alert("Selecciona una apuesta");
        return;
      }
      if (apostadores.length === 0) {
        alert("No hay apostadores para exportar");
        return;
      }

      
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
</head>
<body>
  ${buildApuestaExcelTable(selectedApuesta, apostadores)}
</body>
</html>`;
      const blob = new Blob([htmlContent], {
        type: "application/vnd.ms-excel;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStamp = new Date().toISOString().slice(0, 10);
      const apuestaNombre =
        sanitizeFileSegment(selectedApuesta?.titulo) || "apuesta";
      link.href = url;
      link.download = `resultados-${apuestaNombre}-${dateStamp}.xls`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    };

    const handleDescargarTodosExcel = async () => {
      if (apuestas.length === 0) {
        alert("No hay apuestas para exportar");
        return;
      }
      try {
        const apuestasData = await Promise.all(
          apuestas.map(async (apuesta) => {
            const res = await axios.get(
              `${API}/apuestas/${apuesta.id}/apostadores`
            );
            return {
              apuesta,
              apostadores: res.data.apostadores ?? [],
            };
          })
        );
        const rawNames = apuestasData.map((item, index) =>
          sanitizeSheetName(item.apuesta?.titulo || `Apuesta ${index + 1}`)
        );
        const uniqueNames = ensureUniqueSheetNames(rawNames);
        const sheets = apuestasData.map((item, index) => ({
          name: uniqueNames[index],
          table: buildApuestaExcelTable(item.apuesta, item.apostadores),
        }));
        const worksheetsXml = sheets
          .map(
            (sheet) => `
        <x:ExcelWorksheet>
          <x:Name>${escapeXml(sheet.name)}</x:Name>
          <x:WorksheetOptions>
            <x:DisplayGridlines/>
          </x:WorksheetOptions>
        </x:ExcelWorksheet>`
          )
          .join("");
        const htmlContent = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="UTF-8" />
  <!--[if gte mso 9]><xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        ${worksheetsXml}
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml><![endif]-->
</head>
<body>
  ${sheets.map((sheet) => sheet.table).join("<br/>")}
</body>
</html>`;
        const blob = new Blob([htmlContent], {
          type: "application/vnd.ms-excel;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const dateStamp = new Date().toISOString().slice(0, 10);
        link.href = url;
        link.download = `resultados-apuestas-${dateStamp}.xls`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error(err);
        alert("Error exportando apuestas");
      }
    };
  
  


  

  

  // =====================
  // CREAR CAJA
  // =====================
  const handleCreateCase = async (e) => {
    e.preventDefault();

    try {
      const formData = new FormData();
      formData.append("name", newCase.name);
      formData.append("price", newCase.price);
      if (newCase.image) formData.append("image", newCase.image);

      await axios.post(`${API}/cases`, formData);
      alert("Caja creada");
      loadCases();
    } catch (err) {
      console.error(err);
      alert("Error creando caja");
    }
  };

  /* eliminar caja */

  const deleteCase = async (id) => {
    if (!window.confirm("¿Seguro que quieres eliminar esta caja?")) return;

    try {
      await axios.delete(`${API}/cases/${id}`);
      alert("Caja eliminada");
      loadCases();
    } catch (err) {
      console.error(err);
      alert("Error eliminando caja");
    }
  };


  

  // =====================
  // CREAR ITEM NORMAL
  // =====================
  const handleCreateItem = async (e) => {
    e.preventDefault();

    if (itemData.drop_chance < 0 || itemData.drop_chance > 100) {
      alert("Probabilidad debe ser entre 0 y 100");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("name", itemData.name);
      formData.append("price", itemData.price);
      formData.append("drop_chance", itemData.drop_chance);
      if (itemData.image) formData.append("image", itemData.image);

      await axios.post(`${API}/cases/${itemData.case_id}/items`, formData);

      alert("Item creado");
    } catch (err) {
      console.error(err);
      alert("Error creando item");
    }
  };

  // =====================
  // CREAR ESPECIAL
  // =====================
  const handleCreateSpecial = async (e) => {
    e.preventDefault();

    if (specialData.special_chance < 0 || specialData.special_chance > 100) {
      alert("Probabilidad debe ser 0–100");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("name", specialData.name);
      formData.append("max_drops", specialData.max_drops);
      formData.append("special_chance", specialData.special_chance);
      if (specialData.image) formData.append("image", specialData.image);

      await axios.post(
        `${API}/cases/${specialData.case_id}/special`,
        formData
      );

      alert("Especial creado");
    } catch (err) {
      console.error(err);
      alert("Error creando especial");
    }
  };

  // =====================
  // ASIGNAR VALOR ESPECIAL
  // =====================
  const handleAssignSpecial = async (e) => {
    e.preventDefault();

    try {
      await axios.post(`${API}/special/${assignData.id}/set-value`, {
        total_value: assignData.total_value,
        duration_days: assignData.duration_days,
      });

      alert("Valor asignado");
    } catch (err) {
      console.error(err);
      alert("Error asignando valor");
    }
  };

    // =====================
  // ENTREGAR ESPECIAL MANUAL
  // =====================
  const handleGiveSpecial = async (e) => {
    e.preventDefault();

    try {
      await axios.post(`${API}/special/give`, {
        user_id: giveSpecial.user_id,
        special_id: giveSpecial.special_id
      });

      alert("Especial entregado correctamente");
    } catch (err) {
      console.error(err);

      if (err.response?.data?.error) {
        alert("Error: " + err.response.data.error);
      } else {
        alert("No se pudo entregar el especial");
      }
    }
  };

  

  // =====================
  // ESTILOS SIMPLES
  // =====================
  const box = {
    border: "1px solid #ccc",
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
  };
  
  const formatAmount = (value) => Number(value ?? 0).toFixed(2);
  const selectedApuesta = apuestas.find(
    (apuesta) => String(apuesta.id) === String(selectedApuestaId)
  );
  const calcularGananciaNatabet = (apuesta) => {
    if (!apuesta?.ganador) return null;
    const totalGana = Number(apuesta.total_gana ?? 0);
    const totalPierde = Number(apuesta.total_pierde ?? 0);
    const probabilidad = Number(apuesta.probabilidad ?? 1.8);
    const totalWinning =
      apuesta.ganador === "gana" ? totalGana : totalPierde;
    const totalLosing =
      apuesta.ganador === "gana" ? totalPierde : totalGana;
    const matchedAmount = Math.min(totalWinning, totalLosing);
    const payout =
      matchedAmount * probabilidad +
      Math.max(0, totalWinning - matchedAmount);
    const ganancia = totalGana + totalPierde - payout;
    return ganancia;
  };

  const calcularGananciaNeta = (row, apuesta) => {
    if (!apuesta?.ganador) return null;
    const totalGana = Number(apuesta.total_gana ?? 0);
    const totalPierde = Number(apuesta.total_pierde ?? 0);
    const probabilidad = Number(apuesta.probabilidad ?? 1.8);
    const totalWinning = apuesta.ganador === "gana" ? totalGana : totalPierde;
    const totalLosing = apuesta.ganador === "gana" ? totalPierde : totalGana;
    const matchedAmount = Math.min(totalWinning, totalLosing);
    if (matchedAmount <= 0) return 0;
    const sideTotal = row.equipo === "gana" ? totalGana : totalPierde;
    if (sideTotal <= 0) return 0;
    const matchedRatio = Math.min(1, matchedAmount / sideTotal);
    const matchedStake = Number(row.monto ?? 0) * matchedRatio;
    const houseRate = Math.max(probabilidad - 1, 0) / 2;
    const netProfit = matchedStake * houseRate;
    return Math.max(0, netProfit);
  };


  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>Panel de Apuestas</h1>

      {/* ============ PANEL APUESTAS ADMIN ============ */}

      <div style={box}>
        <h2>Crear Apuesta</h2>
      
        <form onSubmit={handleCreateApuesta}>
          <div>
            <label>Título:</label>
            <input
              type="text"
              value={newApuesta.titulo}
              onChange={(e) =>
                setNewApuesta({ ...newApuesta, titulo: e.target.value })
              }
            />
          </div>
      
          <div>
            <label>Comentarios:</label>
            <textarea
              value={newApuesta.comentarios}
              onChange={(e) =>
                setNewApuesta({ ...newApuesta, comentarios: e.target.value })
              }
            />
          </div>
      
          <div>
            <label>Probabilidad:</label>
            <input
              type="number"
              step="0.01"
              value={newApuesta.probabilidad}
              onChange={(e) =>
                setNewApuesta({ ...newApuesta, probabilidad: e.target.value })
              }
            />
          </div>
      
          <button type="submit">Crear apuesta</button>
        </form>
      </div>
      
      <div style={box}>
        <h2>Control de apuestas</h2>
        <div style={{ marginBottom: 10 }}>
          <label>Seleccionar apuesta:</label>
          <select
            value={selectedApuestaId}
            onChange={(e) => setSelectedApuestaId(e.target.value)}
          >
            <option value="">Seleccione...</option>
            {apuestas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.titulo}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={handlePausarApuestas}>Pausar</button>
          <button onClick={handleContinuarApuestas}>Continuar</button>
          <button onClick={handleCerrarApuestas}>Cerrar</button>
        </div>
      </div>
      
      <div style={box}>
        <h2>Resultados</h2>

        <div style={{ marginBottom: 10 }}>
          <label>Seleccionar apuesta:</label>
          <select
            value={selectedApuestaId}
            onChange={(e) => setSelectedApuestaId(e.target.value)}
          >
            <option value="">Seleccione...</option>
            {apuestas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.titulo}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => handleMarcarGanador("gana")}>
            Marcar Team Gana
          </button>
          <button onClick={() => handleMarcarGanador("pierde")}>
            Marcar Team Pierde
          </button>
          <button onClick={handleRevertirResultado}>Revertir</button>
          <button onClick={handleDescargarExcel}>
            Descargar Excel
          </button>
          <button onClick={handleDescargarTodosExcel}>
            Descargar todos los Excel
          </button>
        </div>

        <div style={{ marginTop: 20 }}>
          <h3>Apostadores</h3>
          {apostadores.length === 0 ? (
            <p>No hay apuestas registradas.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>ID</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Usuario</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Equipo</th>
                  <th style={{ textAlign: "right", borderBottom: "1px solid #ccc" }}>Monto</th>
                  <th style={{ textAlign: "right", borderBottom: "1px solid #ccc" }}>Ganancia</th>
                  <th style={{ textAlign: "right", borderBottom: "1px solid #ccc" }}>Ganancia neta</th>
                  <th style={{ textAlign: "center", borderBottom: "1px solid #ccc" }}>Eliminar Bet</th>
                </tr>
              </thead>
              <tbody>
                {apostadores.map((row) => (
                  <tr key={`${row.user_id}-${row.equipo}`}>
                    <td>{row.user_id}</td>
                    <td>{row.username}</td>
                    <td>{row.equipo}</td>
                    <td style={{ textAlign: "right" }}>{Number(row.monto).toFixed(2)}</td>
                    <td style={{ textAlign: "right" }}>{Number(row.ganancia).toFixed(2)}</td>
                    <td style={{ textAlign: "right" }}>
                      {selectedApuesta?.ganador
                        ? formatAmount(calcularGananciaNeta(row, selectedApuesta))
                        : "-"}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button onClick={() => handleEliminarBet(row)}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      
      
      <div style={box}>
        <h2>Apuestas activas</h2>
      
        {apuestas.length === 0 ? (
          <p>No hay apuestas</p>
        ) : (
          apuestas.map((a) => (
            <div key={a.id} style={{ marginBottom: 10 }}>
              <strong>{a.titulo}</strong>
              <p>{a.comentarios}</p>
              <p>x{a.probabilidad}</p>
              <p>Estado: {a.estado}</p>
              <p>Gana: {a.total_gana ?? 0} / Pierde: {a.total_pierde ?? 0}</p>
              <p>
                Ganancia Ñatabet:{" "}
                {a.ganador
                  ? formatAmount(calcularGananciaNatabet(a))
                  : "Pendiente"}
              </p>
              <button onClick={() => handleDeleteApuesta(a.id)}>
                Eliminar
              </button>
            </div>
          ))
        )}
      </div>


      

      {/* ================= CREAR CAJA ================= */}
      <div style={box}>
        <h2>Crear caja</h2>

        <form onSubmit={handleCreateCase}>
          <div>
            <label>Nombre:</label>
            <input
              type="text"
              value={newCase.name}
              onChange={(e) =>
                setNewCase({ ...newCase, name: e.target.value })
              }
            />
          </div>

          <div>
            <label>Precio:</label>
            <input
              type="number"
              step="0.01"
              value={newCase.price}
              onChange={(e) =>
                setNewCase({ ...newCase, price: e.target.value })
              }
            />
          </div>

          <div>
            <label>Imagen:</label>
            <input
              type="file"
              onChange={(e) =>
                setNewCase({ ...newCase, image: e.target.files[0] })
              }
            />
          </div>

          <button type="submit">Crear caja</button>
        </form>
      </div>

      {/* ================= LISTADO ================= */}
      <div style={box}>
        <h2>Cajas activas</h2>

        {cases.map((c) => (
          <div key={c.id} style={{ marginBottom: 5 }}>
            <strong>{c.name}</strong> — ${c.price}
            <button
              style={{ marginLeft: 10 }}
              onClick={() => deleteCase(c.id)}
            >
              Eliminar
            </button>
          </div>
        ))}

      </div>

      {/* ================= CREAR ITEM ================= */}
      <div style={box}>
        <h2>Agregar item a caja</h2>

        <form onSubmit={handleCreateItem}>
          <div>
            <label>Seleccionar caja:</label>
            <select
              value={itemData.case_id}
              onChange={(e) =>
                setItemData({ ...itemData, case_id: e.target.value })
              }
            >
              <option value="">Seleccione...</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Nombre del item:</label>
            <input
              type="text"
              onChange={(e) =>
                setItemData({ ...itemData, name: e.target.value })
              }
            />
          </div>

          <div>
            <label>Precio:</label>
            <input
              type="number"
              step="0.01"
              onChange={(e) =>
                setItemData({ ...itemData, price: e.target.value })
              }
            />
          </div>

          <div>
            <label>Probabilidad (0–100):</label>
            <input
              type="number"
              step="0.01"
              value={itemData.drop_chance}
              onChange={(e) =>
                setItemData({ ...itemData, drop_chance: e.target.value })
              }
            />
          </div>

          <div>
            <label>Imagen:</label>
            <input
              type="file"
              onChange={(e) =>
                setItemData({ ...itemData, image: e.target.files[0] })
              }
            />
          </div>

          <button type="submit">Crear item</button>
        </form>
      </div>

      {/* ================= CREAR ESPECIAL ================= */}
      <div style={box}>
        <h2>Crear especial</h2>

        <form onSubmit={handleCreateSpecial}>
          <div>
            <label>Seleccionar caja:</label>
            <select
              value={specialData.case_id}
              onChange={(e) =>
                setSpecialData({ ...specialData, case_id: e.target.value })
              }
            >
              <option value="">Seleccione...</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Nombre:</label>
            <input
              type="text"
              onChange={(e) =>
                setSpecialData({ ...specialData, name: e.target.value })
              }
            />
          </div>

          <div>
            <label>Max drops:</label>
            <input
              type="number"
              onChange={(e) =>
                setSpecialData({ ...specialData, max_drops: e.target.value })
              }
            />
          </div>

          <div>
            <label>Probabilidad (0–100):</label>
            <input
              type="number"
              step="0.01"
              onChange={(e) =>
                setSpecialData({
                  ...specialData,
                  special_chance: e.target.value,
                })
              }
            />
          </div>

          <div>
            <label>Imagen:</label>
            <input
              type="file"
              onChange={(e) =>
                setSpecialData({ ...specialData, image: e.target.files[0] })
              }
            />
          </div>

          <button type="submit">Crear especial</button>
        </form>
      </div>

      {/* ================= ASIGNAR VALOR ================= */}
      <div style={box}>
        <h2>Asignar valor a especial</h2>

        <form onSubmit={handleAssignSpecial}>
          <div>
            <label>ID especial:</label>
            <input
              type="number"
              step="0.01"
              onChange={(e) =>
                setAssignData({ ...assignData, id: e.target.value })
              }
            />
          </div>

          <div>
            <label>Valor total:</label>
            <input
              type="number"
              onChange={(e) =>
                setAssignData({ ...assignData, total_value: e.target.value })
              }
            />
          </div>

          <div>
            <label>Días duración:</label>
            <input
              type="number"
              onChange={(e) =>
                setAssignData({
                  ...assignData,
                  duration_days: e.target.value,
                })
              }
            />
          </div>

          <button type="submit">Asignar</button>
        </form>
      </div>
            {/* ================= ENTREGAR ESPECIAL MANUAL ================= */}
      <div style={box}>
        <h2>Entregar especial manualmente</h2>

        <form onSubmit={handleGiveSpecial}>
          <div>
            <label>ID Usuario:</label>
            <input
              type="number"
              onChange={(e) =>
                setGiveSpecial({ ...giveSpecial, user_id: e.target.value })
              }
            />
          </div>

          <div>
            <label>ID Especial:</label>
            <input
              type="number"
              onChange={(e) =>
                setGiveSpecial({ ...giveSpecial, special_id: e.target.value })
              }
            />
          </div>

          <button type="submit">Entregar especial</button>
        </form>
      </div>

    </div>
  );
}
