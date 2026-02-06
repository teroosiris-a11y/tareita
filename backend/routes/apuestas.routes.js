const express = require("express");
const pool = require("../db");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

const emitApuestaUpdate = (req, payload = {}) => {
  req.app?.emit("apuestas:update", {
    ...payload,
    timestamp: Date.now(),
  });
};


const buildApuestasErrorResponse = (error) => {
  const code = error?.code;
  const detailByCode = {
    "42P01": "Falta una tabla requerida (revisa migraciones de apuestas).",
    "42703": "Falta una columna requerida (revisa el esquema de apuestas).",
    "28P01": "Credenciales de base de datos inválidas.",
    "08006": "No se pudo conectar a la base de datos.",
  };
  const safeDetail = detailByCode[code];
  return {
    msg: "Error cargando apuestas",
    detail:
      process.env.NODE_ENV !== "production"
        ? error.message
        : safeDetail ?? "Revisa logs del servidor.",
  };
};

const buildUserBetsQuery = (filterByApuestaId = false) => `
  SELECT *
  FROM (
    SELECT
      au.id,
      au.user_id,
      au.apuesta_id,
      au.equipo,
      au.monto,
      au.creado_en,
      a.titulo,
      a.estado,
      a.probabilidad,
      COALESCE(
        SUM(au.monto) OVER (
          PARTITION BY au.apuesta_id, au.equipo
          ORDER BY au.creado_en ASC, au.id ASC
          ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
        ),
        0
      ) AS monto_antes_equipo
    FROM apuestas_usuarios au
    JOIN apuestas a ON a.id = au.apuesta_id
    WHERE a.estado <> 'cerrada'
    ${filterByApuestaId ? "AND au.apuesta_id = $2" : ""}
  ) AS bet
  WHERE bet.user_id = $1
  ORDER BY bet.creado_en DESC, bet.id DESC
`;

const buildUserHistoryQuery = () => `
  SELECT
    au.id,
    au.user_id,
    au.apuesta_id,
    au.equipo,
    au.monto,
    au.ganancia,
    au.creado_en,
    a.titulo,
    a.estado,
    a.ganador,
    a.probabilidad,
    a.actualizado_en
  FROM apuestas_usuarios au
  JOIN apuestas a ON a.id = au.apuesta_id
  WHERE a.estado = 'cerrada' AND au.user_id = $1
  ORDER BY a.actualizado_en DESC, a.id DESC, au.creado_en ASC, au.id ASC
`;


// Ruta para crear una nueva apuesta
router.post("/apuestas/crear", async (req, res) => {
  const { titulo, comentarios, probabilidad } = req.body;


  try {
    const result = await pool.query(
      `
        INSERT INTO apuestas (titulo, comentarios, probabilidad, estado)
        VALUES ($1, $2, $3, 'abierta')
        RETURNING id, titulo, comentarios, probabilidad, estado, creado_en, actualizado_en, ganador
      `,
      [titulo, comentarios, probabilidad]
    );

    emitApuestaUpdate(req, { apuestaId: result.rows[0]?.id, action: "creada" });
    res.json({ msg: "Apuesta creada exitosamente", apuesta: result.rows[0] });
  } catch (error) {
    console.error("Error creando apuesta:", error);
    res.status(500).json(buildApuestasErrorResponse(error));
  }
});

