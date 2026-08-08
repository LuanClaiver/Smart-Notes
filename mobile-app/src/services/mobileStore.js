import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

const DB_NAME = "smart-notes-mobile";
const DB_VERSION = 2;
const STORE_NAME = "app";
const STATE_KEY = "state";
const BACKUP_HISTORY_KEY = "smartNotesMobileBackups";
const AUTO_BACKUP_PREFIX = "auto-backup:";
const REGEX_NOME_EXIBICAO = /^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)*$/u;
const REGEX_USUARIO_LOGIN = /^[a-zA-Z0-9._-]{3,30}$/;

function normalizarNomeExibicao(valor) {
  return String(valor || "").normalize("NFC").trim().replace(/\s+/g, " ");
}

function nomeExibicaoValido(nome) {
  return nome.length >= 2 && nome.length <= 80 && REGEX_NOME_EXIBICAO.test(nome);
}

function usuarioLoginValido(usuario) {
  return REGEX_USUARIO_LOGIN.test(usuario);
}
let filaMutacoes = Promise.resolve();

const categoriasPadrao = [
  ["Atendimentos", "🧾", ["Redes", "Sistemas", "Impressoras", "Acesso", "Equipamentos"]],
  ["Trabalho", "💼", ["Rotina", "Pendências", "Reuniões", "Suporte"]],
  ["Projetos", "🚀", ["Backend", "Frontend", "Banco de dados", "Design"]],
  ["Documentação", "📚", ["Manuais", "Procedimentos", "Relatórios"]],
  ["Ideias", "💡", ["Melhorias", "Rascunhos", "Inspirações"]]
];

function apiError(erro, status = 400) {
  const falha = new Error(erro);
  falha.response = { status, data: { erro } };
  return falha;
}

function agora() {
  return new Date().toISOString();
}

function bytesAleatorios(tamanho = 24) {
  const bytes = new Uint8Array(tamanho);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (item) => item.toString(16).padStart(2, "0")).join("");
}

function hex(buffer) {
  return Array.from(new Uint8Array(buffer), (item) => item.toString(16).padStart(2, "0")).join("");
}

async function hashSenha(senha, salt = bytesAleatorios(16)) {
  const chave = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(String(senha)),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(salt), iterations: 100000 },
    chave,
    256
  );
  return `${salt}:${hex(bits)}`;
}

async function conferirSenha(senha, armazenada) {
  const [salt, hash] = String(armazenada || "").split(":");
  if (!salt || !hash) return false;
  return (await hashSenha(senha, salt)) === armazenada;
}

function abrirBanco() {
  return new Promise((resolve, reject) => {
    const requisicao = indexedDB.open(DB_NAME, DB_VERSION);
    requisicao.onupgradeneeded = () => {
      const banco = requisicao.result;
      if (!banco.objectStoreNames.contains(STORE_NAME)) banco.createObjectStore(STORE_NAME);
    };
    requisicao.onsuccess = () => resolve(requisicao.result);
    requisicao.onerror = () => reject(requisicao.error);
  });
}

async function lerChave(chave) {
  const banco = await abrirBanco();
  try {
    return await new Promise((resolve, reject) => {
      const transacao = banco.transaction(STORE_NAME, "readonly");
      const pedido = transacao.objectStore(STORE_NAME).get(chave);
      pedido.onsuccess = () => resolve(pedido.result);
      pedido.onerror = () => reject(pedido.error);
    });
  } finally {
    banco.close();
  }
}

async function gravarChave(chave, valor) {
  const banco = await abrirBanco();
  try {
    await new Promise((resolve, reject) => {
      const transacao = banco.transaction(STORE_NAME, "readwrite");
      transacao.objectStore(STORE_NAME).put(valor, chave);
      transacao.oncomplete = () => resolve();
      transacao.onerror = () => reject(transacao.error);
    });
  } finally {
    banco.close();
  }
}

async function criarEstadoInicial() {
  const criadoEm = agora();
  const admin = {
    id: 1,
    nome: "Administrador",
    usuario: "Admin",
    email: "admin@smartnotes.com",
    senhaHash: await hashSenha("1234"),
    tipoUsuario: "admin",
    fotoPerfil: "",
    codigoRecuperacao: null,
    codigoRecuperacaoExpiraEm: null,
    criadoEm,
    ultimoLogin: null,
    ativo: true
  };
  const categorias = [];
  const subcategorias = [];
  let categoriaId = 0;
  let subcategoriaId = 0;
  for (const [nome, icone, subs] of categoriasPadrao) {
    categoriaId += 1;
    categorias.push({ id: categoriaId, nome, icone, criadoPor: 1, criadoEm, ativo: true });
    for (const nomeSub of subs) {
      subcategoriaId += 1;
      subcategorias.push({ id: subcategoriaId, categoriaId, categoria: nome, nome: nomeSub, criadoPor: 1, criadoEm, ativo: true });
    }
  }
  return {
    format: "smart-notes-mobile",
    version: 6,
    counters: { usuario: 1, nota: 0, categoria: categoriaId, subcategoria: subcategoriaId, observacao: 0, pendencia: 0, pendenciaItem: 0 },
    usuarios: [admin],
    sessoes: [],
    notas: [],
    categorias,
    subcategorias,
    favoritos: [],
    fixadas: [],
    observacoes: [],
    acessosPrivados: [],
    pendencias: [],
    pendenciaItens: []
  };
}

