import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

const DB_NAME = "smart-notes-mobile";
const DB_VERSION = 1;
const STORE_NAME = "app";
const STATE_KEY = "state";
const BACKUP_HISTORY_KEY = "smartNotesMobileBackups";
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
    version: 1,
    counters: { usuario: 1, nota: 0, categoria: categoriaId, subcategoria: subcategoriaId, observacao: 0 },
    usuarios: [admin],
    sessoes: [],
    notas: [],
    categorias,
    subcategorias,
    favoritos: [],
    fixadas: [],
    observacoes: [],
    acessosPrivados: []
  };
}

function normalizarEstado(estado) {
  const base = estado && typeof estado === "object" ? estado : {};
  return {
    format: "smart-notes-mobile",
    version: 1,
    counters: {
      usuario: Number(base.counters?.usuario || Math.max(0, ...(base.usuarios || []).map((item) => Number(item.id) || 0))),
      nota: Number(base.counters?.nota || Math.max(0, ...(base.notas || []).map((item) => Number(item.id) || 0))),
      categoria: Number(base.counters?.categoria || Math.max(0, ...(base.categorias || []).map((item) => Number(item.id) || 0))),
      subcategoria: Number(base.counters?.subcategoria || Math.max(0, ...(base.subcategorias || []).map((item) => Number(item.id) || 0))),
      observacao: Number(base.counters?.observacao || Math.max(0, ...(base.observacoes || []).map((item) => Number(item.id) || 0)))
    },
    usuarios: Array.isArray(base.usuarios) ? base.usuarios : [],
    sessoes: Array.isArray(base.sessoes) ? base.sessoes : [],
    notas: Array.isArray(base.notas) ? base.notas : [],
    categorias: Array.isArray(base.categorias) ? base.categorias : [],
    subcategorias: Array.isArray(base.subcategorias) ? base.subcategorias : [],
    favoritos: Array.isArray(base.favoritos) ? base.favoritos : [],
    fixadas: Array.isArray(base.fixadas) ? base.fixadas : [],
    observacoes: Array.isArray(base.observacoes) ? base.observacoes : [],
    acessosPrivados: Array.isArray(base.acessosPrivados) ? base.acessosPrivados : []
  };
}

async function obterEstado() {
  let estado = await lerChave(STATE_KEY);
  if (!estado) {
    estado = await criarEstadoInicial();
    await gravarChave(STATE_KEY, estado);
  }
  return normalizarEstado(JSON.parse(JSON.stringify(estado)));
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
  const nomeLimpo = String(nome || "").trim();
  const login = String(usuario || "").trim();
  const emailLimpo = String(email || "").trim().toLowerCase();
  if (!nomeLimpo || !login || !emailLimpo || !senha) throw apiError("Preencha nome, usuário, e-mail e senha");
  if (!/^[a-zA-Z0-9._-]{3,30}$/.test(login)) throw apiError("O usuário deve ter de 3 a 30 caracteres e usar apenas letras, números, ponto, traço ou sublinhado");
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
    const nome = String(dados.nome || "").trim();
    const login = String(dados.usuario || atual.usuario || "").trim();
    if (!nome || !/^[a-zA-Z0-9._-]{3,30}$/.test(login)) throw apiError("Informe nome e usuário válidos");
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
  return resposta(estado.usuarios.map(usuarioPublico).sort((a, b) => a.nome.localeCompare(b.nome)));
}

export async function editarUsuarioLocal(id, dados) {
  return mutarEstado(async (estado) => {
    const admin = usuarioAtualNoEstado(estado);
    exigirAdmin(admin);
    const usuario = estado.usuarios.find((item) => Number(item.id) === Number(id));
    if (!usuario) throw apiError("Usuário não encontrado", 404);
    const login = String(dados.usuario || "").trim();
    const email = String(dados.email || "").trim().toLowerCase();
    if (!dados.nome || !login || !email) throw apiError("Preencha nome, usuário e e-mail");
    if (estado.usuarios.some((item) => item.id !== usuario.id && (String(item.usuario).toLowerCase() === login.toLowerCase() || String(item.email).toLowerCase() === email))) throw apiError("Este usuário ou e-mail já está em uso", 409);
    if (usuario.id === admin.id && !dados.ativo) throw apiError("Você não pode desativar seu próprio usuário");
    Object.assign(usuario, { nome: String(dados.nome).trim(), usuario: login, email, tipoUsuario: dados.tipoUsuario === "admin" ? "admin" : "usuario", ativo: Boolean(dados.ativo) });
    return { data: { usuario: usuarioPublico(usuario) } };
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
    const nome = String(dados.nome || "").trim();
    if (!nome) throw apiError("Informe o nome da categoria");
    if (estado.categorias.some((item) => item.ativo && item.nome.toLowerCase() === nome.toLowerCase())) throw apiError("Essa categoria já existe", 409);
    estado.categorias.push({ id: ++estado.counters.categoria, nome, icone: String(dados.icone || "📁"), criadoPor: usuario.id, criadoEm: agora(), ativo: true });
    return { data: { mensagem: "Categoria criada" } };
  });
}

export async function criarSubcategoriaLocal(dados) {
  return mutarEstado(async (estado) => {
    const usuario = usuarioAtualNoEstado(estado);
    const categoria = estado.categorias.find((item) => item.ativo && item.nome.toLowerCase() === String(dados.categoria || "").trim().toLowerCase());
    const nome = String(dados.nome || "").trim();
    if (!categoria || !nome) throw apiError("Informe categoria e subcategoria");
    const existente = estado.subcategorias.find((item) => item.categoriaId === categoria.id && item.nome.toLowerCase() === nome.toLowerCase());
    if (existente?.ativo) throw apiError("Essa subcategoria já existe nessa categoria", 409);
    if (existente) Object.assign(existente, { ativo: true, criadoPor: usuario.id, criadoEm: agora(), nome });
    else estado.subcategorias.push({ id: ++estado.counters.subcategoria, categoriaId: categoria.id, categoria: categoria.nome, nome, criadoPor: usuario.id, criadoEm: agora(), ativo: true });
    return { data: { mensagem: "Subcategoria criada" } };
  });
}

export async function excluirSubcategoriaLocal(dados) {
  return mutarEstado(async (estado) => {
    const usuario = usuarioAtualNoEstado(estado);
    const item = estado.subcategorias.find((sub) => Number(sub.id) === Number(dados.id)) || estado.subcategorias.find((sub) => sub.nome === dados.nome && sub.categoria === dados.categoria);
    if (!item) throw apiError("Subcategoria não encontrada", 404);
    if (usuario.tipoUsuario !== "admin" && Number(item.criadoPor) !== Number(usuario.id)) throw apiError("Você não pode excluir essa subcategoria", 403);
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
    Object.assign(nota, {
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
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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

export { apiError };
