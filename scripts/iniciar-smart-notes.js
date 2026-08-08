const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const http = require("http");
const path = require("path");

const raiz = path.resolve(__dirname, "..");
const backend = path.join(raiz, "backend");
const frontend = path.join(raiz, "frontend");
const npm = "npm";

function comandoNpm(argumentos) {
  if (process.platform === "win32") {
    return {
      comando: process.env.ComSpec || "cmd.exe",
      argumentos: ["/d", "/s", "/c", npm, ...argumentos]
    };
  }
  return { comando: npm, argumentos };
}
const filhos = new Set();
let encerrando = false;

function log(mensagem) {
  console.log(`[Smart Notes] ${mensagem}`);
}

function falhar(mensagem) {
  console.error(`[ERRO] ${mensagem}`);
  process.exitCode = 1;
}

function existe(caminho) {
  try { return fs.existsSync(caminho); } catch { return false; }
}

function executarInstalacao(nome, diretorio) {
  const marcador = path.join(diretorio, "node_modules", ".package-lock.json");
  if (existe(marcador)) {
    log(`Dependências do ${nome} já estão instaladas.`);
    return true;
  }

  log(`Instalando dependências do ${nome} na mesma janela...`);
  const chamada = comandoNpm(["install", "--no-audit", "--no-fund"]);
  const resultado = spawnSync(chamada.comando, chamada.argumentos, {
    cwd: diretorio,
    stdio: "inherit",
    windowsHide: true,
    shell: false
  });

  if (resultado.error || resultado.status !== 0) {
    falhar(`Falha ao instalar as dependências do ${nome}.`);
    return false;
  }
  return true;
}

function requisicao(url, validar) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 1200 }, (res) => {
      let corpo = "";
      res.setEncoding("utf8");
      res.on("data", (parte) => { corpo += parte; });
      res.on("end", () => resolve(res.statusCode >= 200 && res.statusCode < 500 && (!validar || validar(corpo))));
    });
    req.on("timeout", () => { req.destroy(); resolve(false); });
    req.on("error", () => resolve(false));
  });
}

const backendAtivo = () => requisicao("http://127.0.0.1:3000/status", (corpo) => {
  try { return JSON.parse(corpo).app === "Smart Notes"; } catch { return false; }
});
const frontendAtivo = () => requisicao("http://127.0.0.1:5173", (corpo) => /Smart Notes/i.test(corpo));

function iniciarProcesso(nome, argumentos, diretorio) {
  log(`Iniciando ${nome}...`);
  const chamada = comandoNpm(argumentos);
  const filho = spawn(chamada.comando, chamada.argumentos, {
    cwd: diretorio,
    stdio: "inherit",
    windowsHide: true,
    shell: false
  });
  filhos.add(filho);

  filho.on("error", (erro) => {
    falhar(`Não foi possível iniciar ${nome}: ${erro.message}`);
    encerrarTudo(1);
  });

  filho.on("exit", (codigo, sinal) => {
    filhos.delete(filho);
    if (encerrando) return;
    const detalhe = sinal ? `sinal ${sinal}` : `código ${codigo}`;
    falhar(`${nome} foi encerrado inesperadamente (${detalhe}).`);
    encerrarTudo(codigo || 1);
  });

  return filho;
}

function matarArvore(filho) {
  if (!filho?.pid) return;
  try {
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/PID", String(filho.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    } else {
      filho.kill("SIGTERM");
    }
  } catch { /* processo já encerrado */ }
}

function encerrarTudo(codigo = 0) {
  if (encerrando) return;
  encerrando = true;
  for (const filho of filhos) matarArvore(filho);
  filhos.clear();
  process.exit(codigo);
}

function aguardar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function abrirNavegador() {
  const url = "http://localhost:5173";
  try {
    if (process.platform === "win32") {
      spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore", windowsHide: true }).unref();
    } else if (process.platform === "darwin") {
      spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
    } else {
      spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
    }
  } catch {
    log(`Abra manualmente: ${url}`);
  }
}

async function principal() {
  process.title = "Smart Notes 1.5.4";
  console.log("============================================");
  console.log(" Smart Notes 1.5.4 - Inicializador único");
  console.log(" Backend e frontend usam esta mesma janela.");
  console.log("============================================\n");

  for (const [nome, diretorio] of [["backend", backend], ["frontend", frontend]]) {
    if (!existe(path.join(diretorio, "package.json"))) {
      falhar(`A pasta ${nome} não foi encontrada em ${diretorio}.`);
      return;
    }
  }

  const [backendJaAtivo, frontendJaAtivo] = await Promise.all([backendAtivo(), frontendAtivo()]);
  if (backendJaAtivo && frontendJaAtivo) {
    log("O Smart Notes já está em execução. Abrindo o navegador sem criar outra instância.");
    abrirNavegador();
    return;
  }

  if (!executarInstalacao("backend", backend)) return;
  if (!executarInstalacao("frontend", frontend)) return;

  if (!backendJaAtivo) iniciarProcesso("backend", ["start"], backend);
  else log("Backend já estava ativo na porta 3000.");

  if (!frontendJaAtivo) iniciarProcesso("frontend", ["run", "dev", "--", "--host", "0.0.0.0"], frontend);
  else log("Frontend já estava ativo na porta 5173.");

  log("Aguardando os serviços ficarem disponíveis...");
  let pronto = false;
  for (let tentativa = 1; tentativa <= 60; tentativa += 1) {
    const [backOk, frontOk] = await Promise.all([backendAtivo(), frontendAtivo()]);
    if (backOk && frontOk) {
      pronto = true;
      break;
    }
    await aguardar(1000);
  }

  if (!pronto) {
    falhar("Os serviços não ficaram prontos em 60 segundos. Confira as mensagens acima.");
    encerrarTudo(1);
    return;
  }

  log("Smart Notes disponível em http://localhost:5173");
  abrirNavegador();
  log("Mantenha esta janela aberta. Pressione Ctrl+C para encerrar o sistema.");
}

process.on("SIGINT", () => encerrarTudo(0));
process.on("SIGTERM", () => encerrarTudo(0));
process.on("SIGHUP", () => encerrarTudo(0));

principal().catch((erro) => {
  falhar(erro.stack || erro.message);
  encerrarTudo(1);
});