function normalizarEstado(estado) {
  const base = estado && typeof estado === "object" ? estado : {};
  return {
    format: "smart-notes-mobile",
    version: 6,
    counters: {
      usuario: Number(base.counters?.usuario || Math.max(0, ...(base.usuarios || []).map((item) => Number(item.id) || 0))),
      nota: Number(base.counters?.nota || Math.max(0, ...(base.notas || []).map((item) => Number(item.id) || 0))),
      categoria: Number(base.counters?.categoria || Math.max(0, ...(base.categorias || []).map((item) => Number(item.id) || 0))),
      subcategoria: Number(base.counters?.subcategoria || Math.max(0, ...(base.subcategorias || []).map((item) => Number(item.id) || 0))),
      observacao: Number(base.counters?.observacao || Math.max(0, ...(base.observacoes || []).map((item) => Number(item.id) || 0))),
      pendencia: Number(base.counters?.pendencia || Math.max(0, ...(base.pendencias || []).map((item) => Number(item.id) || 0))),
      pendenciaItem: Number(base.counters?.pendenciaItem || Math.max(0, ...(base.pendenciaItens || []).map((item) => Number(item.id) || 0)))
    },
    usuarios: Array.isArray(base.usuarios) ? base.usuarios.map((item) => ({ ...item, nome: normalizarNomeExibicao(item.nome), usuario: String(item.usuario || "").trim() })) : [],
    sessoes: Array.isArray(base.sessoes) ? base.sessoes : [],
    notas: Array.isArray(base.notas) ? base.notas : [],
    categorias: Array.isArray(base.categorias) ? base.categorias : [],
    subcategorias: Array.isArray(base.subcategorias) ? base.subcategorias : [],
    favoritos: Array.isArray(base.favoritos) ? base.favoritos : [],
    fixadas: Array.isArray(base.fixadas) ? base.fixadas : [],
    observacoes: Array.isArray(base.observacoes) ? base.observacoes : [],
    acessosPrivados: Array.isArray(base.acessosPrivados) ? base.acessosPrivados : [],
    pendencias: Array.isArray(base.pendencias) ? base.pendencias.map((item) => ({
      ...item,
      escopo: item.escopo === "equipe" ? "equipe" : "individual",
      imagens: Array.isArray(item.imagens) ? item.imagens.filter(Boolean) : []
    })) : [],
    pendenciaItens: Array.isArray(base.pendenciaItens)
      ? base.pendenciaItens.map((item) => ({
          ...item,
          concluido: Boolean(item.concluido),
          concluidoPor: Number.isFinite(Number(item.concluidoPor)) && Number(item.concluidoPor) > 0
            ? Number(item.concluidoPor)
            : null,
          concluidoPorNome: item.concluidoPorNome ? String(item.concluidoPorNome) : null,
          concluidoEm: item.concluidoEm || null
        }))
      : []
  };
}

async function garantirBackupAutomatico(estado) {
  const dia = agora().slice(0, 10);
  const chave = `${AUTO_BACKUP_PREFIX}${dia}`;
  if (await lerChave(chave)) return;
  const conteudo = JSON.stringify(estado);
  await gravarChave(chave, conteudo);
  salvarHistorico({
    nome: `smart-notes-automatico-${dia}.json`,
    tamanho: new Blob([conteudo]).size,
    criadoEm: agora(),
    local: "Armazenamento interno",
    automatico: true
  });
}

async function obterEstado() {
  let estado = await lerChave(STATE_KEY);
  if (!estado) {
    estado = await criarEstadoInicial();
    await gravarChave(STATE_KEY, estado);
  }
  const normalizado = normalizarEstado(JSON.parse(JSON.stringify(estado)));
  const adminPadrao=normalizado.usuarios.find(u=>String(u.email).toLowerCase()==="admin@smartnotes.com"||String(u.usuario).toLowerCase()==="admin"); if(adminPadrao){adminPadrao.tipoUsuario="admin";adminPadrao.admin=true;adminPadrao.ativo=true;}
  await garantirBackupAutomatico(normalizado);
  return normalizado;
}

function mutarEstado(trabalho) {
  const executar = async () => {
    const estado = await obterEstado();
    const resultado = await trabalho(estado);
    await gravarChave(STATE_KEY, estado);
    return resultado;
  };
  filaMutacoes = filaMutacoes.then(executar, executar);
  return filaMutacoes;
}

function usuarioPublico(usuario) {
  return {
    id: Number(usuario.id),
    nome: usuario.nome,
    usuario: usuario.usuario,
    email: usuario.email,
    fotoPerfil: usuario.fotoPerfil || "",
    tipoUsuario: usuario.tipoUsuario === "admin" ? "admin" : "usuario",
    admin: usuario.tipoUsuario === "admin",
    ativo: Boolean(usuario.ativo),
    criadoEm: usuario.criadoEm,
    ultimoLogin: usuario.ultimoLogin || null
  };
}

function tokenUsuario(token) {
  if (!String(token || "").startsWith("mobile.")) return null;
  const id = Number(String(token).split(".")[1]);
  return Number.isFinite(id) ? id : null;
}

function usuarioAtualNoEstado(estado, token = localStorage.getItem("smartNotesToken")) {
  const sessao = estado.sessoes.find((item) => item.token === token && item.expiraEm > agora());
  const id = sessao?.usuarioId || tokenUsuario(token);
  const usuario = estado.usuarios.find((item) => Number(item.id) === Number(id) && item.ativo);
  if (!usuario) throw apiError("Sessão inválida ou expirada", 401);
  return usuario;
}

function exigirAdmin(usuario) {
  if (usuario.tipoUsuario !== "admin") throw apiError("Acesso permitido apenas para administradores", 403);
}

function validarImagens(valor, limite = 8) {
  const imagens = (Array.isArray(valor) ? valor : valor ? [valor] : []).map(String).filter(Boolean);
  if (imagens.length > limite) throw apiError(`Adicione no máximo ${limite} imagens.`);
  for (const imagem of imagens) {
    if (!imagem.startsWith("data:image/")) throw apiError("Formato de imagem inválido");
  }
  return imagens;
}

function notaVisivel(estado, nota, usuario) {
  return usuario.tipoUsuario === "admin" || Number(nota.usuarioId) === Number(usuario.id) || Boolean(nota.compartilhada);
}

function notaBloqueada(estado, nota, usuario) {
  if (!nota.compartilhada || !nota.compartilhamentoPrivado) return false;
  if (usuario.tipoUsuario === "admin" || Number(nota.usuarioId) === Number(usuario.id)) return false;
  return !estado.acessosPrivados.some((item) => Number(item.notaId) === Number(nota.id) && Number(item.usuarioId) === Number(usuario.id));
}

function normalizarNota(estado, nota, usuario) {
  const autor = estado.usuarios.find((item) => Number(item.id) === Number(nota.usuarioId));
  const bloqueada = notaBloqueada(estado, nota, usuario);
  const dono = Number(nota.usuarioId) === Number(usuario.id);
  const admin = usuario.tipoUsuario === "admin";
  const imagens = bloqueada ? [] : (Array.isArray(nota.imagens) ? nota.imagens : []);
  return {
    ...nota,
    autorNome: autor?.nome || "Usuário",
    autorEmail: autor?.email || "",
    autorFoto: autor?.fotoPerfil || "",
    conteudo: bloqueada ? "Esta nota compartilhada é protegida por senha." : nota.conteudo,
    imagens,
    imagem: imagens[0] || "",
    compartilhada: Boolean(nota.compartilhada),
    compartilhamentoPrivado: Boolean(nota.compartilhamentoPrivado),
    bloqueada,
    favorita: estado.favoritos.some((item) => item.notaId === nota.id && item.usuarioId === usuario.id),
    fixada: estado.fixadas.some((item) => item.notaId === nota.id && item.usuarioId === usuario.id),
    naLixeira: Boolean(nota.naLixeira),
    minhaNota: dono,
    podeEditar: (admin || dono) && !bloqueada,
    podeExcluir: (admin || dono) && !bloqueada,
    podeObservar: Boolean(nota.compartilhada) && !bloqueada,
    podeFavoritar: !bloqueada,
    podeFixar: !bloqueada
  };
}

