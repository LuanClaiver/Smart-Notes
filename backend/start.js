const { spawnSync } = require("child_process");
const path = require("path");

const node = process.execPath;
const diretorio = __dirname;

function executar(arquivo) {
  return spawnSync(node, [path.join(diretorio, arquivo)], {
    cwd: diretorio,
    stdio: "inherit",
    windowsHide: false
  });
}

while (true) {
  const importacao = executar("apply-pending-import.js");

  if (importacao.error) {
    console.error(`[Banco] Falha ao iniciar a etapa de importação: ${importacao.error.message}`);
    process.exit(1);
  }

  if (importacao.status !== 0) {
    process.exit(importacao.status || 1);
  }

  const servidor = executar("server.js");

  if (servidor.error) {
    console.error(`[Servidor] Falha ao iniciar: ${servidor.error.message}`);
    process.exit(1);
  }

  if (servidor.status === 75) {
    console.log("[Servidor] Reiniciando para concluir a importação do banco...");
    continue;
  }

  process.exit(servidor.status || 0);
}
