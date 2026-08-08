const API_URL = `http://${window.location.hostname}:3000`;

function headers(extra = {}) {
  return {
    Authorization: `Bearer ${localStorage.getItem("smartNotesToken")}`,
    ...extra
  };
}

async function lerErro(resposta, fallback) {
  try {
    const dados = await resposta.json();
    return dados.erro || fallback;
  } catch {
    return fallback;
  }
}

function nomeDoDownload(disposicao) {
  const utf8 = disposicao.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (utf8) {
    try { return decodeURIComponent(utf8.trim()); } catch { /* usa o nome simples abaixo */ }
  }

  const simples = disposicao.match(/filename="?([^";]+)"?/i)?.[1];
  return simples?.trim() || `smart-notes-${new Date().toISOString().slice(0, 10)}.db`;
}

async function validarSQLite(blob) {
  if (!(blob instanceof Blob) || blob.size < 100) {
    throw new Error("O servidor retornou um arquivo de banco vazio ou incompleto.");
  }

  const assinatura = new TextDecoder().decode(await blob.slice(0, 16).arrayBuffer());
  if (assinatura !== "SQLite format 3\u0000") {
    throw new Error("O arquivo recebido não é um banco SQLite válido.");
  }
}

function baixarBlob(blob, nome) {
  if (typeof navigator.msSaveOrOpenBlob === "function") {
    navigator.msSaveOrOpenBlob(blob, nome);
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  link.rel = "noopener";
  link.style.position = "fixed";
  link.style.left = "-9999px";
  document.body.appendChild(link);

  try {
    link.click();
  } finally {
    window.setTimeout(() => {
      link.remove();
      URL.revokeObjectURL(url);
    }, 2000);
  }
}


function aguardar(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export async function aguardarReinicioServidorService() {
  // O backend encerra a instância atual, aplica o banco pendente e sobe novamente.
  // O atraso inicial evita confundir a instância antiga com a nova.
  await aguardar(1400);

  for (let tentativa = 0; tentativa < 80; tentativa += 1) {
    try {
      const resposta = await fetch(`${API_URL}/status?ts=${Date.now()}`, {
        method: "GET",
        cache: "no-store"
      });

      if (resposta.ok) {
        const dados = await resposta.json();
        if (dados?.online) return true;
      }
    } catch {
      // Durante a substituição do banco é esperado que o servidor fique indisponível.
    }

    await aguardar(500);
  }

  throw new Error("O banco foi recebido, mas o servidor não reiniciou. Feche o Smart Notes, abra novamente pelo BAT e tente entrar.");
}

export async function listarBackupsService() {
  const resposta = await fetch(`${API_URL}/backups`, { headers: headers(), cache: "no-store" });
  if (!resposta.ok) throw new Error(await lerErro(resposta, "Não foi possível listar os backups"));
  return resposta.json();
}

export async function criarBackupService() {
  const resposta = await fetch(`${API_URL}/backups`, { method: "POST", headers: headers() });
  if (!resposta.ok) throw new Error(await lerErro(resposta, "Não foi possível criar o backup"));
  return resposta.json();
}

export async function exportarBancoService() {
  const resposta = await fetch(`${API_URL}/backups/export-database?ts=${Date.now()}`, {
    method: "GET",
    headers: headers({ Accept: "application/vnd.sqlite3,application/octet-stream" }),
    cache: "no-store"
  });

  if (!resposta.ok) {
    throw new Error(await lerErro(resposta, "Não foi possível exportar o banco"));
  }

  const blob = await resposta.blob();
  await validarSQLite(blob);

  const nome = nomeDoDownload(resposta.headers.get("content-disposition") || "");
  baixarBlob(blob, nome);
  return { nome, tamanho: blob.size };
}

export async function importarBancoService(arquivo) {
  const resposta = await fetch(`${API_URL}/backups/import-database`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/octet-stream" }),
    body: await arquivo.arrayBuffer()
  });
  if (!resposta.ok) throw new Error(await lerErro(resposta, "Não foi possível importar o banco"));
  return resposta.json();
}