function localizarNota(estado, id, usuario) {
  const nota = estado.notas.find((item) => Number(item.id) === Number(id));
  if (!nota || !notaVisivel(estado, nota, usuario)) throw apiError("Nota não encontrada", 404);
  return nota;
}

function resposta(data) {
  return Promise.resolve({ data });
}

export async function loginLocal({ identificador, email, usuario, senha }) {
  const estado = await obterEstado();
  const busca = String(identificador || usuario || email || "").trim().toLowerCase();
  const conta = estado.usuarios.find((item) => item.ativo && (String(item.usuario).toLowerCase() === busca || String(item.email).toLowerCase() === busca));
  if (!conta || !(await conferirSenha(senha, conta.senhaHash))) throw apiError("Usuário, e-mail ou senha incorretos", 401);
  return mutarEstado(async (atual) => {
    const usuarioAtual = atual.usuarios.find((item) => item.id === conta.id);
    usuarioAtual.ultimoLogin = agora();
    const token = `mobile.${conta.id}.${bytesAleatorios(24)}`;
    atual.sessoes = atual.sessoes.filter((item) => item.expiraEm > agora());
    atual.sessoes.push({ token, usuarioId: conta.id, criadoEm: agora(), expiraEm: new Date(Date.now() + 7 * 86400000).toISOString() });
    return { data: { usuario: usuarioPublico(usuarioAtual), token } };
  });
}

export async function cadastroLocal({ nome, usuario, email, senha }) {
  const nomeLimpo = normalizarNomeExibicao(nome);
  const login = String(usuario || "").trim();
  const emailLimpo = String(email || "").trim().toLowerCase();
  if (!nomeLimpo || !login || !emailLimpo || !senha) throw apiError("Preencha nome de exibição, nome de usuário, e-mail e senha");
  if (!nomeExibicaoValido(nomeLimpo)) throw apiError("O nome de exibição deve ter de 2 a 80 caracteres e pode usar letras, espaços, acentos, apóstrofo e hífen");
  if (!usuarioLoginValido(login)) throw apiError("O usuário deve ter de 3 a 30 caracteres e usar apenas letras, números, ponto, traço ou sublinhado");
  if (!emailLimpo.includes("@")) throw apiError("Informe um e-mail válido");
  if (String(senha).length < 4) throw apiError("A senha precisa ter pelo menos 4 caracteres");
  return mutarEstado(async (estado) => {
    const duplicado = estado.usuarios.some((item) => String(item.usuario).toLowerCase() === login.toLowerCase() || String(item.email).toLowerCase() === emailLimpo);
    if (duplicado) throw apiError("Este usuário ou e-mail já está cadastrado", 409);
    const id = ++estado.counters.usuario;
    const conta = { id, nome: nomeLimpo, usuario: login, email: emailLimpo, senhaHash: await hashSenha(senha), tipoUsuario: "usuario", fotoPerfil: "", criadoEm: agora(), ultimoLogin: agora(), ativo: true };
    estado.usuarios.push(conta);
    const token = `mobile.${id}.${bytesAleatorios(24)}`;
    estado.sessoes.push({ token, usuarioId: id, criadoEm: agora(), expiraEm: new Date(Date.now() + 7 * 86400000).toISOString() });
    return { data: { usuario: usuarioPublico(conta), token } };
  });
}

export async function recuperarSenhaLocal({ identificador, email }) {
  return mutarEstado(async (estado) => {
    const busca = String(identificador || email || "").trim().toLowerCase();
    const usuario = estado.usuarios.find((item) => item.ativo && (String(item.usuario).toLowerCase() === busca || String(item.email).toLowerCase() === busca));
    if (!usuario) throw apiError("Nenhum usuário ativo encontrado com esse usuário ou e-mail", 404);
    const codigo = String(Math.floor(100000 + Math.random() * 900000));
    usuario.codigoRecuperacao = codigo;
    usuario.codigoRecuperacaoExpiraEm = new Date(Date.now() + 20 * 60000).toISOString();
    return { data: { mensagem: "Código gerado", codigoDesenvolvimento: codigo } };
  });
}

export async function redefinirSenhaLocal({ identificador, email, codigo, novaSenha }) {
  return mutarEstado(async (estado) => {
    const busca = String(identificador || email || "").trim().toLowerCase();
    const usuario = estado.usuarios.find((item) => item.ativo && (String(item.usuario).toLowerCase() === busca || String(item.email).toLowerCase() === busca));
    if (!usuario) throw apiError("Usuário não encontrado", 404);
    if (!usuario.codigoRecuperacao || usuario.codigoRecuperacao !== String(codigo) || usuario.codigoRecuperacaoExpiraEm <= agora()) throw apiError("Código inválido ou expirado");
    if (String(novaSenha).length < 4) throw apiError("A nova senha precisa ter pelo menos 4 caracteres");
    usuario.senhaHash = await hashSenha(novaSenha);
    usuario.codigoRecuperacao = null;
    usuario.codigoRecuperacaoExpiraEm = null;
    return { data: { mensagem: "Senha redefinida com sucesso" } };
  });
}

export async function usuarioAtualLocal(token) {
  const estado = await obterEstado();
  return resposta({ usuario: usuarioPublico(usuarioAtualNoEstado(estado, token)) });
}

export async function logoutLocal(token) {
  return mutarEstado(async (estado) => {
    estado.sessoes = estado.sessoes.filter((item) => item.token !== token);
    return { data: { mensagem: "Sessão encerrada" } };
  });
}

export async function atualizarPerfilLocal(dados) {
  return mutarEstado(async (estado) => {
    const atual = usuarioAtualNoEstado(estado);
    const nome = normalizarNomeExibicao(dados.nome);
    const login = String(dados.usuario || atual.usuario || "").trim();
    if (!nomeExibicaoValido(nome)) throw apiError("Nome de exibição inválido. Use letras, espaços, acentos, apóstrofo e hífen");
    if (!usuarioLoginValido(login)) throw apiError("Nome de usuário inválido");
    if (estado.usuarios.some((item) => item.id !== atual.id && String(item.usuario).toLowerCase() === login.toLowerCase())) throw apiError("Este nome de usuário já está em uso", 409);
    atual.nome = nome;
    atual.usuario = login;
    atual.fotoPerfil = String(dados.fotoPerfil || "");
    return { data: { usuario: usuarioPublico(atual) } };
  });
}