// Ruta para obtener todas las apuestas activas
router.get("/apuestas/activas", async (req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT 
          a.id,
          a.titulo,
          a.comentarios,
          a.probabilidad,
          a.estado,
          a.ganador,
          a.creado_en,
          a.actualizado_en,
          COALESCE(SUM(CASE WHEN au.equipo = 'gana' THEN au.monto END), 0) AS total_gana,
          COALESCE(SUM(CASE WHEN au.equipo = 'pierde' THEN au.monto END), 0) AS total_pierde
        FROM apuestas a
        LEFT JOIN apuestas_usuarios au ON au.apuesta_id = a.id
        WHERE a.estado <> 'cerrada'
        GROUP BY a.id
        ORDER BY a.creado_en DESC
      `
    );
    res.json({ apuestas: result.rows });
  } catch (error) {
    console.error("Error cargando apuestas:", error);
    res.status(500).json(buildApuestasErrorResponse(error));

  }
});

router.get("/apuestas/listado", async (req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT 
          a.id,
          a.titulo,
          a.comentarios,
          a.probabilidad,
          a.estado,
          a.ganador,
          a.creado_en,
          a.actualizado_en,
          COALESCE(SUM(CASE WHEN au.equipo = 'gana' THEN au.monto END), 0) AS total_gana,
          COALESCE(SUM(CASE WHEN au.equipo = 'pierde' THEN au.monto END), 0) AS total_pierde
        FROM apuestas a
        LEFT JOIN apuestas_usuarios au ON au.apuesta_id = a.id
        GROUP BY a.id
        ORDER BY a.creado_en DESC
      `
    );
    res.json({ apuestas: result.rows });
  } catch (error) {
    console.error("Error cargando apuestas:", error);
    res.status(500).json({
      msg: "Error cargando apuestas",
      detail:
        process.env.NODE_ENV !== "production"
          ? error.message
          : "Revisa logs del servidor.",
    });
  }
});

// Ruta para ver apuestas del usuario (para retención y UI)
router.get("/apuestas/mis-apuestas", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(buildUserBetsQuery(false), [req.user.id]);
    res.json({ apuestas: result.rows });
  } catch (error) {
    console.error("Error cargando apuestas del usuario:", error);
    res.status(500).json({ msg: "Error cargando apuestas del usuario" });
  }
});

// Ruta para historial de apuestas cerradas del usuario
router.get("/apuestas/historial", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(buildUserHistoryQuery(), [req.user.id]);
    res.json({ apuestas: result.rows });
  } catch (error) {
    console.error("Error cargando historial de apuestas:", error);
    res.status(500).json({ msg: "Error cargando historial de apuestas" });
  }
});


