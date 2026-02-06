import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { getToken } from "../utils/auth";
import { useNavigate } from "react-router-dom";




const API = import.meta.env.VITE_API_URL;



export default function Apuestas() {
  const navigate = useNavigate();
  const [boxes, setBoxes] = useState([]);
  const [selectedBox, setSelectedBox] = useState(null);
  const [items, setItems] = useState([]);
  const [openResult, setOpenResult] = useState(null);
  const [user, setUser] = useState(null);

  const [isRolling, setIsRolling] = useState(false);
  const [rollItems, setRollItems] = useState([]);
  const [translateX, setTranslateX] = useState(0);
  const [transition, setTransition] = useState("none");

  const [liveBets, setLiveBets] = useState([]);
  const [selectedLiveBetId, setSelectedLiveBetId] = useState(null);
  const [liveBetAmount, setLiveBetAmount] = useState("");
  const [userLiveBets, setUserLiveBets] = useState([]);
  const [isPlacingLiveBet, setIsPlacingLiveBet] = useState(false);
  const [dailyResults, setDailyResults] = useState({ wins: 0, losses: 0 });
  const [userBetHistory, setUserBetHistory] = useState([]);
  const [selectedHistoryBetId, setSelectedHistoryBetId] = useState(null);

  const isSameDay = (value) => {
    if (!value) return false;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    const now = new Date();
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  };
  




  useEffect(() => {
    const token = getToken();
    if (!token) return;

    axios
      .get(`${API}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        if (res.data.success) setUser(res.data.user);
      })
      .catch(() => {});
  }, []);



  // ===========================
  // CARGAR CAJAS
  // ===========================
  useEffect(() => {
    const fetchBoxes = async () => {
      try {
        const res = await axios.get(`${API}/cases`);
        setBoxes(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchBoxes();
  }, []);
  const loadLiveBets = useCallback(async () => {
    try {
      const [activeRes, listadoRes] = await Promise.all([
        axios.get(`${API}/apuestas/activas`),
        axios.get(`${API}/apuestas/listado`),
      ]);
      const formatted = (activeRes.data.apuestas ?? []).map((bet) => ({
        id: bet.id,
        name: bet.titulo,
        comentarios: bet.comentarios,
        probabilidad: Number(bet.probabilidad),
        estado: bet.estado,
        totalGana: Number(bet.total_gana ?? 0),
        totalPierde: Number(bet.total_pierde ?? 0),
      }));
      const results = (listadoRes.data.apuestas ?? []).reduce(
        (acc, bet) => {
          if (!bet.ganador) return acc;
          const dateValue = bet.actualizado_en ?? bet.creado_en;
          if (!isSameDay(dateValue)) return acc;
          if (bet.ganador === "gana") acc.wins += 1;
          if (bet.ganador === "pierde") acc.losses += 1;
          return acc;
        },
        { wins: 0, losses: 0 }
      );
      setLiveBets(formatted);
      setDailyResults(results);
      if (formatted.length > 0 && !formatted.find((bet) => bet.id === selectedLiveBetId)) {
        setSelectedLiveBetId(formatted[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  }, [selectedLiveBetId]);

  const loadUserLiveBets = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await axios.get(`${API}/apuestas/mis-apuestas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const bets = (res.data.apuestas ?? []).map((bet) => {
        const monto = Number(bet.monto ?? 0);
        const montoAntesEquipo = Number(bet.monto_antes_equipo ?? 0);
        return {
          ...bet,
          monto: Number.isFinite(monto) ? monto : 0,
          monto_antes_equipo: Number.isFinite(montoAntesEquipo)
            ? montoAntesEquipo
            : 0,
        };
      });
      setUserLiveBets(bets);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadUserBetHistory = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await axios.get(`${API}/apuestas/historial`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const history = (res.data.apuestas ?? []).map((bet) => ({
        ...bet,
        monto: Number(bet.monto ?? 0),
        ganancia: Number(bet.ganancia ?? 0),
      }));
      setUserBetHistory(history);
      if (history.length > 0 && !history.find((bet) => bet.apuesta_id === selectedHistoryBetId)) {
        setSelectedHistoryBetId(history[0].apuesta_id);
      }
    } catch (err) {
      console.error(err);
    }
  }, [selectedHistoryBetId]);


  useEffect(() => {
    loadLiveBets();
    loadUserLiveBets();
    loadUserBetHistory();
  }, [loadLiveBets, loadUserLiveBets, loadUserBetHistory]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const streamUrl = `${API}/apuestas/stream?token=${encodeURIComponent(token)}`;
    const eventSource = new EventSource(streamUrl);

    const handleUpdate = () => {
      loadLiveBets();
      loadUserLiveBets();
      loadUserBetHistory();
    };

    eventSource.addEventListener("apuestas", handleUpdate);

    return () => {
      eventSource.removeEventListener("apuestas", handleUpdate);
      eventSource.close();
    };
  }, [loadLiveBets, loadUserLiveBets, loadUserBetHistory]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const streamUrl = `${API}/balance/stream?token=${encodeURIComponent(token)}`;
    const eventSource = new EventSource(streamUrl);

    const handleBalance = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.balance === undefined || payload.balance === null) return;
        setUser((current) =>
          current ? { ...current, balance: payload.balance } : current
        );
      } catch (err) {
        console.error("Error leyendo balance en tiempo real:", err);
      }
    };

    eventSource.addEventListener("balance", handleBalance);

    return () => {
      eventSource.removeEventListener("balance", handleBalance);
      eventSource.close();
    };
  }, []);


  // ===========================
  // CARGAR ITEMS DE CAJA
  // ===========================
  const loadItems = async (boxId) => {
    try {
      const res = await axios.get(`${API}/cases/${boxId}/items`);
      setItems(res.data);
      setSelectedBox(boxId);
      setOpenResult(null);
    } catch (err) {
      console.error(err);
    }
  };

  // ===========================
  // ABRIR CAJA
  // ===========================
  const openBox = async () => {

    if (!user) return alert("Debes iniciar sesión primero");
    if (!selectedBox) return alert("Selecciona una caja");

    try {
      setIsRolling(true);
      setOpenResult(null);

      // 1. pedimos resultado real
      const res = await axios.post(`${API}/cases/${selectedBox}/open`, {
        user_id: user.id
      });

      const prize = res.data.drop;

      // 2. Construimos una lista larga: antes — premio — después

      const before = [];
      const after = [];

      // muchos items ANTES del premio
      for (let i = 0; i < 80; i++) {
        before.push(items[Math.floor(Math.random() * items.length)]);
      }

      // muchos items DESPUÉS del premio
      for (let i = 0; i < 50; i++) {
        after.push(items[Math.floor(Math.random() * items.length)]);
      }

      // premio al centro visual
      const longList = [...before, prize, ...after];

      setRollItems(longList);

      // índice del premio
      const index = before.length;


      setRollItems(longList);

      // 3. ancho del item
      const ITEM_WIDTH = 128; // 120 + gaps



      // 5. centro de la línea roja
      const CENTER = 300;

      // 6. distancia total
      const target =
        index * ITEM_WIDTH - CENTER;

      // 7. reiniciar instantáneo al inicio
      setTransition("none");
      setTranslateX(0);

      // pequeño delay para permitir repaint
      setTimeout(() => {
        // 8. animación con desaceleración realista
        setTransition("transform 8s cubic-bezier(0.1, 0.9, 0.1, 1)");
        setTranslateX(-target);
      }, 50);

      // 9. mostrar resultado al terminar animación
      setTimeout(() => {
        setIsRolling(false);
        setOpenResult(res.data);
      }, 8000);

    } catch (err) {
      console.error(err);
      alert("Error al abrir caja");
      setIsRolling(false);
    }
  };

  const DIFFERENCE_LIMIT = 200;
  const selectedLiveBet = liveBets.find((bet) => bet.id === selectedLiveBetId);
  const userLiveBetEntries = selectedLiveBetId
    ? userLiveBets.filter((bet) => bet.apuesta_id === selectedLiveBetId)
    : [];
  const userRetainedTotal = userLiveBets.reduce((total, bet) => {
    const amount = Number(bet.monto ?? 0);
    return total + (Number.isFinite(amount) ? amount : 0);
  }, 0);
  const userAvailableBalance = user ? Math.max(0, Number(user.balance)) : null;
  const formatAmount = (value) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) {
      return "0.00";
    }
    return amount.toFixed(2);
  };
  const getRemainingForSide = (totalGana, totalPierde, side) => {
    const currentTotal = side === "gana" ? totalGana : totalPierde;
    const oppositeTotal = side === "gana" ? totalPierde : totalGana;
    return Math.max(0, DIFFERENCE_LIMIT + oppositeTotal - currentTotal);
  };

  const getOpenBetMessage = (totalGana, totalPierde) => {
    const difference = Math.abs(totalGana - totalPierde);
    if (difference === 0) {
      return "APUESTA PAREJA";
    }
    const openSide = totalGana < totalPierde ? "GANA" : "PIERDE";
    return `FALTA PARCHAR ${formatAmount(difference)} SOLES , ABIERTO ${openSide}`;
  };
  
  const getWinnerLabel = (winner) => {
    if (winner === "gana") return "Gana";
    if (winner === "pierde") return "Pierde";
    return "Pendiente";
  };

  const historyByApuesta = userBetHistory.reduce((acc, bet) => {
    const key = bet.apuesta_id;
    if (!acc[key]) {
      acc[key] = {
        id: bet.apuesta_id,
        titulo: bet.titulo,
        ganador: bet.ganador,
        entries: [],
      };
    }
    acc[key].entries.push(bet);
    return acc;
  }, {});
  const historyOptions = Object.values(historyByApuesta);
  const selectedHistory = historyOptions.find(
    (history) => history.id === selectedHistoryBetId
  );
  const selectedHistoryEntries = selectedHistory?.entries ?? [];
  const totalGananciaHistorial = selectedHistoryEntries.reduce((total, entry) => {
    const ganancia = Number(entry.ganancia ?? 0);
    const monto = Number(entry.monto ?? 0);
    return total + (Number.isFinite(ganancia) ? ganancia : 0) - (Number.isFinite(monto) ? monto : 0);
  }, 0);


  const canPlaceLiveBet = (side) => {
    if (!selectedLiveBet) return false;
    if (selectedLiveBet.estado !== "abierta") return false;
    const remaining = getRemainingForSide(
      selectedLiveBet.totalGana,
      selectedLiveBet.totalPierde,
      side
    );
    return remaining > 0;
  };

  const calculatePotentialWinForEntry = (
    entry,
    totalGana,
    totalPierde,
    multiplier
  ) => {
    const amount = Number(entry.monto ?? 0);
    const oppositeTotal = entry.equipo === "gana" ? totalPierde : totalGana;
    const sameSideBeforeUser = Number(entry.monto_antes_equipo ?? 0);
    const remainingOppositeForUser = Math.max(0, oppositeTotal - sameSideBeforeUser);
    const matched = Math.min(amount, remainingOppositeForUser);
    return matched * multiplier + (amount - matched);
  };

  const handlePlaceLiveBet = async (side) => {
    if (!selectedLiveBet) return;
    const amount = Number(liveBetAmount);
    const token = getToken();
    if (!token) {
      alert("Debes iniciar sesión primero");
      return;
    }
    if (!amount || amount <= 0) {
      alert("Ingresa un monto válido");
      return;
    }
    if (userAvailableBalance !== null && amount > userAvailableBalance) {
      alert("No tienes saldo disponible suficiente para esta apuesta.");
      return;
    }
    if (!canPlaceLiveBet(side)) {
      alert(`Se alcanzó el límite de diferencia de ${DIFFERENCE_LIMIT} soles para este equipo.`);
      return;
    }
    const remaining = getRemainingForSide(
      selectedLiveBet.totalGana,
      selectedLiveBet.totalPierde,
      side
    );

    if (amount > remaining) {
      const formattedRemaining = formatAmount(remaining);
      alert(`Quedan ${formattedRemaining} soles para Team ${side === "gana" ? "Gana" : "Pierde"}. El monto máximo es ${formattedRemaining} soles para esta apuesta.`);
      return;
    }
    
    if (isPlacingLiveBet) return;

    const teamLabel = side === "gana" ? "Team Gana" : "Team Pierde";
    const formattedAmount = amount.toFixed(2);
    const shouldProceed = window.confirm(
      `¿Estás seguro de que quieres apostar ${formattedAmount} soles a ${teamLabel}?`
    );
    if (!shouldProceed) return;

    setIsPlacingLiveBet(true);

    try {
      const res = await axios.post(
        `${API}/apuestas/apostar`,
        {
          apuestaId: selectedLiveBetId,
          monto: amount,
          equipo: side,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const totales = res.data.totales ?? {};
      setLiveBets((current) =>
        current.map((bet) => {
          if (bet.id !== selectedLiveBetId) return bet;
          return {
            ...bet,
            totalGana: Number(totales.total_gana ?? bet.totalGana),
            totalPierde: Number(totales.total_pierde ?? bet.totalPierde),
          };
        })
      );
      if (res.data.userBets) {
        setUserLiveBets((current) => {
          const filtered = current.filter(
            (bet) => bet.apuesta_id !== selectedLiveBetId
          );
          const nextEntries = res.data.userBets.map((bet) => {
            const monto = Number(bet.monto ?? 0);
            const montoAntesEquipo = Number(bet.monto_antes_equipo ?? 0);
            return {
              ...bet,
              monto: Number.isFinite(monto) ? monto : 0,
              monto_antes_equipo: Number.isFinite(montoAntesEquipo)
                ? montoAntesEquipo
                : 0,
            };
          });
          return [...filtered, ...nextEntries];
        });
      }


      if (user) {
        setUser((current) =>
          current ? { ...current, balance: res.data.balance } : current
        );
      }
      setLiveBetAmount("");
      loadLiveBets();
      loadUserLiveBets();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.msg ?? "Error realizando la apuesta");
    } finally {
      setIsPlacingLiveBet(false);
    }
  };




  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6">

      {/* HEADER */}
      <div className="max-w-6xl mx-auto mb-8">
        <h1 className="text-4xl font-extrabold text-center mb-2">
          🎰 Sistema de Cajas
        </h1>
        <p className="text-center text-gray-300">
          Abre cajas y gana premios 
        </p>
        <div className="flex justify-center mt-4">
          <button
            onClick={() => navigate("/home")}
            className="text-indigo-400 hover:text-indigo-300 font-semibold"
          >
            ⬅️ Volver al inicio
          </button>
        </div>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">

        {/* LISTA DE CAJAS */}
        <div className="bg-gray-800 rounded-2xl p-4 shadow-xl">
          <h2 className="text-xl font-bold mb-3">📦 Cajas disponibles</h2>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {boxes.map((box) => (
              <div
                key={box.id}
                className={`p-3 rounded-xl cursor-pointer transition ${
                  selectedBox === box.id
                    ? "bg-indigo-600"
                    : "bg-gray-900 hover:bg-gray-700"
                }`}
                onClick={() => loadItems(box.id)}
              >
                <div className="flex justify-between">
                  <span className="font-semibold">{box.name}</span>
                  <span className="text-sm text-gray-300">
                    {box.price} coins
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ITEMS DENTRO DE LA CAJA */}
        <div className="bg-gray-800 rounded-2xl p-4 shadow-xl col-span-2">
          <h2 className="text-xl font-bold mb-3">🎁 Items de la caja</h2>

          {!selectedBox && (
            <p className="text-gray-400 text-sm">
              Selecciona una caja para ver sus items...
            </p>
          )}

          {selectedBox && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[260px] overflow-y-auto">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="bg-gray-900 rounded-xl p-3 shadow border border-gray-700"
                  >
                    <div className="font-semibold">{item.name}</div>
                    <div className="text-sm text-gray-300">
                      💰 valor: {item.value}
                    </div>
                    <div className="text-sm text-indigo-400">
                      🎯 probabilidad: {item.probability}%
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={openBox}
                className="mt-4 w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition font-bold"
              >
                🔥 Abrir esta caja
              </button>
            </>
          )}

          {/* RESULTADO */}

          {isRolling && (
            <div className="mt-4 border border-yellow-400 rounded-xl overflow-hidden bg-black relative">

              {/* LINEA ROJA GANADORA */}
              <div className="winner-line"></div>

              {/* CARRUSEL DE ITEMS */}
              <div
                className="roll-track"
                style={{
                  transform: `translateX(${translateX}px)`,
                  transition: transition
                }}
              >
                {rollItems.map((it, index) => (
                  <div key={index} className="item-card">
                    <div className="text-sm font-bold">{it.name}</div>
                    <div className="text-xs text-gray-300">
                      💰 {it.value ?? it.total_value ?? 0}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}




          {openResult && (
            <div className="mt-4 p-4 bg-green-900/60 border border-green-600 rounded-xl">
              <h3 className="font-bold mb-1">🎉 ¡Ganaste!</h3>

              <p>
                Item: <b>{openResult.drop?.name}</b>
              </p>

              <p>
                Valor:{" "}
                <b>
                  {openResult.drop?.value ?? openResult.drop?.total_value ?? 0}
                </b>
              </p>

              <p className="text-sm text-gray-300 mt-1">
                Nuevo saldo: <b>{openResult.balance}</b>
              </p>
            </div>
          )}

        </div>
      </div>

      {/* APUESTAS EN VIVO */}
      <div className="max-w-6xl mx-auto mt-10">
        <h2 className="text-2xl font-bold mb-4">🎯 Apuestas disponibles :</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold">WINN Y LOSSES DE HOY➡️</h3>
              <span className="text-xs text-gray-300">
                WINN: {dailyResults.wins} ; LOSS: {dailyResults.losses}
              </span>
            </div>

            <div className="space-y-2 max-h-[320px] overflow-y-auto">
              {liveBets.length === 0 && (
                <p className="text-gray-400 text-sm">No hay apuestas activas.</p>
              )}
              {liveBets.map((bet) => (
                <button
                  key={bet.id}
                  type="button"
                  onClick={() => setSelectedLiveBetId(bet.id)}
                  className={`w-full p-3 rounded-xl text-left transition ${
                    selectedLiveBetId === bet.id
                      ? "bg-indigo-600"
                      : "bg-gray-900 hover:bg-gray-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{bet.name}</span>
                    <span className="text-xs text-gray-300">
                      {getOpenBetMessage(bet.totalGana, bet.totalPierde)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Estado: {bet.estado} · x{bet.probabilidad}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gray-800 rounded-2xl p-4 shadow-xl col-span-2">
            <h3 className="text-lg font-bold mb-3">🟢 Realiza tu apuesta</h3>

            {!selectedLiveBet && (
              <p className="text-gray-400 text-sm">
                Selecciona una apuesta para ver los detalles.
              </p>
            )}

            {selectedLiveBet && (
              <div className="space-y-4">
                {user && (
                  <div className="bg-gray-900 rounded-xl p-4 border border-gray-700 text-sm">
                    <p>
                      Saldo disponible:{" "}
                      <b>{userAvailableBalance?.toFixed(2)} soles</b>
                    </p>
                    <p className="text-gray-300">
                      Saldo retenido en apuestas en vivo:{" "}
                      <b>{userRetainedTotal.toFixed(2)} soles</b>
                    </p>
                  </div>
                )}
                <div className="bg-gray-900 rounded-xl p-4 border border-gray-700">
                  <p className="font-semibold">{selectedLiveBet.name}</p>
                  {selectedLiveBet.comentarios && (
                    <p className="text-xs text-gray-400">
                      {selectedLiveBet.comentarios}
                    </p>
                  )}
                  <p className="text-sm text-gray-300">
                    {getOpenBetMessage(
                      selectedLiveBet.totalGana,
                      selectedLiveBet.totalPierde
                    )}
                  </p>
                  <p className="text-xs text-indigo-300 mt-2">
                    {(() => {
                      const remainingGana = getRemainingForSide(
                        selectedLiveBet.totalGana,
                        selectedLiveBet.totalPierde,
                        "gana"
                      );
                      const remainingPierde = getRemainingForSide(
                        selectedLiveBet.totalGana,
                        selectedLiveBet.totalPierde,
                        "pierde"
                      );
                      return (
                        <>
                          La diferencia máxima entre gana y pierde solo puede ser de <b>{DIFFERENCE_LIMIT} soles</b>. Puedes apostar hasta {" "}
                          <b>{formatAmount(remainingGana)}</b> soles para Gana , puedes apostar hasta {" "}
                          <b>{formatAmount(remainingPierde)}</b> soles para Pierde.
                        </>
                      );
                    })()}
                  </p>
                </div>

                <div>
                  <label className="block text-sm mb-2">Monto en soles</label>
                  <input
                    type="number"
                    min="1"
                    value={liveBetAmount}
                    onChange={(event) => setLiveBetAmount(event.target.value)}
                    className="w-full rounded-xl bg-gray-900 border border-gray-700 px-3 py-2"
                    placeholder="Ej: 10"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handlePlaceLiveBet("gana")}
                    disabled={isPlacingLiveBet || !canPlaceLiveBet("gana")}
                    className={`py-2 rounded-xl font-bold transition ${
                      !isPlacingLiveBet && canPlaceLiveBet("gana")
                        ? "bg-green-600 hover:bg-green-500"
                        : "bg-gray-700 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {isPlacingLiveBet ? "Procesando..." : "Apostar a Gana"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePlaceLiveBet("pierde")}
                    disabled={isPlacingLiveBet || !canPlaceLiveBet("pierde")}
                    className={`py-2 rounded-xl font-bold transition ${
                      !isPlacingLiveBet && canPlaceLiveBet("pierde")
                        ? "bg-red-600 hover:bg-red-500"
                        : "bg-gray-700 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {isPlacingLiveBet ? "Procesando..." : "Apostar a Pierde"}
                  </button>
                </div>

                {userLiveBetEntries.length > 0 && (
                  <div className="bg-indigo-900/40 border border-indigo-600 rounded-xl p-4 text-sm">

                    {userLiveBetEntries.map((entry, index) => {
                      const teamLabel =
                        entry.equipo === "gana" ? "Team Gana" : "Team Pierde";
                      return (
                        <div key={entry.id ?? `${entry.equipo}-${index}`}>
                          <p className={index > 0 ? "mt-2" : ""}>
                            Tu apuesta: <b>{formatAmount(entry.monto)} soles</b> al lado{" "}
                            <b>{teamLabel}</b>
                          </p>
                          <p className="mt-1">
                            Ganancia estimada {teamLabel}:{" "}
                            <b>
                              {calculatePotentialWinForEntry(
                                entry,
                                selectedLiveBet.totalGana,
                                selectedLiveBet.totalPierde,
                                selectedLiveBet.probabilidad
                              ).toFixed(2)}{" "}
                              soles
                            </b>
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="mt-6 bg-gray-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold">📜 Historial bets</h3>
            <span className="text-xs text-gray-300">
              Selecciona la apuesta que quieras revisar
            </span>
          </div>

          {historyOptions.length === 0 && (
            <p className="text-gray-400 text-sm">
              No hay apuestas cerradas en tu historial.
            </p>
          )}

          {historyOptions.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="space-y-2 max-h-[260px] overflow-y-auto">
                {historyOptions.map((history) => (
                  <button
                    key={history.id}
                    type="button"
                    onClick={() => setSelectedHistoryBetId(history.id)}
                    className={`w-full p-3 rounded-xl text-left transition ${
                      selectedHistoryBetId === history.id
                        ? "bg-indigo-600"
                        : "bg-gray-900 hover:bg-gray-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{history.titulo}</span>
                      <span className="text-xs text-gray-200">
                        Resultado: {getWinnerLabel(history.ganador)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="lg:col-span-2 bg-gray-900 rounded-xl p-4 border border-gray-700">
                {!selectedHistory && (
                  <p className="text-gray-400 text-sm">
                    Selecciona una apuesta del historial para ver tus apuestas.
                  </p>
                )}

                {selectedHistory && (
                  <div className="space-y-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2 text-gray-300">
                      <span className="font-semibold text-white">
                        {selectedHistory.titulo}
                      </span>
                      <span>
                        Resultado:{" "}
                        <b>{getWinnerLabel(selectedHistory.ganador)}</b>
                      </span>
                    </div>

                    {selectedHistoryEntries.map((entry, index) => {
                      const teamLabel =
                        entry.equipo === "gana" ? "Team Gana" : "Team Pierde";
                      return (
                        <div
                          key={entry.id ?? `${entry.apuesta_id}-${index}`}
                          className="rounded-lg border border-gray-700 bg-gray-800/60 p-3"
                        >
                          <p>
                            Tu apuesta:{" "}
                            <b>{formatAmount(entry.monto)} soles</b> a{" "}
                            <b>{teamLabel}</b>
                          </p>
                          <p className="text-gray-300 mt-1">
                            Resultado de tu apuesta:{" "}
                            <b>{formatAmount(entry.ganancia)} soles</b>
                          </p>
                        </div>
                      );
                    })}

                    <div className="border-t border-gray-700 pt-3 text-right text-base">
                      Ganancia total:{" "}
                      <b>{formatAmount(totalGananciaHistorial)} soles</b>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>



      
    </div>
  );
}