export async function listarUsuariosLocal() {
  const estado = await obterEstado();
  exigirAdmin(usuarioAtualNoEstado(estado));
  return resposta(estado.usuarios.map((conta) => ({ ...usuarioPublico(conta), totalNotas: estado.notas.filter((nota) => Number(nota.usuarioId) === Number(conta.id)).length })).sort((a, b) => a.nome.localeCompare(b.nome)));
}

export async function editarUsuarioLocal(id, dados) {
  return mutarEstado(async (estado) => {
    const admin = usuarioAtualNoEstado(estado);
    exigirAdmin(admin);
    const usuario = estado.usuarios.find((item) => Number(item.id) === Number(id));
    if (!usuario) throw apiError("Usuário não encontrado", 404);
    const nome = normalizarNomeExibicao(dados.nome);
    const login = String(dados.usuario || "").trim();
    const email = String(dados.email || "").trim().toLowerCase();
    if (!nome || !login || !email) throw apiError("Preencha nome de exibição, nome de usuário e e-mail");
    if (!nomeExibicaoValido(nome)) throw apiError("Nome de exibição inválido. Use letras, espaços, acentos, apóstrofo e hífen");
    if (!usuarioLoginValido(login)) throw apiError("Nome de usuário inválido");
    if (!email.includes("@")) throw apiError("Informe um e-mail válido");
    if (estado.usuarios.some((item) => item.id !== usuario.id && (String(item.usuario).toLowerCase() === login.toLowerCase() || String(item.email).toLowerCase() === email))) throw apiError("Este usuário ou e-mail já está em uso", 409);
    if (usuario.id === admin.id && !dados.ativo) throw apiError("Você não pode desativar seu próprio usuário");
    Object.assign(usuario, { nome, usuario: login, email, tipoUsuario: dados.tipoUsuario === "admin" ? "admin" : "usuario", ativo: Boolean(dados.ativo) });
    return { data: { usuario: usuarioPublico(usuario) } };
  });
}



export async function excluirUsuarioLocal(id, { responsavelId } = {}) {
  return mutarEstado(async (estado) => {
    const admin = usuarioAtualNoEstado(estado);
    exigirAdmin(admin);
    const usuarioId = Number(id);
    const destinoId = Number(responsavelId || admin.id);

    if (usuarioId === Number(admin.id)) throw apiError("Você não pode excluir o usuário que está conectado");
    if (!Number.isInteger(destinoId) || destinoId === usuarioId) throw apiError("Selecione outro usuário ativo para receber as notas");

    const usuario = estado.usuarios.find((item) => Number(item.id) === usuarioId);
    if (!usuario) throw apiError("Usuário não encontrado", 404);
    const responsavel = estado.usuarios.find((item) => Number(item.id) === destinoId && item.ativo);
    if (!responsavel) throw apiError("Responsável não encontrado ou inativo", 404);

    const notasDoUsuario = estado.notas.filter((nota) => Number(nota.usuarioId) === usuarioId);
    for (const nota of notasDoUsuario) {
      nota.usuarioId = destinoId;
      nota.atualizadoEm = agora();
    }

    estado.usuarios = estado.usuarios.filter((item) => Number(item.id) !== usuarioId);
    estado.sessoes = estado.sessoes.filter((item) => Number(item.usuarioId) !== usuarioId);
    estado.favoritos = estado.favoritos.filter((item) => Number(item.usuarioId) !== usuarioId);
    estado.fixadas = estado.fixadas.filter((item) => Number(item.usuarioId) !== usuarioId);
    estado.observacoes = estado.observacoes.filter((item) => Number(item.usuarioId) !== usuarioId);
    estado.acessosPrivados = estado.acessosPrivados.filter((item) => Number(item.usuarioId) !== usuarioId);
    estado.categorias.forEach((item) => { if (Number(item.criadoPor) === usuarioId) item.criadoPor = null; });
    estado.subcategorias.forEach((item) => { if (Number(item.criadoPor) === usuarioId) item.criadoPor = null; });
    estado.pendencias.forEach((item) => {
      if (Number(item.criadoPor) === usuarioId) item.criadoPor = destinoId;
      if (Number(item.responsavelId) === usuarioId) item.responsavelId = destinoId;
    });
    estado.pendenciaItens.forEach((item) => {
      if (Number(item.concluidoPor) === usuarioId) {
        item.concluidoPorNome = item.concluidoPorNome || usuario.nome;
        item.concluidoPor = null;
      }
    });

    return {
      data: {
        mensagem: notasDoUsuario.length > 0
          ? `Usuário excluído. ${notasDoUsuario.length} nota(s) transferida(s) para ${responsavel.nome}.`
          : "Usuário excluído com sucesso.",
        notasTransferidas: notasDoUsuario.length
      }
    };
  });
}

export async function alterarSenhaUsuarioLocal(id, { novaSenha }) {
  return mutarEstado(async (estado) => {
    exigirAdmin(usuarioAtualNoEstado(estado));
    const usuario = estado.usuarios.find((item) => Number(item.id) === Number(id));
    if (!usuario) throw apiError("Usuário não encontrado", 404);
    if (String(novaSenha).length < 4) throw apiError("A senha precisa ter pelo menos 4 caracteres");
    usuario.senhaHash = await hashSenha(novaSenha);
    return { data: { mensagem: "Senha alterada" } };
  });
}

export async function carregarCategoriasLocal() {
  const estado = await obterEstado();
  usuarioAtualNoEstado(estado);
  const categorias = estado.categorias.filter((item) => item.ativo).sort((a, b) => a.nome.localeCompare(b.nome));
  const subcategorias = estado.subcategorias.filter((item) => item.ativo && categorias.some((cat) => cat.id === item.categoriaId)).map((item) => ({ ...item, categoria: categorias.find((cat) => cat.id === item.categoriaId)?.nome || item.categoria })).sort((a, b) => `${a.categoria}${a.nome}`.localeCompare(`${b.categoria}${b.nome}`));
  return resposta({ categorias, subcategorias });
}

export async function criarCategoriaLocal(dados) {
  return mutarEstado(async (estado) => {
    const usuario = usuarioAtualNoEstado(estado);
    const nome = normalizarNomeExibicao(dados.nome);
    if (!nome) throw apiError("Informe o nome da categoria");
    if (estado.categorias.some((item) => item.ativo && item.nome.toLowerCase() === nome.toLowerCase())) throw apiError("Essa categoria já existe", 409);
    estado.categorias.push({ id: ++estado.counters.categoria, nome, icone: String(dados.icone || "📁"), criadoPor: usuario.id, criadoEm: agora(), ativo: true });
    return { data: { mensagem: "Categoria criada" } };
  });
}