// Ruta para realizar una apuesta
router.post("/apuestas/apostar", authMiddleware, async (req, res) => {
  const { apuestaId, monto, equipo } = req.body;
  const numericAmount = Number(monto);
  const DIFFERENCE_LIMIT = 200;
  if (!apuestaId || !equipo || Number.isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ msg: "Datos inválidos para apostar." });
  }
  if (!["gana", "pierde"].includes(equipo)) {
    return res.status(400).json({ msg: "Equipo inválido." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const apuestaResult = await client.query(
      `
        SELECT id, probabilidad, estado, ganador
        FROM apuestas
        WHERE id = $1
        FOR UPDATE
      `,
      [apuestaId]
    );

    if (apuestaResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ msg: "Apuesta no encontrada." });
    }
  

    const apuesta = apuestaResult.rows[0];
    if (apuesta.estado !== "abierta") {
      await client.query("ROLLBACK");
      return res.status(400).json({ msg: "Las apuestas están pausadas o cerradas." });
    }

    const totalsResult = await client.query(
      `
        SELECT 
          COALESCE(SUM(CASE WHEN equipo = 'gana' THEN monto END), 0) AS total_gana,
          COALESCE(SUM(CASE WHEN equipo = 'pierde' THEN monto END), 0) AS total_pierde
        FROM apuestas_usuarios
        WHERE apuesta_id = $1
      `,
      [apuestaId]
    );


    const totalGana = Number(totalsResult.rows[0].total_gana);
    const totalPierde = Number(totalsResult.rows[0].total_pierde);
    const currentTotal = equipo === "gana" ? totalGana : totalPierde;
    const oppositeTotal = equipo === "gana" ? totalPierde : totalGana;
    const remaining = DIFFERENCE_LIMIT + oppositeTotal - currentTotal;
    if (remaining <= 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        msg: `Se alcanzó el límite de diferencia de ${DIFFERENCE_LIMIT} soles para Team ${equipo === "gana" ? "Gana" : "Pierde"}.`,
      });
    }

    if (numericAmount > remaining) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        msg: `Quedan ${remaining} soles para Team ${equipo === "gana" ? "Gana" : "Pierde"}. El monto máximo es ${remaining} soles para esta apuesta.`,
      });
    }

    const userResult = await client.query(
      "SELECT balance FROM users WHERE id = $1 FOR UPDATE",
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ msg: "Usuario no encontrado." });
    }

    const userBalance = Number(userResult.rows[0].balance);
    if (userBalance < numericAmount) {
      await client.query("ROLLBACK");
      return res.status(400).json({ msg: "Saldo insuficiente." });
    }

    await client.query(
      `
        INSERT INTO apuestas_usuarios (apuesta_id, user_id, equipo, monto, ganancia, pagado)
        VALUES ($1, $2, $3, $4, 0, false)
      `,
      [apuestaId, req.user.id, equipo, numericAmount]
    );

    const balanceResult = await client.query(
      `
        UPDATE users
        SET balance = balance - $1
        WHERE id = $2
        RETURNING balance
      `,
      [numericAmount, req.user.id]
    );

    const totalsAfter = await client.query(
      `
        SELECT 
          COALESCE(SUM(CASE WHEN equipo = 'gana' THEN monto END), 0) AS total_gana,
          COALESCE(SUM(CASE WHEN equipo = 'pierde' THEN monto END), 0) AS total_pierde
        FROM apuestas_usuarios
        WHERE apuesta_id = $1
      `,
      [apuestaId]
    );

    const userBetResult = await client.query(
      buildUserBetsQuery(true),
      [req.user.id, apuestaId]
    );

    await client.query("COMMIT");

    req.app?.emit("balance:update", {
      userId: req.user.id,
      balance: balanceResult.rows[0].balance,
      source: "apuesta",
    });
    emitApuestaUpdate(req, { apuestaId });


    res.json({
      msg: "Apuesta realizada con éxito",
      apuestaId,
      balance: balanceResult.rows[0].balance,
      totales: totalsAfter.rows[0],
      userBets: userBetResult.rows ?? [],
      probabilidad: apuesta.probabilidad,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error apostando:", error);
    res.status(500).json({ msg: "Error apostando" });
  } finally {
    client.release();
  }
});

// Ruta para pausar las apuestas
router.post("/apuestas/:id/pausar", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      `
        UPDATE apuestas
        SET estado = 'pausada', actualizado_en = NOW()
        WHERE id = $1
      `,
      [id]
    );
    emitApuestaUpdate(req, { apuestaId: Number(id), action: "pausada" });
    res.json({ msg: "Apuesta pausada" });
  } catch (error) {
    console.error("Error pausando apuestas:", error);
    res.status(500).json({ msg: "Error pausando apuestas" });
  }
});

// Ruta para continuar las apuestas
router.post("/apuestas/:id/continuar", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      `
        UPDATE apuestas
        SET estado = 'abierta', actualizado_en = NOW()
        WHERE id = $1
      `,
      [id]
    );
    emitApuestaUpdate(req, { apuestaId: Number(id), action: "abierta" });
    res.json({ msg: "Apuesta reactivada" });
  } catch (error) {
    console.error("Error reactivando apuestas:", error);
    res.status(500).json({ msg: "Error reactivando apuestas" });
  }
});

// Ruta para cerrar todas las apuestas
router.post("/apuestas/:id/cerrar", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `
        UPDATE apuestas
        SET estado = 'cerrada', actualizado_en = NOW()
        WHERE id = $1
        RETURNING id, titulo, estado, ganador
      `,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ msg: "Apuesta no encontrada." });
    }
    emitApuestaUpdate(req, { apuestaId: Number(id), action: "cerrada" });
    res.json({ msg: "Apuesta cerrada exitosamente", apuesta: result.rows[0] });
  } catch (error) {
    console.error("Error cerrando apuestas:", error);
    res.status(500).json({ msg: "Error cerrando apuestas" });
  }
});

