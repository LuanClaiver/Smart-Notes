const Database = require("better-sqlite3");

const db = new Database("notas.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS notas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    conteudo TEXT NOT NULL,
    categoria TEXT NOT NULL,
    favorita INTEGER DEFAULT 0,
    fixada INTEGER DEFAULT 0,
    naLixeira INTEGER DEFAULT 0,
    criadoEm TEXT NOT NULL
  )
`);

module.exports = db;