export async function criarSubcategoriaLocal(dados) {
  return mutarEstado(async (estado) => {
    const usuario = usuarioAtualNoEstado(estado);
    exigirAdmin(usuario);
    const categoria = estado.categorias.find((item) => item.ativo && item.nome.toLowerCase() === String(dados.categoria || "").trim().toLowerCase());
    const nome = normalizarNomeExibicao(dados.nome);
    if (!categoria || !nome) throw apiError("Informe categoria e subcategoria");
    const existente = estado.subcategorias.find((item) => item.categoriaId === categoria.id && item.nome.toLowerCase() === nome.toLowerCase());
    if (existente?.ativo) throw apiError("Essa subcategoria já existe nessa categoria", 409);
    if (existente) Object.assign(existente, { ativo: true, criadoPor: usuario.id, criadoEm: agora(), nome });
    else estado.subcategorias.push({ id: ++estado.counters.subcategoria, categoriaId: categoria.id, categoria: categoria.nome, nome, criadoPor: usuario.id, criadoEm: agora(), ativo: true });
    return { data: { mensagem: "Subcategoria criada" } };
  });
}

export async function editarSubcategoriaLocal(id, dados) {
  return mutarEstado(async (estado) => {
    const usuario = usuarioAtualNoEstado(estado);
    exigirAdmin(usuario);
    const item = estado.subcategorias.find((sub) => Number(sub.id) === Number(id) && sub.ativo);
    if (!item) throw apiError("Subcategoria não encontrada", 404);
    const novoNome = normalizarNomeExibicao(dados.nome);
    if (!novoNome) throw apiError("Informe o novo nome da subcategoria");
    const duplicada = estado.subcategorias.some((sub) => sub.ativo && sub.categoriaId === item.categoriaId && Number(sub.id) !== Number(item.id) && String(sub.nome).toLowerCase() === novoNome.toLowerCase());
    if (duplicada) throw apiError("Essa subcategoria já existe nessa categoria", 409);
    const nomeAnterior = item.nome;
    item.nome = novoNome;
    item.criadoPor = usuario.id;
    item.criadoEm = agora();
    const categoria = estado.categorias.find((cat) => cat.id === item.categoriaId);
    estado.notas.filter((nota) => nota.categoria === categoria?.nome && nota.subcategoria === nomeAnterior).forEach((nota) => {
      nota.subcategoria = novoNome;
      nota.atualizadoEm = agora();
    });
    return { data: { mensagem: "Subcategoria atualizada", subcategoria: { ...item, categoria: categoria?.nome || item.categoria } } };
  });
}

export async function excluirSubcategoriaLocal(dados) {
  return mutarEstado(async (estado) => {
    const usuario = usuarioAtualNoEstado(estado);
    exigirAdmin(usuario);
    const item = estado.subcategorias.find((sub) => Number(sub.id) === Number(dados.id)) || estado.subcategorias.find((sub) => sub.nome === dados.nome && sub.categoria === dados.categoria);
    if (!item) throw apiError("Subcategoria não encontrada", 404);
    item.ativo = false;
    const categoria = estado.categorias.find((cat) => cat.id === item.categoriaId);
    estado.notas.filter((nota) => nota.categoria === categoria?.nome && nota.subcategoria === item.nome).forEach((nota) => { nota.subcategoria = ""; nota.atualizadoEm = agora(); });
    return { data: { mensagem: "Subcategoria excluída" } };
  });
}

export async function carregarNotasLocal() {
  const estado = await obterEstado();
  const usuario = usuarioAtualNoEstado(estado);
  return resposta(estado.notas.filter((nota) => notaVisivel(estado, nota, usuario)).map((nota) => normalizarNota(estado, nota, usuario)));
}

export async function criarNotaLocal(dados) {
  return mutarEstado(async (estado) => {
    const usuario = usuarioAtualNoEstado(estado);
    const titulo = String(dados.titulo || "").trim();
    const conteudo = String(dados.conteudo || "").trim();
    if (!titulo || !conteudo) throw apiError("Preencha título e conteúdo");
    const compartilhada = Boolean(dados.compartilhada);
    const privada = compartilhada && Boolean(dados.compartilhamentoPrivado);
    const senha = String(dados.senhaCompartilhamento || "");
    if (privada && senha.length < 3) throw apiError("Informe uma senha para a nota pública protegida");
    const imagens = validarImagens(dados.imagens || dados.imagem || []);
    const nota = {
      id: ++estado.counters.nota,
      usuarioId: usuario.id,
      titulo,
      conteudo,
      categoria: String(dados.categoria || "Atendimentos"),
      subcategoria: String(dados.subcategoria || ""),
      compartilhada,
      compartilhamentoPrivado: privada,
      senhaCompartilhamentoHash: privada ? await hashSenha(senha) : null,
      imagens,
      imagem: imagens[0] || "",
      naLixeira: false,
      criadoEm: agora(),
      atualizadoEm: null
    };
    estado.notas.push(nota);
    return { data: normalizarNota(estado, nota, usuario) };
  });
}

export async function editarNotaLocal(id, dados) {
  return mutarEstado(async (estado) => {
    const usuario = usuarioAtualNoEstado(estado);
    const nota = localizarNota(estado, id, usuario);
    if (usuario.tipoUsuario !== "admin" && nota.usuarioId !== usuario.id) throw apiError("Você não pode editar nota de outro usuário", 403);
    const titulo = String(dados.titulo || "").trim();
    const conteudo = String(dados.conteudo || "").trim();
    if (!titulo || !conteudo) throw apiError("Preencha título e conteúdo");
    const compartilhada = Boolean(dados.compartilhada);
    const privada = compartilhada && Boolean(dados.compartilhamentoPrivado);
    const senha = String(dados.senhaCompartilhamento || "");
    if (privada && !nota.senhaCompartilhamentoHash && senha.length < 3) throw apiError("Informe uma senha para a nota pública protegida");
    const imagens = validarImagens(dados.imagens || dados.imagem || []);
    let responsavelId = Number(nota.usuarioId);

    if (usuario.tipoUsuario === "admin" && dados.responsavelId !== undefined) {
      const responsavel = estado.usuarios.find((item) => Number(item.id) === Number(dados.responsavelId) && item.ativo);
      if (!responsavel) throw apiError("Selecione um responsável ativo para a nota");
      responsavelId = Number(responsavel.id);
    }

    Object.assign(nota, {
      usuarioId: responsavelId,
      titulo,
      conteudo,
      categoria: String(dados.categoria || "Atendimentos"),
      subcategoria: String(dados.subcategoria || ""),
      compartilhada,
      compartilhamentoPrivado: privada,
      senhaCompartilhamentoHash: privada ? (senha ? await hashSenha(senha) : nota.senhaCompartilhamentoHash) : null,
      imagens,
      imagem: imagens[0] || "",
      atualizadoEm: agora()
    });
    if (!privada) estado.acessosPrivados = estado.acessosPrivados.filter((item) => item.notaId !== nota.id);
    return { data: normalizarNota(estado, nota, usuario) };
  });
}

