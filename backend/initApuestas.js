const pool = require("./db");

const initApuestas = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS apuestas (
      id SERIAL PRIMARY KEY,
      titulo TEXT NOT NULL,
      comentarios TEXT,
      probabilidad NUMERIC NOT NULL DEFAULT 1.8,
      estado TEXT NOT NULL DEFAULT 'abierta',
      ganador TEXT,
      creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS apuestas_usuarios (
      id SERIAL PRIMARY KEY,
      apuesta_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      equipo TEXT NOT NULL,
      monto NUMERIC NOT NULL,
      ganancia NUMERIC NOT NULL DEFAULT 0,
      pagado BOOLEAN NOT NULL DEFAULT false,
      creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE apuestas
    ADD COLUMN IF NOT EXISTS comentarios TEXT;
  `);
  await pool.query(`
    ALTER TABLE apuestas
    ADD COLUMN IF NOT EXISTS probabilidad NUMERIC DEFAULT 1.8;
  `);
  await pool.query(`
    ALTER TABLE apuestas
    ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'abierta';
  `);
  await pool.query(`
    ALTER TABLE apuestas
    ADD COLUMN IF NOT EXISTS ganador TEXT;
  `);
  await pool.query(`
    ALTER TABLE apuestas
    ADD COLUMN IF NOT EXISTS creado_en TIMESTAMPTZ DEFAULT NOW();
  `);
  await pool.query(`
    ALTER TABLE apuestas
    ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMPTZ DEFAULT NOW();
  `);

  await pool.query(`
    ALTER TABLE apuestas_usuarios
    ADD COLUMN IF NOT EXISTS ganancia NUMERIC DEFAULT 0;
  `);
  await pool.query(`
    ALTER TABLE apuestas_usuarios
    ADD COLUMN IF NOT EXISTS pagado BOOLEAN DEFAULT false;
  `);
  await pool.query(`
    ALTER TABLE apuestas_usuarios
    ADD COLUMN IF NOT EXISTS creado_en TIMESTAMPTZ DEFAULT NOW();
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_apuestas_estado ON apuestas (estado);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_apuestas_usuarios_apuesta_id
    ON apuestas_usuarios (apuesta_id);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_apuestas_usuarios_user_id
    ON apuestas_usuarios (user_id);
  `);
};

module.exports = initApuestas;
