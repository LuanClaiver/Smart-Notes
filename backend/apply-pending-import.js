const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const base = __dirname;
const banco = path.join(base, "notas.db");
const pendente = path.join(base, ".smart-notes-import-pending.db");
const info = path.join(base, ".smart-notes-import-pending.json");

if (!fs.existsSync(pendente)) {
  process.exit(0);
}

try {
  const teste = new Database(pendente, { readonly: true, fileMustExist: true });
  try {
    const integridade = teste.pragma("integrity_check", { simple: true });
    if (String(integridade).toLowerCase() !== "ok") {
      throw new Error("O banco pendente falhou na verificação de integridade.");
    }
  } finally {
    teste.close();
  }

  fs.copyFileSync(pendente, banco);
  fs.rmSync(`${banco}-wal`, { force: true });
  fs.rmSync(`${banco}-shm`, { force: true });
  fs.rmSync(pendente, { force: true });
  fs.rmSync(info, { force: true });

  const restaurado = new Database(banco);
  try {
    restaurado.pragma("foreign_keys = ON");
    restaurado.prepare("DELETE FROM sessoes").run();
    restaurado.pragma("wal_checkpoint(TRUNCATE)");
  } finally {
    restaurado.close();
  }

  console.log("[Banco] Importação concluída antes da abertura do servidor.");
} catch (error) {
  console.error(`[Banco] Não foi possível aplicar a importação pendente: ${error.message}`);
  process.exit(1);
}