export async function desbloquearNotaLocal(id, senha) {
  return mutarEstado(async (estado) => {
    const usuario = usuarioAtualNoEstado(estado);
    const nota = localizarNota(estado, id, usuario);
    if (nota.compartilhamentoPrivado && usuario.tipoUsuario !== "admin" && nota.usuarioId !== usuario.id) {
      if (!(await conferirSenha(senha, nota.senhaCompartilhamentoHash))) throw apiError("Senha da nota incorreta", 401);
      if (!estado.acessosPrivados.some((item) => item.notaId === nota.id && item.usuarioId === usuario.id)) estado.acessosPrivados.push({ notaId: nota.id, usuarioId: usuario.id, criadoEm: agora() });
    }
    return { data: normalizarNota(estado, nota, usuario) };
  });
}

async function alterarNotaSimples(id, operacao) {
  return mutarEstado(async (estado) => {
    const usuario = usuarioAtualNoEstado(estado);
    const nota = localizarNota(estado, id, usuario);
    if (usuario.tipoUsuario !== "admin" && nota.usuarioId !== usuario.id) throw apiError("Você não pode alterar nota de outro usuário", 403);
    operacao(nota, estado, usuario);
    return { data: normalizarNota(estado, nota, usuario) };
  });
}

export const excluirNotaLocal = (id) => alterarNotaSimples(id, (nota) => { nota.naLixeira = true; nota.atualizadoEm = agora(); });
export const restaurarNotaLocal = (id) => alterarNotaSimples(id, (nota) => { nota.naLixeira = false; nota.atualizadoEm = agora(); });

export async function excluirDefinitivamenteLocal(id) {
  return mutarEstado(async (estado) => {
    const usuario = usuarioAtualNoEstado(estado);
    const nota = localizarNota(estado, id, usuario);
    if (usuario.tipoUsuario !== "admin" && nota.usuarioId !== usuario.id) throw apiError("Você não pode excluir nota de outro usuário", 403);
    estado.notas = estado.notas.filter((item) => item.id !== nota.id);
    estado.favoritos = estado.favoritos.filter((item) => item.notaId !== nota.id);
    estado.fixadas = estado.fixadas.filter((item) => item.notaId !== nota.id);
    estado.observacoes = estado.observacoes.filter((item) => item.notaId !== nota.id);
    estado.acessosPrivados = estado.acessosPrivados.filter((item) => item.notaId !== nota.id);
    return { data: { mensagem: "Nota excluída permanentemente" } };
  });
}

function alternarColecao(colecao, notaId, usuarioId) {
  const indice = colecao.findIndex((item) => item.notaId === notaId && item.usuarioId === usuarioId);
  if (indice >= 0) colecao.splice(indice, 1);
  else colecao.push({ notaId, usuarioId, criadoEm: agora() });
}

export async function alternarFavoritaLocal(id) {
  return mutarEstado(async (estado) => {
    const usuario = usuarioAtualNoEstado(estado);
    const nota = localizarNota(estado, id, usuario);
    if (notaBloqueada(estado, nota, usuario)) throw apiError("Desbloqueie a nota antes de favoritar", 403);
    alternarColecao(estado.favoritos, nota.id, usuario.id);
    return { data: normalizarNota(estado, nota, usuario) };
  });
}

export async function alternarFixadaLocal(id) {
  return mutarEstado(async (estado) => {
    const usuario = usuarioAtualNoEstado(estado);
    const nota = localizarNota(estado, id, usuario);
    if (notaBloqueada(estado, nota, usuario)) throw apiError("Desbloqueie a nota antes de fixar", 403);
    alternarColecao(estado.fixadas, nota.id, usuario.id);
    return { data: normalizarNota(estado, nota, usuario) };
  });
}

export async function carregarObservacoesLocal(id) {
  const estado = await obterEstado();
  const usuario = usuarioAtualNoEstado(estado);
  const nota = localizarNota(estado, id, usuario);
  if (notaBloqueada(estado, nota, usuario)) throw apiError("Desbloqueie a nota para ver as observações", 403);
  const lista = estado.observacoes.filter((item) => item.notaId === nota.id && item.ativo).sort((a, b) => b.id - a.id).map((item) => {
    const autor = estado.usuarios.find((conta) => conta.id === item.usuarioId);
    return { ...item, autorNome: autor?.nome || "Usuário", autorEmail: autor?.email || "", autorFoto: autor?.fotoPerfil || "", minhaObservacao: item.usuarioId === usuario.id, podeExcluir: usuario.tipoUsuario === "admin" || item.usuarioId === usuario.id };
  });
  return resposta(lista);
}

export async function criarObservacaoLocal(id, dados) {
  return mutarEstado(async (estado) => {
    const usuario = usuarioAtualNoEstado(estado);
    const nota = localizarNota(estado, id, usuario);
    if (!nota.compartilhada) throw apiError("Observações são usadas em notas públicas");
    if (notaBloqueada(estado, nota, usuario)) throw apiError("Desbloqueie a nota para comentar", 403);
    const texto = String(dados.texto || "").trim();
    const imagens = validarImagens(dados.imagens || [], 6);
    if (!texto && imagens.length === 0) throw apiError("Escreva uma observação ou adicione uma imagem");
    estado.observacoes.push({ id: ++estado.counters.observacao, notaId: nota.id, usuarioId: usuario.id, texto: texto || "Imagem adicionada", imagens, criadoEm: agora(), atualizadoEm: agora(), ativo: true });
    return { data: { mensagem: "Observação adicionada" } };
  });
}

export async function excluirObservacaoLocal(id, observacaoId) {
  return mutarEstado(async (estado) => {
    const usuario = usuarioAtualNoEstado(estado);
    localizarNota(estado, id, usuario);
    const observacao = estado.observacoes.find((item) => item.id === Number(observacaoId) && item.notaId === Number(id) && item.ativo);
    if (!observacao) throw apiError("Observação não encontrada", 404);
    if (usuario.tipoUsuario !== "admin" && observacao.usuarioId !== usuario.id) throw apiError("Você não pode remover essa observação", 403);
    observacao.ativo = false;
    return { data: { mensagem: "Observação removida" } };
  });
}