// Ruta para marcar un ganador y calcular las ganancias
router.post("/apuestas/marcar-ganador", async (req, res) => {
  const { apuestaId, equipoGanador } = req.body;

  if (!["gana", "pierde"].includes(equipoGanador)) {
    return res.status(400).json({ msg: "Equipo ganador inválido." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const apuestaResult = await client.query(
      `
        SELECT id, probabilidad, ganador
        FROM apuestas
        WHERE id = $1
        FOR UPDATE
      `,
      [apuestaId]
    );

    if (apuestaResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ msg: "Apuesta no encontrada." });
    }

    const apuesta = apuestaResult.rows[0];
    if (apuesta.ganador) {
      await client.query("ROLLBACK");
      return res.status(400).json({ msg: "La apuesta ya tiene ganador." });
    }


    await client.query(
      `
        UPDATE apuestas
        SET ganador = $1, estado = 'cerrada', actualizado_en = NOW()
        WHERE id = $2
      `,
      [equipoGanador, apuestaId]
    );

    await client.query(
      `
        UPDATE apuestas_usuarios
        SET ganancia = 0
        WHERE apuesta_id = $1 AND equipo <> $2
      `,
      [apuestaId, equipoGanador]
    );

    const totalsResult = await client.query(
      `
        SELECT 
          COALESCE(SUM(CASE WHEN equipo = 'gana' THEN monto END), 0) AS total_gana,
          COALESCE(SUM(CASE WHEN equipo = 'pierde' THEN monto END), 0) AS total_pierde
        FROM apuestas_usuarios
        WHERE apuesta_id = $1
      `,
      [apuestaId]
    );

    const totalGana = Number(totalsResult.rows[0].total_gana);
    const totalPierde = Number(totalsResult.rows[0].total_pierde);
    const totalWinning = equipoGanador === "gana" ? totalGana : totalPierde;
    const totalLosing = equipoGanador === "gana" ? totalPierde : totalGana;


    const winningRows = await client.query(
      `
        SELECT id, user_id, monto
        FROM apuestas_usuarios
        WHERE apuesta_id = $1 AND equipo = $2 AND pagado = false
        ORDER BY creado_en ASC, id ASC
        FOR UPDATE
      `,
      [apuestaId, equipoGanador]
    );
    
    let remainingLosing = totalLosing;

    const payoutsByUser = {};
    for (const row of winningRows.rows) {
      const betAmount = Number(row.monto);
      const matchedAmount = Math.min(betAmount, remainingLosing);
      const payout =
        matchedAmount * Number(apuesta.probabilidad) + (betAmount - matchedAmount);
      remainingLosing = Math.max(0, remainingLosing - matchedAmount);

      await client.query(
        `
          UPDATE apuestas_usuarios
          SET ganancia = $1, pagado = true
          WHERE id = $2
        `,
        [payout, row.id]
      );

      const key = row.user_id;
      payoutsByUser[key] = (payoutsByUser[key] ?? 0) + payout;
    }

    const userIds = Object.keys(payoutsByUser);
    for (const userId of userIds) {
      await client.query(
        `
          UPDATE users
          SET balance = balance + $1
          WHERE id = $2
        `,
        [payoutsByUser[userId], userId]
      );
    }

    await client.query("COMMIT");
    emitApuestaUpdate(req, { apuestaId, action: "ganador" });
    res.json({ msg: "Ganador marcado, ganancias calculadas", apuestaId });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error marcando ganador:", error);
    res.status(500).json({ msg: "Error marcando ganador" });
  } finally {
    client.release();
  }
});

