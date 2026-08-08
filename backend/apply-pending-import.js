const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const base = __dirname;
const banco = path.join(base, "notas.db");
const pendente = path.join(base, ".smart-notes-import-pending.db");
const info = path.join(base, ".smart-notes-import-pending.json");
const substituto = path.join(base, `.smart-notes-import-replacement-${process.pid}.db`);
const anterior = path.join(base, `.smart-notes-import-previous-${process.pid}.db`);

if (!fs.existsSync(pendente)) {
  process.exit(0);
}

function validarBanco(arquivo) {
  const teste = new Database(arquivo, { readonly: true, fileMustExist: true });

  try {
    const integridade = teste.pragma("integrity_check", { simple: true });
    if (String(integridade).toLowerCase() !== "ok") {
      throw new Error("O banco pendente falhou na verificação de integridade.");
    }

    const tabelas = new Set(
      teste
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
        .all()
        .map((item) => item.name)
    );

    for (const tabela of ["usuarios", "notas"]) {
      if (!tabelas.has(tabela)) {
        throw new Error("O arquivo não pertence ao Smart Notes ou está incompleto.");
      }
    }
  } finally {
    teste.close();
  }
}

try {
  validarBanco(pendente);
  fs.copyFileSync(pendente, substituto);
  validarBanco(substituto);

  fs.rmSync(`${banco}-wal`, { force: true });
  fs.rmSync(`${banco}-shm`, { force: true });
  fs.rmSync(anterior, { force: true });

  if (fs.existsSync(banco)) {
    fs.renameSync(banco, anterior);
  }

  try {
    fs.renameSync(substituto, banco);
  } catch (error) {
    if (fs.existsSync(anterior) && !fs.existsSync(banco)) {
      fs.renameSync(anterior, banco);
    }
    throw error;
  }

  const restaurado = new Database(banco);
  try {
    const possuiSessoes = restaurado
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'sessoes'")
      .get();

    if (possuiSessoes) {
      restaurado.prepare("DELETE FROM sessoes").run();
    }

    restaurado.pragma("wal_checkpoint(TRUNCATE)");
  } finally {
    restaurado.close();
  }

  fs.rmSync(anterior, { force: true });
  fs.rmSync(pendente, { force: true });
  fs.rmSync(info, { force: true });

  console.log("[Banco] Importação concluída antes da abertura do servidor.");
} catch (error) {
  fs.rmSync(substituto, { force: true });
  if (fs.existsSync(anterior) && !fs.existsSync(banco)) {
    fs.renameSync(anterior, banco);
  }
  console.error(`[Banco] Não foi possível aplicar a importação pendente: ${error.message}`);
  process.exit(1);
}