function historicoBackups() {
  try { return JSON.parse(localStorage.getItem(BACKUP_HISTORY_KEY) || "[]"); } catch { return []; }
}

function salvarHistorico(item) {
  const atual = [item, ...historicoBackups().filter((registro) => registro.nome !== item.nome)].slice(0, 30);
  localStorage.setItem(BACKUP_HISTORY_KEY, JSON.stringify(atual));
}

async function salvarArquivo(conteudo, nome, compartilhar = true) {
  if (Capacitor.isNativePlatform()) {
    const gravado = await Filesystem.writeFile({ path: `SmartNotes/${nome}`, data: conteudo, directory: Directory.Documents, encoding: Encoding.UTF8, recursive: true });
    if (compartilhar) {
      try { await Share.share({ title: "Banco do Smart Notes", text: "Cópia do banco local do Smart Notes", url: gravado.uri, dialogTitle: "Salvar ou compartilhar banco" }); } catch { /* arquivo já salvo */ }
    }
    return gravado.uri;
  }
  const blob = new Blob([conteudo], { type: "application/json" });
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
  return "Downloads";
}

export async function listarBackupsLocal() {
  const estado = await obterEstado();
  exigirAdmin(usuarioAtualNoEstado(estado));
  return historicoBackups();
}

export async function criarBackupLocal() {
  const estado = await obterEstado();
  exigirAdmin(usuarioAtualNoEstado(estado));
  const criadoEm = agora();
  const nome = `smart-notes-mobile-${criadoEm.slice(0, 10)}-${criadoEm.slice(11, 19).replace(/:/g, "-")}.json`;
  const conteudo = JSON.stringify(estado, null, 2);
  const local = await salvarArquivo(conteudo, nome, true);
  salvarHistorico({ nome, tamanho: new Blob([conteudo]).size, criadoEm, local });
  return { mensagem: "Backup criado e salvo", nome };
}

export async function exportarBancoLocal() {
  const estado = await obterEstado();
  exigirAdmin(usuarioAtualNoEstado(estado));
  const criadoEm = agora();
  const nome = `smart-notes-banco-${criadoEm.slice(0, 10)}-${criadoEm.slice(11, 19).replace(/:/g, "-")}.json`;
  await salvarArquivo(JSON.stringify(estado, null, 2), nome, true);
  return { nome };
}

export async function importarBancoLocal(arquivo) {
  const estadoAtual = await obterEstado();
  exigirAdmin(usuarioAtualNoEstado(estadoAtual));
  let dados;
  try { dados = JSON.parse(await arquivo.text()); } catch { throw apiError("O arquivo selecionado não é um banco válido do Smart Notes"); }
  if (dados?.format !== "smart-notes-mobile" || !Array.isArray(dados.usuarios) || !Array.isArray(dados.notas)) throw apiError("O arquivo não pertence ao Smart Notes ou está incompleto");
  const backupAntes = `smart-notes-antes-importacao-${Date.now()}.json`;
  await salvarArquivo(JSON.stringify(estadoAtual, null, 2), backupAntes, false);
  const importado = normalizarEstado(dados);
  importado.sessoes = [];
  await gravarChave(STATE_KEY, importado);
  localStorage.removeItem("smartNotesToken");
  localStorage.removeItem("smartNotesUsuario");
  return { mensagem: "Banco importado com sucesso.", backupSeguranca: backupAntes, reiniciando: true };
}


function escopoPendenciaLocal(pendencia) {
  return pendencia?.escopo === "equipe" ? "equipe" : "individual";
}

function podeEditarPendenciaLocal(pendencia, usuario) {
  if (escopoPendenciaLocal(pendencia) === "equipe") return true;
  return usuario.tipoUsuario === "admin"
    || Number(pendencia.criadoPor) === Number(usuario.id)
    || Number(pendencia.responsavelId) === Number(usuario.id);
}

function podeExcluirPendenciaLocal(pendencia, usuario) {
  if (escopoPendenciaLocal(pendencia) === "equipe") {
    return usuario.tipoUsuario === "admin" || Number(pendencia.criadoPor) === Number(usuario.id);
  }
  return podeEditarPendenciaLocal(pendencia, usuario);
}

function pendenciaNormalizada(estado, pendencia, usuario) {
  const itens = estado.pendenciaItens
    .filter((item) => item.pendenciaId === pendencia.id)
    .sort((a, b) => a.ordem - b.ordem)
    .map((item) => {
      const concluidor = estado.usuarios.find((usuarioItem) => Number(usuarioItem.id) === Number(item.concluidoPor));
      return {
        ...item,
        concluido: Boolean(item.concluido),
        concluidoPorNome: concluidor?.nome || item.concluidoPorNome || null
      };
    });
  const responsavel = estado.usuarios.find((item) => item.id === pendencia.responsavelId);
  const autor = estado.usuarios.find((item) => item.id === pendencia.criadoPor);
  const concluidos = itens.filter((item) => item.concluido).length;
  const total = itens.length;
  const escopo = escopoPendenciaLocal(pendencia);

  return {
    ...pendencia,
    escopo,
    imagens: Array.isArray(pendencia.imagens) ? pendencia.imagens : [],
    itens,
    responsavelNome: responsavel?.nome || "Usuário",
    autorNome: autor?.nome || "Usuário",
    concluidos,
    total,
    progresso: total ? Math.round((concluidos * 100) / total) : 0,
    podeEditar: podeEditarPendenciaLocal({ ...pendencia, escopo }, usuario),
    podeExcluir: podeExcluirPendenciaLocal({ ...pendencia, escopo }, usuario),
    podeAlterarEscopo: usuario.tipoUsuario === "admin" || Number(pendencia.criadoPor) === Number(usuario.id)
  };
}

export async function listarPendenciasLocal() {
  const estado = await obterEstado();
  const usuario = usuarioAtualNoEstado(estado);
  const lista = estado.pendencias.filter((pendencia) => pendencia.ativo && (
    usuario.tipoUsuario === "admin"
    || escopoPendenciaLocal(pendencia) === "equipe"
    || Number(pendencia.criadoPor) === Number(usuario.id)
    || Number(pendencia.responsavelId) === Number(usuario.id)
  ));
  return resposta(lista.map((pendencia) => pendenciaNormalizada(estado, pendencia, usuario)));
}

