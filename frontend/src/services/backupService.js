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

export async function listarBackupsService() {
  const resposta = await fetch(`${API_URL}/backups`, { headers: headers() });
  if (!resposta.ok) throw new Error(await lerErro(resposta, "Não foi possível listar os backups"));
  return resposta.json();
}

export async function criarBackupService() {
  const resposta = await fetch(`${API_URL}/backups`, { method: "POST", headers: headers() });
  if (!resposta.ok) throw new Error(await lerErro(resposta, "Não foi possível criar o backup"));
  return resposta.json();
}

export async function exportarBancoService() {
  const resposta = await fetch(`${API_URL}/backups/export-database`, { headers: headers() });
  if (!resposta.ok) throw new Error(await lerErro(resposta, "Não foi possível exportar o banco"));
  const blob = await resposta.blob();
  const disposicao = resposta.headers.get("content-disposition") || "";
  const nome = disposicao.match(/filename="?([^";]+)"?/i)?.[1] || `smart-notes-${new Date().toISOString().slice(0, 10)}.db`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return { nome };
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