// Ruta para revertir acciones en caso de error
router.post("/apuestas/revertir", async (req, res) => {
  const { apuestaId } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const apuestaResult = await client.query(
      `
        SELECT id, ganador
        FROM apuestas
        WHERE id = $1
        FOR UPDATE
      `,
      [apuestaId]
    );
    if (apuestaResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ msg: "Apuesta no encontrada." });
    }

    const revertRows = await client.query(
      `
        SELECT user_id, ganancia
        FROM apuestas_usuarios
        WHERE apuesta_id = $1 AND ganancia > 0 AND pagado = true
      `,
      [apuestaId]
    );

    const revertByUser = revertRows.rows.reduce((acc, row) => {
      const key = row.user_id;
      acc[key] = (acc[key] ?? 0) + Number(row.ganancia);
      return acc;
    }, {});

    const userIds = Object.keys(revertByUser);
    for (const userId of userIds) {
      await client.query(
        `
          UPDATE users
          SET balance = balance - $1
          WHERE id = $2
        `,
        [revertByUser[userId], userId]
      );
    }

    await client.query(
      `
        UPDATE apuestas_usuarios
        SET ganancia = 0, pagado = false
        WHERE apuesta_id = $1
      `,
      [apuestaId]
    );

    await client.query(
      `
        UPDATE apuestas
        SET ganador = NULL, estado = 'pausada', actualizado_en = NOW()
        WHERE id = $1
      `,
      [apuestaId]
    );

    await client.query("COMMIT");
    emitApuestaUpdate(req, { apuestaId, action: "revertida" });
    res.json({ msg: "Acciones revertidas con éxito", apuestaId });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error revirtiendo apuesta:", error);
    res.status(500).json({ msg: "Error revirtiendo apuesta" });
  } finally {
    client.release();
  }
});

// Ruta para eliminar una apuesta específica
router.delete("/apuestas/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `
        DELETE FROM apuestas
        WHERE id = $1
        RETURNING id
      `,
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ msg: "Apuesta no encontrada." });
    }
    emitApuestaUpdate(req, { apuestaId: Number(id), action: "eliminada" });
    res.json({ msg: "Apuesta eliminada", id });
  } catch (error) {
    console.error("Error eliminando apuesta:", error);
    res.status(500).json({ msg: "Error eliminando apuesta" });
  }
});

// Eliminar apuesta de un usuario y devolver saldo
router.post("/apuestas/:id/apostadores/eliminar", async (req, res) => {
  const { id } = req.params;
  const { userId, equipo } = req.body;

  if (!userId || !equipo) {
    return res.status(400).json({ msg: "Datos incompletos." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const betResult = await client.query(
      `
        SELECT COALESCE(SUM(monto), 0) AS total
        FROM apuestas_usuarios
        WHERE apuesta_id = $1 AND user_id = $2 AND equipo = $3
      `,
      [id, userId, equipo]
    );

    const total = Number(betResult.rows[0]?.total ?? 0);
    if (total <= 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ msg: "Apuesta no encontrada." });
    }

    const balanceUpdateResult = await client.query(
      `
        UPDATE users
        SET balance = balance + $1
        WHERE id = $2
        RETURNING balance
      `,
      [total, userId]
    );

    await client.query(
      `
        DELETE FROM apuestas_usuarios
        WHERE apuesta_id = $1 AND user_id = $2 AND equipo = $3
      `,
      [id, userId, equipo]
    );

    await client.query("COMMIT");
    req.app?.emit("balance:update", {
      userId,
      balance: balanceUpdateResult.rows[0]?.balance ?? null,
      source: "apuesta_eliminada",
    });
    emitApuestaUpdate(req, { apuestaId: Number(id), action: "apostador_eliminado" });
    res.json({ msg: "Apuesta eliminada y saldo devuelto", total });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error eliminando apuesta del usuario:", error);
    res.status(500).json({ msg: "Error eliminando apuesta del usuario" });
  } finally {
    client.release();
  }
});


// Tabla de apostadores por apuesta
router.get("/apuestas/:id/apostadores", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `
        SELECT 
          au.user_id,
          u.username,
          au.equipo,
          SUM(au.monto) AS monto,
          SUM(au.ganancia) AS ganancia
        FROM apuestas_usuarios au
        JOIN users u ON u.id = au.user_id
        WHERE au.apuesta_id = $1
        GROUP BY au.user_id, u.username, au.equipo
        ORDER BY MAX(au.creado_en) DESC
      `,
      [id]
    );
    res.json({ apostadores: result.rows });
  } catch (error) {
    console.error("Error cargando apostadores:", error);
    res.status(500).json({ msg: "Error cargando apostadores" });
  }
});
module.exports = router;