export async function criarPendenciaLocal(dados) {
  return mutarEstado(async (estado) => {
    const usuario = usuarioAtualNoEstado(estado);
    const titulo = String(dados.titulo || "").trim();
    if (!titulo) throw apiError("Informe o título da pendência");
    const imagens = validarImagens(dados.imagens || [], 6);

    let responsavelId = usuario.id;
    if (usuario.tipoUsuario === "admin" && dados.responsavelId) {
      responsavelId = Number(dados.responsavelId);
    }
    const responsavel = estado.usuarios.find((item) => item.id === responsavelId && item.ativo);
    if (!responsavel) throw apiError("Responsável inválido ou inativo");

    const id = ++estado.counters.pendencia;
    const instante = agora();
    const pendencia = {
      id,
      titulo,
      descricao: String(dados.descricao || ""),
      imagens,
      status: ["a_fazer", "em_andamento", "concluido"].includes(dados.status) ? dados.status : "a_fazer",
      escopo: dados.escopo === "equipe" ? "equipe" : "individual",
      criadoPor: usuario.id,
      responsavelId,
      criadoEm: instante,
      atualizadoEm: instante,
      ativo: true
    };
    estado.pendencias.push(pendencia);

    (Array.isArray(dados.itens) ? dados.itens : []).forEach((item, ordem) => {
      const texto = String(item.texto || "").trim();
      if (!texto) return;
      const concluido = Boolean(item.concluido);
      estado.pendenciaItens.push({
        id: ++estado.counters.pendenciaItem,
        pendenciaId: id,
        texto,
        concluido,
        concluidoPor: concluido ? usuario.id : null,
        concluidoPorNome: concluido ? usuario.nome : null,
        concluidoEm: concluido ? instante : null,
        ordem,
        criadoEm: instante,
        atualizadoEm: instante
      });
    });

    const itensCriados = estado.pendenciaItens.filter((item) => Number(item.pendenciaId) === Number(id));
    if (itensCriados.length > 0 && itensCriados.every((item) => Boolean(item.concluido))) {
      pendencia.status = "concluido";
    }

    return resposta(pendenciaNormalizada(estado, pendencia, usuario));
  });
}

export async function editarPendenciaLocal(id, dados) {
  return mutarEstado(async (estado) => {
    const usuario = usuarioAtualNoEstado(estado);
    const pendencia = estado.pendencias.find((item) => item.id === Number(id) && item.ativo);
    if (!pendencia) throw apiError("Pendência não encontrada", 404);
    if (!podeEditarPendenciaLocal(pendencia, usuario)) throw apiError("Sem permissão", 403);

    const titulo = String(dados.titulo ?? pendencia.titulo).trim();
    if (!titulo) throw apiError("Informe o título da pendência");

    pendencia.titulo = titulo;
    pendencia.descricao = String(dados.descricao ?? pendencia.descricao);
    if (dados.imagens !== undefined) {
      pendencia.imagens = validarImagens(dados.imagens || [], 6);
    } else if (!Array.isArray(pendencia.imagens)) {
      pendencia.imagens = [];
    }
    if (["a_fazer", "em_andamento", "concluido"].includes(dados.status)) {
      pendencia.status = dados.status;
    }
    if ((usuario.tipoUsuario === "admin" || Number(pendencia.criadoPor) === Number(usuario.id)) && ["individual", "equipe"].includes(dados.escopo)) {
      pendencia.escopo = dados.escopo;
    }
    if (usuario.tipoUsuario === "admin" && dados.responsavelId !== undefined) {
      const responsavel = estado.usuarios.find((item) => item.id === Number(dados.responsavelId) && item.ativo);
      if (!responsavel) throw apiError("Responsável inválido");
      pendencia.responsavelId = responsavel.id;
    }
    pendencia.atualizadoEm = agora();

    if (Array.isArray(dados.itens)) {
      const atuais = estado.pendenciaItens.filter((item) => Number(item.pendenciaId) === Number(pendencia.id));
      const atuaisPorId = new Map(atuais.map((item) => [Number(item.id), item]));
      const idsMantidos = new Set();

      dados.itens.forEach((item, ordem) => {
        const texto = String(item.texto || "").trim();
        if (!texto) return;

        const idRecebido = Number(item.id);
        const atual = Number.isInteger(idRecebido) ? atuaisPorId.get(idRecebido) : null;
        const concluido = Boolean(item.concluido);
        const instante = agora();

        if (atual) {
          const estavaConcluido = Boolean(atual.concluido);
          atual.texto = texto;
          atual.concluido = concluido;
          atual.ordem = ordem;
          atual.atualizadoEm = instante;

          if (!concluido) {
            atual.concluidoPor = null;
            atual.concluidoPorNome = null;
            atual.concluidoEm = null;
          } else if (!estavaConcluido) {
            atual.concluidoPor = usuario.id;
            atual.concluidoPorNome = usuario.nome;
            atual.concluidoEm = instante;
          }

          idsMantidos.add(Number(atual.id));
          return;
        }

        const novo = {
          id: ++estado.counters.pendenciaItem,
          pendenciaId: pendencia.id,
          texto,
          concluido,
          concluidoPor: concluido ? usuario.id : null,
          concluidoPorNome: concluido ? usuario.nome : null,
          concluidoEm: concluido ? instante : null,
          ordem,
          criadoEm: instante,
          atualizadoEm: instante
        };
        estado.pendenciaItens.push(novo);
        idsMantidos.add(Number(novo.id));
      });

      estado.pendenciaItens = estado.pendenciaItens.filter((item) => (
        Number(item.pendenciaId) !== Number(pendencia.id) || idsMantidos.has(Number(item.id))
      ));

      const itensAtuais = estado.pendenciaItens.filter((item) => Number(item.pendenciaId) === Number(pendencia.id));
      if (itensAtuais.length > 0 && itensAtuais.every((item) => Boolean(item.concluido))) {
        pendencia.status = "concluido";
      }
    }

    return resposta(pendenciaNormalizada(estado, pendencia, usuario));
  });
}

export async function moverPendenciaLocal(id, status) {
  return editarPendenciaLocal(id, { status });
}

export async function excluirPendenciaLocal(id) {
  return mutarEstado(async (estado) => {
    const usuario = usuarioAtualNoEstado(estado);
    const pendencia = estado.pendencias.find((item) => item.id === Number(id) && item.ativo);
    if (!pendencia) throw apiError("Pendência não encontrada", 404);
    if (!podeExcluirPendenciaLocal(pendencia, usuario)) {
      throw apiError("Somente o criador ou um administrador pode excluir esta pendência da equipe", 403);
    }
    pendencia.ativo = false;
    pendencia.atualizadoEm = agora();
    return resposta({ mensagem: "Pendência excluída" });
  });
}

export { apiError };
