const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const { randomBytes, pbkdf2Sync, timingSafeEqual } = require("crypto");
const db = require("./database");

const app = express();

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

app.use(cors({ exposedHeaders: ["Content-Disposition", "Content-Length"] }));
app.use(express.json({ limit: "40mb" }));

function gerarHashSenha(senha, salt = randomBytes(16).toString("hex")) {
  const hash = pbkdf2Sync(
    senha,
    salt,
    100000,
    64,
    "sha512"
  ).toString("hex");

  return `${salt}:${hash}`;
}

function conferirSenha(senha, senhaHash) {
  const partes = String(senhaHash || "").split(":");

  if (partes.length !== 2) {
    return false;
  }

  const [salt, hashOriginal] = partes;
  const hashLimpo = String(hashOriginal || "").trim().toLowerCase();
  // O aplicativo mobile usa PBKDF2/SHA-256 (32 bytes) e o desktop usa
  // PBKDF2/SHA-512 (64 bytes). Aceitar os dois formatos mantém as senhas
  // válidas ao importar um backup JSON gerado no celular.
  const formatoMobile = /^[0-9a-f]{64}$/.test(hashLimpo);
  const formatoDesktop = /^[0-9a-f]{128}$/.test(hashLimpo);
  if (!formatoMobile && !formatoDesktop) return false;

  const hashDigitado = pbkdf2Sync(
    senha,
    salt,
    100000,
    formatoMobile ? 32 : 64,
    formatoMobile ? "sha256" : "sha512"
  ).toString("hex");

  try {
    return timingSafeEqual(
      Buffer.from(hashLimpo, "hex"),
      Buffer.from(hashDigitado, "hex")
    );
  } catch (error) {
    return false;
  }
}

function gerarCodigo() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function normalizarUsuario(usuario) {
  const tipoUsuario = usuario.tipoUsuario || "usuario";

  return {
    id: usuario.id,
    nome: usuario.nome,
    usuario: usuario.usuario || "",
    email: usuario.email,
    fotoPerfil: usuario.fotoPerfil || "",
    tipoUsuario,
    admin: tipoUsuario === "admin",
    ativo: Boolean(usuario.ativo),
    criadoEm: usuario.criadoEm,
    ultimoLogin: usuario.ultimoLogin,
    totalNotas: Number(usuario.totalNotas || 0)
  };
}

function lerImagens(valor, imagemAntiga = "") {
  if (Array.isArray(valor)) {
    return valor.filter(Boolean);
  }

  try {
    const imagens = JSON.parse(valor || "[]");

    if (Array.isArray(imagens)) {
      return imagens.filter(Boolean);
    }
  } catch (error) {
    return imagemAntiga ? [imagemAntiga] : [];
  }

  return imagemAntiga ? [imagemAntiga] : [];
}

function validarImagens(imagensRecebidas, limite = 8) {
  if (!imagensRecebidas) {
    return [];
  }

  const lista = Array.isArray(imagensRecebidas)
    ? imagensRecebidas
    : [imagensRecebidas];

  const imagens = lista
    .map((imagem) => String(imagem || ""))
    .filter(Boolean);

  if (imagens.length > limite) {
    throw new Error(`Adicione no máximo ${limite} imagens.`);
  }

  for (const imagem of imagens) {
    if (!imagem.startsWith("data:image/")) {
      throw new Error("Formato de imagem inválido");
    }

    if (imagem.length > 8 * 1024 * 1024) {
      throw new Error("Uma das imagens está muito grande. Use imagens menores.");
    }
  }

  return imagens;
}

function favoritoDoUsuario(notaId, usuarioId) {
  const favorito = db.prepare(`
    SELECT id
    FROM nota_favoritos
    WHERE notaId = ?
    AND usuarioId = ?
  `).get(notaId, usuarioId);

  return Boolean(favorito);
}

function fixadaDoUsuario(notaId, usuarioId) {
  const fixada = db.prepare(`
    SELECT id
    FROM nota_fixadas
    WHERE notaId = ?
    AND usuarioId = ?
  `).get(notaId, usuarioId);

  return Boolean(fixada);
}

function possuiAcessoPrivado(notaId, usuarioId) {
  const acesso = db.prepare(`
    SELECT id
    FROM nota_acessos_privados
    WHERE notaId = ?
    AND usuarioId = ?
  `).get(notaId, usuarioId);

  return Boolean(acesso);
}

function notaBloqueadaParaUsuario(nota, usuario) {
  const admin = usuario?.tipoUsuario === "admin";
  const dono = Number(nota.usuarioId) === Number(usuario?.id);
  const protegida = Boolean(nota.compartilhada) && Boolean(nota.compartilhamentoPrivado);

  if (!protegida || admin || dono) {
    return false;
  }

  return !possuiAcessoPrivado(nota.id, usuario.id);
}

function normalizarNota(nota, usuarioLogado) {
  const admin = usuarioLogado?.tipoUsuario === "admin";
  const dono = Number(nota.usuarioId) === Number(usuarioLogado?.id);
  const bloqueada = notaBloqueadaParaUsuario(nota, usuarioLogado);
  const imagens = bloqueada ? [] : lerImagens(nota.imagens, nota.imagem);

  return {
    id: nota.id,
    usuarioId: nota.usuarioId,
    autorNome: nota.autorNome || "Usuário",
    autorEmail: nota.autorEmail || "",
    autorFoto: nota.autorFoto || "",
    titulo: nota.titulo,
    conteudo: bloqueada ? "Esta nota compartilhada é protegida por senha." : nota.conteudo,
    categoria: nota.categoria,
    subcategoria: nota.subcategoria || "",
    imagem: imagens[0] || "",
    imagens,
    compartilhada: Boolean(nota.compartilhada),
    compartilhamentoPrivado: Boolean(nota.compartilhamentoPrivado),
    bloqueada,
    favorita: favoritoDoUsuario(nota.id, usuarioLogado.id),
    fixada: fixadaDoUsuario(nota.id, usuarioLogado.id),
    naLixeira: Boolean(nota.naLixeira),
    criadoEm: nota.criadoEm,
    atualizadoEm: nota.atualizadoEm,
    minhaNota: dono,
    podeEditar: (admin || dono) && !bloqueada,
    podeExcluir: (admin || dono) && !bloqueada,
    podeObservar: Boolean(nota.compartilhada) && !bloqueada,
    podeFavoritar: !bloqueada,
    podeFixar: !bloqueada
  };
}

function limparSessoesExpiradas() {
  db.prepare(`
    DELETE FROM sessoes
    WHERE expiraEm <= ?
  `).run(new Date().toISOString());
}

function criarSessao(usuarioId) {
  limparSessoesExpiradas();

  const token = randomBytes(32).toString("hex");
  const criadoEm = new Date();
  const expiraEm = new Date(
    criadoEm.getTime() + 1000 * 60 * 60 * 24 * 7
  );

  db.prepare(`
    INSERT INTO sessoes (
      usuarioId,
      token,
      criadoEm,
      expiraEm
    )
    VALUES (?, ?, ?, ?)
  `).run(
    usuarioId,
    token,
    criadoEm.toISOString(),
    expiraEm.toISOString()
  );

  return token;
}

function autenticar(req, res, next) {
  const cabecalho = req.headers.authorization || "";
  const token = cabecalho.startsWith("Bearer ")
    ? cabecalho.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ erro: "Sessão não informada" });
  }

  limparSessoesExpiradas();

  const sessao = db
    .prepare(`
      SELECT
        sessoes.token,
        usuarios.id,
        usuarios.nome,
        usuarios.usuario,
        usuarios.email,
        usuarios.fotoPerfil,
        usuarios.tipoUsuario,
        usuarios.criadoEm,
        usuarios.ultimoLogin,
        usuarios.ativo
      FROM sessoes
      JOIN usuarios ON usuarios.id = sessoes.usuarioId
      WHERE sessoes.token = ?
      AND sessoes.expiraEm > ?
      AND usuarios.ativo = 1
    `)
    .get(token, new Date().toISOString());

  if (!sessao) {
    return res.status(401).json({ erro: "Sessão inválida ou expirada" });
  }

  req.usuario = normalizarUsuario(sessao);
  req.token = token;
  next();
}

function exigirAdmin(req, res, next) {
  if (req.usuario?.tipoUsuario !== "admin") {
    return res.status(403).json({ erro: "Acesso permitido apenas para administradores" });
  }

  next();
}

function buscarNotaVisivel(id, usuario) {
  const nota = db
    .prepare(`
      SELECT
        notas.*,
        usuarios.nome AS autorNome,
        usuarios.email AS autorEmail,
        usuarios.fotoPerfil AS autorFoto
      FROM notas
      JOIN usuarios ON usuarios.id = notas.usuarioId
      WHERE notas.id = ?
    `)
    .get(id);

  if (!nota) {
    return null;
  }

  const admin = usuario.tipoUsuario === "admin";
  const dono = Number(nota.usuarioId) === Number(usuario.id);
  const compartilhada = Boolean(nota.compartilhada);

  if (!admin && !dono && !compartilhada) {
    return null;
  }

  return nota;
}

function podeAlterarNota(nota, usuario) {
  return usuario.tipoUsuario === "admin" || Number(nota.usuarioId) === Number(usuario.id);
}

function notaNormalizadaPorId(id, usuario) {
  const nota = buscarNotaVisivel(id, usuario);

  if (!nota) {
    return null;
  }

  return normalizarNota(nota, usuario);
}

app.get("/status", (req, res) => {
  res.json({
    online: true,
    app: "Smart Notes",
    versao: "1.5.4"
  });
});

app.post("/auth/cadastro", (req, res) => {
  const nome = normalizarNomeExibicao(req.body.nome);
  const usuarioLogin = String(req.body.usuario || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const senha = String(req.body.senha || "");

  if (!nome || !usuarioLogin || !email || !senha) {
    return res.status(400).json({ erro: "Preencha nome de exibição, nome de usuário, e-mail e senha" });
  }

  if (!nomeExibicaoValido(nome)) {
    return res.status(400).json({ erro: "O nome de exibição deve ter de 2 a 80 caracteres e pode usar letras, espaços, acentos, apóstrofo e hífen" });
  }

  if (!usuarioLoginValido(usuarioLogin)) {
    return res.status(400).json({ erro: "O usuário deve ter de 3 a 30 caracteres e usar apenas letras, números, ponto, traço ou sublinhado" });
  }

  if (!email.includes("@")) {
    return res.status(400).json({ erro: "Informe um e-mail válido" });
  }

  if (senha.length < 4) {
    return res.status(400).json({ erro: "A senha precisa ter pelo menos 4 caracteres" });
  }

  const jaExiste = db.prepare(`
    SELECT id FROM usuarios
    WHERE ativo = 1
    AND (lower(email) = lower(?) OR lower(usuario) = lower(?))
  `).get(email, usuarioLogin);

  if (jaExiste) {
    return res.status(409).json({ erro: "Este usuário ou e-mail já está cadastrado" });
  }

  try {
    const resultado = db.prepare(`
      INSERT INTO usuarios (
        nome,
        usuario,
        email,
        senhaHash,
        tipoUsuario,
        criadoEm,
        ativo
      )
      VALUES (?, ?, ?, ?, 'usuario', ?, 1)
    `).run(nome, usuarioLogin, email, gerarHashSenha(senha), new Date().toISOString());

    const usuario = db.prepare("SELECT * FROM usuarios WHERE id = ?").get(resultado.lastInsertRowid);
    const token = criarSessao(usuario.id);

    res.status(201).json({ usuario: normalizarUsuario(usuario), token });
  } catch (error) {
    res.status(409).json({ erro: "Este usuário ou e-mail já está cadastrado" });
  }
});

app.post("/auth/login", (req, res) => {
  const identificador = String(req.body.identificador || req.body.usuario || req.body.email || "").trim();
  const senha = String(req.body.senha || "");

  const usuario = db.prepare(`
    SELECT * FROM usuarios
    WHERE (lower(email) = lower(?) OR lower(usuario) = lower(?))
    AND ativo = 1
    LIMIT 1
  `).get(identificador, identificador);

  if (!usuario || !conferirSenha(senha, usuario.senhaHash)) {
    return res.status(401).json({ erro: "Usuário, e-mail ou senha incorretos" });
  }

  db.prepare(`
    UPDATE usuarios
    SET ultimoLogin = ?
    WHERE id = ?
  `).run(new Date().toISOString(), usuario.id);

  const atualizado = db.prepare("SELECT * FROM usuarios WHERE id = ?").get(usuario.id);
  const token = criarSessao(usuario.id);

  res.json({ usuario: normalizarUsuario(atualizado), token });
});

app.post("/auth/recuperar-senha", (req, res) => {
  const identificador = String(req.body.identificador || req.body.email || "").trim();

  if (!identificador) {
    return res.status(400).json({ erro: "Informe o usuário ou e-mail cadastrado" });
  }

  const usuario = db
    .prepare("SELECT * FROM usuarios WHERE (lower(email) = lower(?) OR lower(usuario) = lower(?)) AND ativo = 1")
    .get(identificador, identificador);

  if (!usuario) {
    return res.status(404).json({ erro: "Nenhum usuário ativo encontrado com esse usuário ou e-mail" });
  }

  const codigo = gerarCodigo();
  const expiraEm = new Date(Date.now() + 1000 * 60 * 20).toISOString();

  db.prepare(`
    UPDATE usuarios
    SET codigoRecuperacao = ?,
        codigoRecuperacaoExpiraEm = ?
    WHERE id = ?
  `).run(codigo, expiraEm, usuario.id);

  res.json({
    mensagem: "Código de recuperação gerado. Use este código para redefinir a senha.",
    codigoDesenvolvimento: codigo
  });
});

app.post("/auth/redefinir-senha", (req, res) => {
  const identificador = String(req.body.identificador || req.body.email || "").trim();
  const codigo = String(req.body.codigo || "").trim();
  const novaSenha = String(req.body.novaSenha || "");

  if (!identificador || !codigo || !novaSenha) {
    return res.status(400).json({ erro: "Preencha usuário/e-mail, código e nova senha" });
  }

  if (novaSenha.length < 4) {
    return res.status(400).json({ erro: "A nova senha precisa ter pelo menos 4 caracteres" });
  }

  const usuario = db
    .prepare("SELECT * FROM usuarios WHERE (lower(email) = lower(?) OR lower(usuario) = lower(?)) AND ativo = 1")
    .get(identificador, identificador);

  if (!usuario) {
    return res.status(404).json({ erro: "Usuário não encontrado" });
  }

  const agora = new Date().toISOString();

  if (!usuario.codigoRecuperacao || usuario.codigoRecuperacao !== codigo || usuario.codigoRecuperacaoExpiraEm <= agora) {
    return res.status(400).json({ erro: "Código inválido ou expirado" });
  }

  db.prepare(`
    UPDATE usuarios
    SET senhaHash = ?,
        codigoRecuperacao = NULL,
        codigoRecuperacaoExpiraEm = NULL
    WHERE id = ?
  `).run(gerarHashSenha(novaSenha), usuario.id);

  res.json({ mensagem: "Senha redefinida com sucesso" });
});

app.get("/auth/me", autenticar, (req, res) => {
  res.json({ usuario: req.usuario });
});

app.post("/auth/logout", autenticar, (req, res) => {
  db.prepare("DELETE FROM sessoes WHERE token = ?").run(req.token);
  res.json({ mensagem: "Sessão encerrada" });
});

app.put("/usuarios/perfil", autenticar, (req, res) => {
  const nome = normalizarNomeExibicao(req.body.nome);
  const usuarioLogin = String(req.body.usuario || req.usuario.usuario || "").trim();
  const fotoPerfil = String(req.body.fotoPerfil || "");

  if (!nome || !usuarioLogin) {
    return res.status(400).json({ erro: "Informe nome de exibição e nome de usuário" });
  }

  if (!nomeExibicaoValido(nome)) {
    return res.status(400).json({ erro: "Nome de exibição inválido. Use letras, espaços, acentos, apóstrofo e hífen" });
  }

  if (!usuarioLoginValido(usuarioLogin)) {
    return res.status(400).json({ erro: "Usuário inválido" });
  }

  const usuarioDuplicado = db.prepare("SELECT id FROM usuarios WHERE lower(usuario) = lower(?) AND id != ?").get(usuarioLogin, req.usuario.id);
  if (usuarioDuplicado) {
    return res.status(409).json({ erro: "Este nome de usuário já está em uso" });
  }

  if (fotoPerfil && !fotoPerfil.startsWith("data:image/")) {
    return res.status(400).json({ erro: "Imagem de perfil inválida" });
  }

  if (fotoPerfil.length > 6 * 1024 * 1024) {
    return res.status(400).json({ erro: "Imagem de perfil muito grande" });
  }

  db.prepare(`
    UPDATE usuarios
    SET nome = ?,
        usuario = ?,
        fotoPerfil = ?
    WHERE id = ?
  `).run(nome, usuarioLogin, fotoPerfil, req.usuario.id);

  const usuario = db.prepare("SELECT * FROM usuarios WHERE id = ?").get(req.usuario.id);
  res.json({ usuario: normalizarUsuario(usuario) });
});

app.get("/admin/usuarios", autenticar, exigirAdmin, (req, res) => {
  const usuarios = db.prepare(`
    SELECT
      usuarios.id,
      usuarios.nome,
      usuarios.usuario,
      usuarios.email,
      usuarios.fotoPerfil,
      usuarios.tipoUsuario,
      usuarios.criadoEm,
      usuarios.ultimoLogin,
      usuarios.ativo,
      (SELECT COUNT(*) FROM notas WHERE notas.usuarioId = usuarios.id) AS totalNotas
    FROM usuarios
    ORDER BY usuarios.ativo DESC, usuarios.nome
  `).all();

  res.json(usuarios.map(normalizarUsuario));
});

app.put("/admin/usuarios/:id", autenticar, exigirAdmin, (req, res) => {
  const id = Number(req.params.id);
  const nome = normalizarNomeExibicao(req.body.nome);
  const usuarioLogin = String(req.body.usuario || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const tipoUsuario = String(req.body.tipoUsuario || "usuario") === "admin" ? "admin" : "usuario";
  const ativo = req.body.ativo ? 1 : 0;

  if (!nome || !usuarioLogin || !email) {
    return res.status(400).json({ erro: "Preencha nome de exibição, nome de usuário e e-mail" });
  }

  if (!nomeExibicaoValido(nome)) {
    return res.status(400).json({ erro: "Nome de exibição inválido. Use letras, espaços, acentos, apóstrofo e hífen" });
  }

  if (!usuarioLoginValido(usuarioLogin)) {
    return res.status(400).json({ erro: "O nome de usuário deve ter de 3 a 30 caracteres e usar apenas letras, números, ponto, traço ou sublinhado" });
  }

  if (!email.includes("@")) {
    return res.status(400).json({ erro: "Informe um e-mail válido" });
  }

  if (id === req.usuario.id && ativo === 0) {
    return res.status(400).json({ erro: "Você não pode desativar seu próprio usuário" });
  }

  const duplicado = db.prepare(`
    SELECT id
    FROM usuarios
    WHERE (lower(email) = lower(?) OR lower(usuario) = lower(?))
    AND id != ?
    AND ativo = 1
  `).get(email, usuarioLogin, id);

  if (duplicado) {
    return res.status(409).json({ erro: "Este usuário ou e-mail já está em uso" });
  }

  try {
    db.prepare(`
      UPDATE usuarios
      SET nome = ?,
          usuario = ?,
          email = ?,
          tipoUsuario = ?,
          ativo = ?
      WHERE id = ?
    `).run(nome, usuarioLogin, email, tipoUsuario, ativo, id);
  } catch (error) {
    return res.status(409).json({ erro: "Este usuário ou e-mail já está em uso" });
  }

  const usuario = db.prepare("SELECT * FROM usuarios WHERE id = ?").get(id);
  res.json({ usuario: normalizarUsuario(usuario) });
});

app.patch("/admin/usuarios/:id/senha", autenticar, exigirAdmin, (req, res) => {
  const id = Number(req.params.id);
  const novaSenha = String(req.body.novaSenha || "");

  if (novaSenha.length < 4) {
    return res.status(400).json({ erro: "A senha precisa ter pelo menos 4 caracteres" });
  }

  const usuario = db.prepare("SELECT id FROM usuarios WHERE id = ?").get(id);

  if (!usuario) {
    return res.status(404).json({ erro: "Usuário não encontrado" });
  }

  db.prepare("UPDATE usuarios SET senhaHash = ? WHERE id = ?").run(gerarHashSenha(novaSenha), id);
  res.json({ mensagem: "Senha alterada pelo administrador" });
});



app.delete("/admin/usuarios/:id", autenticar, exigirAdmin, (req, res) => {
  const id = Number(req.params.id);
  const responsavelId = Number(req.body?.responsavelId || req.usuario.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ erro: "Usuário inválido" });
  }

  if (id === Number(req.usuario.id)) {
    return res.status(400).json({ erro: "Você não pode excluir o usuário que está conectado" });
  }

  if (!Number.isInteger(responsavelId) || responsavelId <= 0 || responsavelId === id) {
    return res.status(400).json({ erro: "Selecione outro usuário ativo para receber as notas" });
  }

  const usuario = db.prepare("SELECT id, nome FROM usuarios WHERE id = ?").get(id);
  if (!usuario) {
    return res.status(404).json({ erro: "Usuário não encontrado" });
  }

  const responsavel = db.prepare("SELECT id, nome FROM usuarios WHERE id = ? AND ativo = 1").get(responsavelId);
  if (!responsavel) {
    return res.status(404).json({ erro: "Responsável não encontrado ou inativo" });
  }

  const totalNotas = Number(db.prepare("SELECT COUNT(*) AS total FROM notas WHERE usuarioId = ?").get(id)?.total || 0);
  const excluirComSeguranca = db.transaction(() => {
    db.prepare(`
      UPDATE notas
      SET usuarioId = ?, atualizadoEm = ?
      WHERE usuarioId = ?
    `).run(responsavelId, new Date().toISOString(), id);

    db.prepare("UPDATE pendencias SET responsavelId = ?, atualizadoEm = ? WHERE responsavelId = ?").run(responsavelId, new Date().toISOString(), id);
    db.prepare("UPDATE pendencias SET criadoPor = ? WHERE criadoPor = ?").run(responsavelId, id);
    db.prepare("UPDATE pendencia_itens SET concluidoPor = NULL WHERE concluidoPor = ?").run(id);
    db.prepare("DELETE FROM usuarios WHERE id = ?").run(id);
  });

  try {
    excluirComSeguranca();
    res.json({
      mensagem: totalNotas > 0
        ? `Usuário excluído. ${totalNotas} nota(s) transferida(s) para ${responsavel.nome}.`
        : "Usuário excluído com sucesso.",
      notasTransferidas: totalNotas,
      responsavel
    });
  } catch (error) {
    console.error("Erro ao excluir usuário:", error);
    res.status(500).json({ erro: "Não foi possível excluir o usuário" });
  }
});

app.get("/categorias", autenticar, (req, res) => {
  const categorias = db.prepare(`
    SELECT *
    FROM categorias
    WHERE ativo = 1
    ORDER BY nome
  `).all();

  const subcategorias = db.prepare(`
    SELECT
      subcategorias.*,
      categorias.nome AS categoria
    FROM subcategorias
    JOIN categorias ON categorias.id = subcategorias.categoriaId
    WHERE subcategorias.ativo = 1
    AND categorias.ativo = 1
    ORDER BY categorias.nome, subcategorias.nome
  `).all();

  res.json({ categorias, subcategorias });
});

app.post("/categorias", autenticar, (req, res) => {
  const nome = String(req.body.nome || "").trim();
  const icone = String(req.body.icone || "📁").trim() || "📁";

  if (!nome) {
    return res.status(400).json({ erro: "Informe o nome da categoria" });
  }

  try {
    db.prepare(`
      INSERT INTO categorias (nome, icone, criadoPor, criadoEm, ativo)
      VALUES (?, ?, ?, ?, 1)
    `).run(nome, icone, req.usuario.id, new Date().toISOString());
  } catch (error) {
    return res.status(409).json({ erro: "Essa categoria já existe" });
  }

  res.status(201).json({ mensagem: "Categoria criada" });
});

app.post("/categorias/subcategorias", autenticar, exigirAdmin, (req, res) => {
  const categoria = String(req.body.categoria || "").trim();
  const nome = String(req.body.nome || "").trim();

  if (!categoria || !nome) {
    return res.status(400).json({ erro: "Informe categoria e subcategoria" });
  }

  const categoriaBanco = db.prepare(`
    SELECT id
    FROM categorias
    WHERE nome = ?
    AND ativo = 1
  `).get(categoria);

  if (!categoriaBanco) {
    return res.status(404).json({ erro: "Categoria não encontrada" });
  }

  const subcategoriaExistente = db.prepare(`
    SELECT *
    FROM subcategorias
    WHERE categoriaId = ?
    AND lower(nome) = lower(?)
  `).get(categoriaBanco.id, nome);

  if (subcategoriaExistente && subcategoriaExistente.ativo === 1) {
    return res.status(409).json({ erro: "Essa subcategoria já existe nessa categoria" });
  }

  if (subcategoriaExistente) {
    db.prepare(`
      UPDATE subcategorias
      SET nome = ?,
          criadoPor = ?,
          criadoEm = ?,
          ativo = 1
      WHERE id = ?
    `).run(nome, req.usuario.id, new Date().toISOString(), subcategoriaExistente.id);

    return res.status(201).json({ mensagem: "Subcategoria recriada" });
  }

  try {
    db.prepare(`
      INSERT INTO subcategorias (categoriaId, nome, criadoPor, criadoEm, ativo)
      VALUES (?, ?, ?, ?, 1)
    `).run(categoriaBanco.id, nome, req.usuario.id, new Date().toISOString());
  } catch (error) {
    return res.status(409).json({ erro: "Essa subcategoria já existe nessa categoria" });
  }

  res.status(201).json({ mensagem: "Subcategoria criada" });
});

app.patch("/categorias/subcategorias/:id", autenticar, exigirAdmin, (req, res) => {
  const id = Number(req.params.id);
  const novoNome = String(req.body.nome || "").trim();

  if (!id || !novoNome) {
    return res.status(400).json({ erro: "Informe a subcategoria e o novo nome" });
  }

  const subcategoria = db.prepare(`
    SELECT subcategorias.*, categorias.nome AS categoria
    FROM subcategorias
    JOIN categorias ON categorias.id = subcategorias.categoriaId
    WHERE subcategorias.id = ?
    AND subcategorias.ativo = 1
  `).get(id);

  if (!subcategoria) {
    return res.status(404).json({ erro: "Subcategoria não encontrada" });
  }

  const duplicada = db.prepare(`
    SELECT id
    FROM subcategorias
    WHERE categoriaId = ?
    AND ativo = 1
    AND id <> ?
    AND lower(trim(nome)) = lower(trim(?))
  `).get(subcategoria.categoriaId, id, novoNome);

  if (duplicada) {
    return res.status(409).json({ erro: "Essa subcategoria já existe nessa categoria" });
  }

  const nomeAnterior = String(subcategoria.nome || "").trim();
  const agora = new Date().toISOString();

  const transacao = db.transaction(() => {
    db.prepare(`
      UPDATE subcategorias
      SET nome = ?, criadoPor = ?, criadoEm = ?
      WHERE id = ?
    `).run(novoNome, req.usuario.id, agora, id);

    db.prepare(`
      UPDATE notas
      SET subcategoria = ?, atualizadoEm = ?
      WHERE lower(trim(COALESCE(categoria, ''))) = lower(trim(?))
      AND lower(trim(COALESCE(subcategoria, ''))) = lower(trim(?))
    `).run(novoNome, agora, subcategoria.categoria, nomeAnterior);
  });

  transacao();
  res.json({ mensagem: "Subcategoria atualizada", subcategoria: { ...subcategoria, nome: novoNome } });
});

function localizarSubcategoria(dados) {
  const id = Number(dados.id || 0);
  const categoria = String(dados.categoria || '').trim();
  const nome = String(dados.nome || '').trim();

  if (id) {
    const encontrada = db.prepare(`
      SELECT
        subcategorias.id,
        subcategorias.nome,
        subcategorias.criadoPor,
        subcategorias.categoriaId,
        subcategorias.ativo,
        categorias.nome AS categoria
      FROM subcategorias
      LEFT JOIN categorias ON categorias.id = subcategorias.categoriaId
      WHERE subcategorias.id = ?
    `).get(id);

    if (encontrada) {
      return encontrada;
    }
  }

  if (categoria && nome) {
    return db.prepare(`
      SELECT
        subcategorias.id,
        subcategorias.nome,
        subcategorias.criadoPor,
        subcategorias.categoriaId,
        subcategorias.ativo,
        categorias.nome AS categoria
      FROM subcategorias
      LEFT JOIN categorias ON categorias.id = subcategorias.categoriaId
      WHERE lower(trim(subcategorias.nome)) = lower(trim(?))
      AND lower(trim(COALESCE(categorias.nome, ''))) = lower(trim(?))
      ORDER BY subcategorias.ativo DESC, subcategorias.id DESC
      LIMIT 1
    `).get(nome, categoria);
  }

  return null;
}

function excluirSubcategoriaComSeguranca(dados) {
  const subcategoria = localizarSubcategoria(dados || {});

  if (!subcategoria) {
    return { erro: 'Subcategoria não encontrada', status: 404 };
  }

  const agora = new Date().toISOString();
  const nomeSubcategoria = String(subcategoria.nome || dados.nome || '').trim();
  const nomeCategoria = String(subcategoria.categoria || dados.categoria || '').trim();

  const transacao = db.transaction(() => {
    db.prepare(`
      UPDATE subcategorias
      SET ativo = 0
      WHERE id = ?
    `).run(subcategoria.id);

    if (nomeCategoria) {
      db.prepare(`
        UPDATE notas
        SET subcategoria = '',
            atualizadoEm = ?
        WHERE lower(trim(COALESCE(categoria, ''))) = lower(trim(?))
        AND lower(trim(COALESCE(subcategoria, ''))) = lower(trim(?))
      `).run(agora, nomeCategoria, nomeSubcategoria);
    } else {
      db.prepare(`
        UPDATE notas
        SET subcategoria = '',
            atualizadoEm = ?
        WHERE lower(trim(COALESCE(subcategoria, ''))) = lower(trim(?))
      `).run(agora, nomeSubcategoria);
    }
  });

  transacao();

  return { mensagem: 'Subcategoria excluída sem apagar as notas' };
}

app.delete('/categorias/subcategorias/:id', autenticar, exigirAdmin, (req, res) => {
  try {
    const resultado = excluirSubcategoriaComSeguranca({ id: req.params.id });

    if (resultado.erro) {
      return res.status(resultado.status || 400).json({ erro: resultado.erro });
    }

    res.json(resultado);
  } catch (error) {
    console.error('Erro ao excluir subcategoria:', error);
    res.status(500).json({ erro: `Erro ao excluir subcategoria: ${error.message}` });
  }
});

app.post('/categorias/subcategorias/excluir', autenticar, exigirAdmin, (req, res) => {
  try {
    const resultado = excluirSubcategoriaComSeguranca(req.body || {});

    if (resultado.erro) {
      return res.status(resultado.status || 400).json({ erro: resultado.erro });
    }

    res.json(resultado);
  } catch (error) {
    console.error('Erro ao excluir subcategoria:', error);
    res.status(500).json({ erro: `Erro ao excluir subcategoria: ${error.message}` });
  }
});

app.get("/notas", autenticar, (req, res) => {
  const admin = req.usuario.tipoUsuario === "admin";
  const escopo = String(req.query.escopo || "todas");

  let sql = `
    SELECT
      notas.*,
      usuarios.nome AS autorNome,
      usuarios.email AS autorEmail,
      usuarios.fotoPerfil AS autorFoto
    FROM notas
    JOIN usuarios ON usuarios.id = notas.usuarioId
    WHERE 1 = 1
  `;

  const parametros = [];

  if (!admin) {
    sql += `
      AND (
        notas.usuarioId = ?
        OR (
          notas.compartilhada = 1
          AND notas.naLixeira = 0
        )
      )
    `;
    parametros.push(req.usuario.id);
  }

  if (escopo === "minhas") {
    sql += " AND notas.usuarioId = ?";
    parametros.push(req.usuario.id);
  }

  if (escopo === "compartilhadas") {
    sql += " AND notas.compartilhada = 1 AND notas.naLixeira = 0";
  }

  sql += " ORDER BY notas.id DESC";

  const notas = db.prepare(sql).all(...parametros);
  const normalizadas = notas.map((nota) => normalizarNota(nota, req.usuario));

  normalizadas.sort((a, b) => {
    if (a.fixada && !b.fixada) return -1;
    if (!a.fixada && b.fixada) return 1;
    return new Date(b.criadoEm) - new Date(a.criadoEm);
  });

  res.json(normalizadas);
});

app.post("/notas", autenticar, (req, res) => {
  const titulo = String(req.body.titulo || "").trim();
  const conteudo = String(req.body.conteudo || "").trim();
  const categoria = String(req.body.categoria || "Atendimentos").trim();
  const subcategoria = String(req.body.subcategoria || "").trim();
  const compartilhada = req.body.compartilhada ? 1 : 0;
  const compartilhamentoPrivado = compartilhada && req.body.compartilhamentoPrivado ? 1 : 0;
  const senhaCompartilhamento = String(req.body.senhaCompartilhamento || "");
  let imagens = [];

  try {
    imagens = validarImagens(req.body.imagens || req.body.imagem || []);
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }

  if (!titulo || !conteudo) {
    return res.status(400).json({ erro: "Preencha título e conteúdo" });
  }

  if (compartilhamentoPrivado && senhaCompartilhamento.length < 3) {
    return res.status(400).json({ erro: "Informe uma senha para a nota compartilhada privada" });
  }

  const agora = new Date().toISOString();
  const imagemPrincipal = imagens[0] || "";
  const senhaHash = compartilhamentoPrivado ? gerarHashSenha(senhaCompartilhamento) : null;

  const resultado = db
    .prepare(`
      INSERT INTO notas (
        usuarioId,
        titulo,
        conteudo,
        categoria,
        subcategoria,
        compartilhada,
        compartilhamentoPrivado,
        senhaCompartilhamentoHash,
        imagem,
        imagens,
        criadoEm,
        atualizadoEm
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      req.usuario.id,
      titulo,
      conteudo,
      categoria,
      subcategoria,
      compartilhada,
      compartilhamentoPrivado,
      senhaHash,
      imagemPrincipal,
      JSON.stringify(imagens),
      agora,
      agora
    );

  const nota = buscarNotaVisivel(resultado.lastInsertRowid, req.usuario);
  res.status(201).json(normalizarNota(nota, req.usuario));
});

app.put("/notas/:id", autenticar, (req, res) => {
  const id = Number(req.params.id);
  const notaAtual = buscarNotaVisivel(id, req.usuario);

  if (!notaAtual) {
    return res.status(404).json({ erro: "Nota não encontrada" });
  }

  if (!podeAlterarNota(notaAtual, req.usuario)) {
    return res.status(403).json({ erro: "Você não pode editar nota de outro usuário" });
  }

  const titulo = String(req.body.titulo || "").trim();
  const conteudo = String(req.body.conteudo || "").trim();
  const categoria = String(req.body.categoria || "Atendimentos").trim();
  const subcategoria = String(req.body.subcategoria || "").trim();
  const compartilhada = req.body.compartilhada ? 1 : 0;
  const compartilhamentoPrivado = compartilhada && req.body.compartilhamentoPrivado ? 1 : 0;
  const senhaCompartilhamento = String(req.body.senhaCompartilhamento || "");
  let responsavelId = Number(notaAtual.usuarioId);
  let imagens = [];

  if (req.usuario.tipoUsuario === "admin" && req.body.responsavelId !== undefined) {
    const responsavelSolicitado = Number(req.body.responsavelId);
    const responsavel = db.prepare("SELECT id FROM usuarios WHERE id = ? AND ativo = 1").get(responsavelSolicitado);

    if (!responsavel) {
      return res.status(400).json({ erro: "Selecione um responsável ativo para a nota" });
    }

    responsavelId = responsavel.id;
  }

  try {
    imagens = validarImagens(req.body.imagens || req.body.imagem || []);
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }

  if (!titulo || !conteudo) {
    return res.status(400).json({ erro: "Preencha título e conteúdo" });
  }

  if (compartilhamentoPrivado && !notaAtual.senhaCompartilhamentoHash && senhaCompartilhamento.length < 3) {
    return res.status(400).json({ erro: "Informe uma senha para a nota compartilhada privada" });
  }

  const senhaHash = compartilhamentoPrivado
    ? senhaCompartilhamento
      ? gerarHashSenha(senhaCompartilhamento)
      : notaAtual.senhaCompartilhamentoHash
    : null;

  db.prepare(`
    UPDATE notas
    SET
      usuarioId = ?,
      titulo = ?,
      conteudo = ?,
      categoria = ?,
      subcategoria = ?,
      compartilhada = ?,
      compartilhamentoPrivado = ?,
      senhaCompartilhamentoHash = ?,
      imagem = ?,
      imagens = ?,
      atualizadoEm = ?
    WHERE id = ?
  `).run(
    responsavelId,
    titulo,
    conteudo,
    categoria,
    subcategoria,
    compartilhada,
    compartilhamentoPrivado,
    senhaHash,
    imagens[0] || "",
    JSON.stringify(imagens),
    new Date().toISOString(),
    id
  );

  if (!compartilhamentoPrivado) {
    db.prepare("DELETE FROM nota_acessos_privados WHERE notaId = ?").run(id);
  }

  const nota = buscarNotaVisivel(id, req.usuario);
  res.json(normalizarNota(nota, req.usuario));
});

app.post("/notas/:id/desbloquear", autenticar, (req, res) => {
  const id = Number(req.params.id);
  const senha = String(req.body.senha || "");
  const nota = buscarNotaVisivel(id, req.usuario);

  if (!nota) {
    return res.status(404).json({ erro: "Nota não encontrada" });
  }

  if (!nota.compartilhamentoPrivado || podeAlterarNota(nota, req.usuario)) {
    return res.json(normalizarNota(nota, req.usuario));
  }

  if (!conferirSenha(senha, nota.senhaCompartilhamentoHash)) {
    return res.status(401).json({ erro: "Senha da nota incorreta" });
  }

  db.prepare(`
    INSERT OR IGNORE INTO nota_acessos_privados (notaId, usuarioId, criadoEm)
    VALUES (?, ?, ?)
  `).run(id, req.usuario.id, new Date().toISOString());

  res.json(notaNormalizadaPorId(id, req.usuario));
});

app.delete("/notas/:id", autenticar, (req, res) => {
  const id = Number(req.params.id);
  const nota = buscarNotaVisivel(id, req.usuario);

  if (!nota) {
    return res.status(404).json({ erro: "Nota não encontrada" });
  }

  if (!podeAlterarNota(nota, req.usuario)) {
    return res.status(403).json({ erro: "Você não pode excluir nota de outro usuário" });
  }

  db.prepare(`
    UPDATE notas
    SET naLixeira = 1,
        atualizadoEm = ?
    WHERE id = ?
  `).run(new Date().toISOString(), id);

  res.json({ mensagem: "Nota enviada para lixeira" });
});

app.patch("/notas/:id/restaurar", autenticar, (req, res) => {
  const id = Number(req.params.id);
  const nota = buscarNotaVisivel(id, req.usuario);

  if (!nota) {
    return res.status(404).json({ erro: "Nota não encontrada" });
  }

  if (!podeAlterarNota(nota, req.usuario)) {
    return res.status(403).json({ erro: "Você não pode restaurar nota de outro usuário" });
  }

  db.prepare(`
    UPDATE notas
    SET naLixeira = 0,
        atualizadoEm = ?
    WHERE id = ?
  `).run(new Date().toISOString(), id);

  res.json(notaNormalizadaPorId(id, req.usuario));
});

app.delete("/notas/:id/permanente", autenticar, (req, res) => {
  const id = Number(req.params.id);
  const nota = buscarNotaVisivel(id, req.usuario);

  if (!nota) {
    return res.status(404).json({ erro: "Nota não encontrada" });
  }

  if (!podeAlterarNota(nota, req.usuario)) {
    return res.status(403).json({ erro: "Você não pode excluir nota de outro usuário" });
  }

  db.prepare("DELETE FROM notas WHERE id = ?").run(id);
  res.json({ mensagem: "Nota excluída permanentemente" });
});

app.patch("/notas/:id/favorita", autenticar, (req, res) => {
  const id = Number(req.params.id);
  const nota = buscarNotaVisivel(id, req.usuario);

  if (!nota) {
    return res.status(404).json({ erro: "Nota não encontrada" });
  }

  if (notaBloqueadaParaUsuario(nota, req.usuario)) {
    return res.status(403).json({ erro: "Desbloqueie a nota antes de favoritar" });
  }

  const favorito = favoritoDoUsuario(id, req.usuario.id);

  if (favorito) {
    db.prepare("DELETE FROM nota_favoritos WHERE notaId = ? AND usuarioId = ?").run(id, req.usuario.id);
  } else {
    db.prepare(`
      INSERT OR IGNORE INTO nota_favoritos (notaId, usuarioId, criadoEm)
      VALUES (?, ?, ?)
    `).run(id, req.usuario.id, new Date().toISOString());
  }

  res.json(notaNormalizadaPorId(id, req.usuario));
});

app.patch("/notas/:id/fixada", autenticar, (req, res) => {
  const id = Number(req.params.id);
  const nota = buscarNotaVisivel(id, req.usuario);

  if (!nota) {
    return res.status(404).json({ erro: "Nota não encontrada" });
  }

  if (notaBloqueadaParaUsuario(nota, req.usuario)) {
    return res.status(403).json({ erro: "Desbloqueie a nota antes de fixar" });
  }

  const fixada = fixadaDoUsuario(id, req.usuario.id);

  if (fixada) {
    db.prepare("DELETE FROM nota_fixadas WHERE notaId = ? AND usuarioId = ?").run(id, req.usuario.id);
  } else {
    db.prepare(`
      INSERT OR IGNORE INTO nota_fixadas (notaId, usuarioId, criadoEm)
      VALUES (?, ?, ?)
    `).run(id, req.usuario.id, new Date().toISOString());
  }

  res.json(notaNormalizadaPorId(id, req.usuario));
});

app.get("/notas/:id/observacoes", autenticar, (req, res) => {
  const id = Number(req.params.id);
  const nota = buscarNotaVisivel(id, req.usuario);

  if (!nota) {
    return res.status(404).json({ erro: "Nota não encontrada" });
  }

  if (notaBloqueadaParaUsuario(nota, req.usuario)) {
    return res.status(403).json({ erro: "Desbloqueie a nota para ver as observações" });
  }

  const observacoes = db.prepare(`
    SELECT
      nota_observacoes.*,
      usuarios.nome AS autorNome,
      usuarios.email AS autorEmail,
      usuarios.fotoPerfil AS autorFoto
    FROM nota_observacoes
    JOIN usuarios ON usuarios.id = nota_observacoes.usuarioId
    WHERE nota_observacoes.notaId = ?
    AND nota_observacoes.ativo = 1
    ORDER BY nota_observacoes.id DESC
  `).all(id).map((observacao) => ({
    id: observacao.id,
    notaId: observacao.notaId,
    usuarioId: observacao.usuarioId,
    texto: observacao.texto,
    imagens: lerImagens(observacao.imagens),
    criadoEm: observacao.criadoEm,
    atualizadoEm: observacao.atualizadoEm,
    autorNome: observacao.autorNome,
    autorEmail: observacao.autorEmail,
    autorFoto: observacao.autorFoto || "",
    minhaObservacao: Number(observacao.usuarioId) === Number(req.usuario.id),
    podeExcluir: req.usuario.tipoUsuario === "admin" || Number(observacao.usuarioId) === Number(req.usuario.id)
  }));

  res.json(observacoes);
});

app.post("/notas/:id/observacoes", autenticar, (req, res) => {
  const id = Number(req.params.id);
  const nota = buscarNotaVisivel(id, req.usuario);

  if (!nota) {
    return res.status(404).json({ erro: "Nota não encontrada" });
  }

  if (!nota.compartilhada) {
    return res.status(400).json({ erro: "Observações são usadas em notas compartilhadas" });
  }

  if (notaBloqueadaParaUsuario(nota, req.usuario)) {
    return res.status(403).json({ erro: "Desbloqueie a nota para comentar" });
  }

  const texto = String(req.body.texto || "").trim();
  let imagens = [];

  try {
    imagens = validarImagens(req.body.imagens || [], 6);
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }

  if (!texto && imagens.length === 0) {
    return res.status(400).json({ erro: "Escreva uma observação ou adicione uma imagem" });
  }

  db.prepare(`
    INSERT INTO nota_observacoes (notaId, usuarioId, texto, imagens, criadoEm, atualizadoEm, ativo)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `).run(id, req.usuario.id, texto || "Imagem adicionada", JSON.stringify(imagens), new Date().toISOString(), new Date().toISOString());

  res.status(201).json({ mensagem: "Observação adicionada" });
});

app.delete("/notas/:id/observacoes/:observacaoId", autenticar, (req, res) => {
  const id = Number(req.params.id);
  const observacaoId = Number(req.params.observacaoId);
  const nota = buscarNotaVisivel(id, req.usuario);

  if (!nota) {
    return res.status(404).json({ erro: "Nota não encontrada" });
  }

  const observacao = db.prepare(`
    SELECT *
    FROM nota_observacoes
    WHERE id = ?
    AND notaId = ?
    AND ativo = 1
  `).get(observacaoId, id);

  if (!observacao) {
    return res.status(404).json({ erro: "Observação não encontrada" });
  }

  if (req.usuario.tipoUsuario !== "admin" && Number(observacao.usuarioId) !== Number(req.usuario.id)) {
    return res.status(403).json({ erro: "Você não pode remover essa observação" });
  }

  db.prepare("UPDATE nota_observacoes SET ativo = 0 WHERE id = ?").run(observacaoId);
  res.json({ mensagem: "Observação removida" });
});

const BACKUPS_DIR = path.join(__dirname, "backups");
const DATABASE_PATH = path.join(__dirname, "notas.db");
const PENDING_IMPORT_PATH = path.join(__dirname, ".smart-notes-import-pending.db");
const IMPORT_INFO_PATH = path.join(__dirname, ".smart-notes-import-pending.json");

fs.mkdirSync(BACKUPS_DIR, { recursive: true });

function nomeArquivoData(prefixo, extensao = "db") {
  const agora = new Date();
  const data = agora.toISOString().replace(/[:.]/g, "-");
  return `${prefixo}-${data}.${extensao}`;
}

async function criarCopiaBanco(destino) {
  await db.backup(destino);
  return destino;
}

function validarBancoImportado(arquivo) {
  const assinatura = fs.readFileSync(arquivo).subarray(0, 16).toString("utf8");
  if (assinatura !== "SQLite format 3\u0000") {
    throw new Error("O arquivo selecionado não é um banco SQLite válido.");
  }

  const importado = new Database(arquivo, { readonly: true, fileMustExist: true });
  try {
    const integridade = importado.pragma("integrity_check", { simple: true });
    if (String(integridade).toLowerCase() !== "ok") {
      throw new Error("O banco selecionado está corrompido.");
    }

    const tabelas = new Set(importado.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((item) => item.name));
    // Bancos antigos do Smart Notes podem não possuir tabelas auxiliares,
    // que são recriadas pelas migrações na inicialização.
    for (const tabela of ["usuarios", "notas"]) {
      if (!tabelas.has(tabela)) {
        throw new Error("O arquivo não pertence ao Smart Notes ou está incompleto.");
      }
    }
  } finally {
    importado.close();
  }
}


function numeroId(valor) {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function booleanoSql(valor, padrao = false) {
  if (valor === undefined || valor === null) return padrao ? 1 : 0;
  return valor === true || valor === 1 || valor === "1" ? 1 : 0;
}

function dataImportada(valor, fallback = new Date().toISOString()) {
  const texto = String(valor || "").trim();
  return texto || fallback;
}

function usuarioLoginImportado(item, usados, id) {
  const candidatos = [item?.usuario, String(item?.email || "").split("@")[0], item?.nome, `usuario${id}`];
  let base = "";
  for (const candidato of candidatos) {
    base = String(candidato || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "")
      .replace(/^[._-]+|[._-]+$/g, "")
      .slice(0, 28);
    if (base.length >= 3) break;
  }
  if (base.length < 3) base = `usuario${id}`;

  let candidato = base;
  let contador = 1;
  while (usados.has(candidato.toLowerCase())) {
    contador += 1;
    candidato = `${base.slice(0, 24)}${contador}`;
  }
  usados.add(candidato.toLowerCase());
  return candidato;
}

function validarBackupMobileJson(dados) {
  if (!dados || typeof dados !== "object" || Array.isArray(dados)) {
    throw new Error("O arquivo JSON selecionado não é um backup válido do Smart Notes.");
  }
  if (dados.format !== "smart-notes-mobile") {
    throw new Error("Este JSON não foi exportado pelo Smart Notes Mobile.");
  }
  if (!Array.isArray(dados.usuarios) || !Array.isArray(dados.notas)) {
    throw new Error("O backup do celular está incompleto: usuários ou notas não foram encontrados.");
  }
  if (dados.usuarios.length === 0) {
    throw new Error("O backup do celular não possui usuários.");
  }
}

function importarBackupMobileJson(dados) {
  validarBackupMobileJson(dados);

  const usuariosEntrada = Array.isArray(dados.usuarios) ? dados.usuarios : [];
  const categoriasEntrada = Array.isArray(dados.categorias) ? dados.categorias : [];
  const subcategoriasEntrada = Array.isArray(dados.subcategorias) ? dados.subcategorias : [];
  const notasEntrada = Array.isArray(dados.notas) ? dados.notas : [];
  const favoritosEntrada = Array.isArray(dados.favoritos) ? dados.favoritos : [];
  const fixadasEntrada = Array.isArray(dados.fixadas) ? dados.fixadas : [];
  const observacoesEntrada = Array.isArray(dados.observacoes) ? dados.observacoes : [];
  const acessosEntrada = Array.isArray(dados.acessosPrivados) ? dados.acessosPrivados : [];
  const pendenciasEntrada = Array.isArray(dados.pendencias) ? dados.pendencias : [];
  const pendenciaItensEntrada = Array.isArray(dados.pendenciaItens) ? dados.pendenciaItens : [];

  const executar = db.transaction(() => {
    // Ordem importante por causa das chaves estrangeiras.
    db.exec(`
      DELETE FROM sessoes;
      DELETE FROM pendencia_itens;
      DELETE FROM pendencias;
      DELETE FROM nota_observacoes;
      DELETE FROM nota_acessos_privados;
      DELETE FROM nota_favoritos;
      DELETE FROM nota_fixadas;
      DELETE FROM notas;
      DELETE FROM subcategorias;
      DELETE FROM categorias;
      DELETE FROM usuarios;
    `);

    const agoraIso = new Date().toISOString();
    const mapaUsuarios = new Map();
    const idsUsuarios = new Set();
    const loginsUsados = new Set();
    const emailsUsados = new Set();
    let proximoUsuario = Math.max(0, ...usuariosEntrada.map((item) => numeroId(item?.id) || 0));

    const inserirUsuario = db.prepare(`
      INSERT INTO usuarios (
        id, nome, usuario, email, senhaHash, tipoUsuario, fotoPerfil,
        codigoRecuperacao, codigoRecuperacaoExpiraEm, criadoEm, ultimoLogin, ativo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of usuariosEntrada) {
      const idOriginal = numeroId(item?.id);
      let id = idOriginal;
      if (!id || idsUsuarios.has(id)) id = ++proximoUsuario;
      idsUsuarios.add(id);
      if (idOriginal) mapaUsuarios.set(idOriginal, id);

      const nome = normalizarNomeExibicao(item?.nome) || `Usuário ${id}`;
      const usuario = usuarioLoginImportado(item, loginsUsados, id);
      let email = String(item?.email || "").trim().toLowerCase();
      if (!email.includes("@")) email = `${usuario.toLowerCase()}@smartnotes.local`;
      if (emailsUsados.has(email)) email = `${usuario.toLowerCase()}.${id}@smartnotes.local`;
      emailsUsados.add(email);

      const adminPadrao = email === "admin@smartnotes.com" || usuario.toLowerCase() === "admin";
      const tipoUsuario = adminPadrao || item?.tipoUsuario === "admin" || item?.admin === true ? "admin" : "usuario";
      let senhaHash = String(item?.senhaHash || "").trim();
      if (!/^[0-9a-f]+:[0-9a-f]+$/i.test(senhaHash)) {
        // Backups mobile válidos normalmente sempre possuem senhaHash. Este fallback
        // mantém uma conta administrativa acessível em backups muito antigos.
        senhaHash = adminPadrao ? gerarHashSenha("1234") : gerarHashSenha(randomBytes(12).toString("hex"));
      }

      inserirUsuario.run(
        id,
        nome,
        usuario,
        email,
        senhaHash,
        tipoUsuario,
        String(item?.fotoPerfil || ""),
        item?.codigoRecuperacao || null,
        item?.codigoRecuperacaoExpiraEm || null,
        dataImportada(item?.criadoEm, agoraIso),
        item?.ultimoLogin || null,
        adminPadrao ? 1 : booleanoSql(item?.ativo, true)
      );
    }

    let admin = db.prepare(`
      SELECT id FROM usuarios
      WHERE lower(email) = 'admin@smartnotes.com' OR lower(usuario) = 'admin'
      ORDER BY CASE WHEN lower(email) = 'admin@smartnotes.com' THEN 0 ELSE 1 END, id
      LIMIT 1
    `).get();

    if (!admin) {
      const id = ++proximoUsuario;
      inserirUsuario.run(
        id, "Administrador", usuarioLoginImportado({ usuario: "Admin" }, loginsUsados, id),
        "admin@smartnotes.com", gerarHashSenha("1234"), "admin", "", null, null, agoraIso, null, 1
      );
      admin = { id };
    } else {
      db.prepare("UPDATE usuarios SET tipoUsuario = 'admin', ativo = 1 WHERE id = ?").run(admin.id);
    }
    const adminId = Number(admin.id);

    const usuarioMapeado = (valor, fallback = adminId) => {
      const original = numeroId(valor);
      const mapeado = original ? (mapaUsuarios.get(original) || original) : null;
      return mapeado && idsUsuarios.has(mapeado) ? mapeado : fallback;
    };
    idsUsuarios.add(adminId);

    const mapaCategorias = new Map();
    const idsCategorias = new Set();
    let proximaCategoria = Math.max(0, ...categoriasEntrada.map((item) => numeroId(item?.id) || 0));
    const inserirCategoria = db.prepare(`
      INSERT INTO categorias (id, nome, icone, criadoPor, criadoEm, ativo)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const item of categoriasEntrada) {
      const nome = String(item?.nome || "").trim();
      if (!nome) continue;
      const original = numeroId(item?.id);
      let id = original;
      if (!id || idsCategorias.has(id)) id = ++proximaCategoria;
      idsCategorias.add(id);
      if (original) mapaCategorias.set(original, id);
      inserirCategoria.run(id, nome, String(item?.icone || "📁"), usuarioMapeado(item?.criadoPor), dataImportada(item?.criadoEm, agoraIso), booleanoSql(item?.ativo, true));
    }

    const categoriaPorNome = new Map(db.prepare("SELECT id, nome FROM categorias").all().map((item) => [String(item.nome).toLowerCase(), Number(item.id)]));
    const idsSubcategorias = new Set();
    let proximaSubcategoria = Math.max(0, ...subcategoriasEntrada.map((item) => numeroId(item?.id) || 0));
    const inserirSubcategoria = db.prepare(`
      INSERT OR IGNORE INTO subcategorias (id, categoriaId, nome, criadoPor, criadoEm, ativo)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const item of subcategoriasEntrada) {
      const nome = String(item?.nome || "").trim();
      if (!nome) continue;
      const categoriaOriginal = numeroId(item?.categoriaId);
      const categoriaId = (categoriaOriginal && (mapaCategorias.get(categoriaOriginal) || categoriaOriginal))
        || categoriaPorNome.get(String(item?.categoria || "").trim().toLowerCase());
      if (!categoriaId || !idsCategorias.has(Number(categoriaId))) continue;
      let id = numeroId(item?.id);
      if (!id || idsSubcategorias.has(id)) id = ++proximaSubcategoria;
      idsSubcategorias.add(id);
      inserirSubcategoria.run(id, Number(categoriaId), nome, usuarioMapeado(item?.criadoPor), dataImportada(item?.criadoEm, agoraIso), booleanoSql(item?.ativo, true));
    }

    const mapaNotas = new Map();
    const idsNotas = new Set();
    let proximaNota = Math.max(0, ...notasEntrada.map((item) => numeroId(item?.id) || 0));
    const inserirNota = db.prepare(`
      INSERT INTO notas (
        id, usuarioId, titulo, conteudo, categoria, subcategoria, compartilhada,
        compartilhamentoPrivado, senhaCompartilhamentoHash, imagem, imagens,
        favorita, fixada, naLixeira, criadoEm, atualizadoEm
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of notasEntrada) {
      const original = numeroId(item?.id);
      let id = original;
      if (!id || idsNotas.has(id)) id = ++proximaNota;
      idsNotas.add(id);
      if (original) mapaNotas.set(original, id);
      const imagens = Array.isArray(item?.imagens)
        ? item.imagens.filter(Boolean)
        : (item?.imagem ? [String(item.imagem)] : []);
      inserirNota.run(
        id,
        usuarioMapeado(item?.usuarioId),
        String(item?.titulo || "Sem título"),
        String(item?.conteudo || ""),
        String(item?.categoria || "Atendimentos"),
        String(item?.subcategoria || ""),
        booleanoSql(item?.compartilhada),
        booleanoSql(item?.compartilhamentoPrivado),
        item?.senhaCompartilhamentoHash || null,
        imagens[0] || String(item?.imagem || ""),
        JSON.stringify(imagens),
        booleanoSql(item?.favorita),
        booleanoSql(item?.fixada),
        booleanoSql(item?.naLixeira),
        dataImportada(item?.criadoEm, agoraIso),
        item?.atualizadoEm || null
      );
    }

    const notaMapeada = (valor) => {
      const original = numeroId(valor);
      if (!original) return null;
      const id = mapaNotas.get(original) || original;
      return idsNotas.has(id) ? id : null;
    };

    const inserirFavorito = db.prepare("INSERT OR IGNORE INTO nota_favoritos (notaId, usuarioId, criadoEm) VALUES (?, ?, ?)");
    const inserirFixada = db.prepare("INSERT OR IGNORE INTO nota_fixadas (notaId, usuarioId, criadoEm) VALUES (?, ?, ?)");
    for (const item of favoritosEntrada) {
      const notaId = notaMapeada(item?.notaId);
      if (notaId) inserirFavorito.run(notaId, usuarioMapeado(item?.usuarioId), dataImportada(item?.criadoEm, agoraIso));
    }
    for (const item of fixadasEntrada) {
      const notaId = notaMapeada(item?.notaId);
      if (notaId) inserirFixada.run(notaId, usuarioMapeado(item?.usuarioId), dataImportada(item?.criadoEm, agoraIso));
    }
    // Compatibilidade com backups antigos que guardavam favorita/fixada dentro da nota.
    for (const item of notasEntrada) {
      const notaId = notaMapeada(item?.id);
      if (!notaId) continue;
      const usuarioId = usuarioMapeado(item?.usuarioId);
      if (item?.favorita) inserirFavorito.run(notaId, usuarioId, dataImportada(item?.criadoEm, agoraIso));
      if (item?.fixada) inserirFixada.run(notaId, usuarioId, dataImportada(item?.criadoEm, agoraIso));
    }

    const inserirAcesso = db.prepare("INSERT OR IGNORE INTO nota_acessos_privados (notaId, usuarioId, criadoEm) VALUES (?, ?, ?)");
    for (const item of acessosEntrada) {
      const notaId = notaMapeada(item?.notaId);
      if (notaId) inserirAcesso.run(notaId, usuarioMapeado(item?.usuarioId), dataImportada(item?.criadoEm, agoraIso));
    }

    const idsObservacoes = new Set();
    let proximaObservacao = Math.max(0, ...observacoesEntrada.map((item) => numeroId(item?.id) || 0));
    const inserirObservacao = db.prepare(`
      INSERT INTO nota_observacoes (id, notaId, usuarioId, texto, imagens, criadoEm, atualizadoEm, ativo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of observacoesEntrada) {
      const notaId = notaMapeada(item?.notaId);
      if (!notaId) continue;
      let id = numeroId(item?.id);
      if (!id || idsObservacoes.has(id)) id = ++proximaObservacao;
      idsObservacoes.add(id);
      inserirObservacao.run(
        id, notaId, usuarioMapeado(item?.usuarioId), String(item?.texto || ""),
        JSON.stringify(Array.isArray(item?.imagens) ? item.imagens.filter(Boolean) : []),
        dataImportada(item?.criadoEm, agoraIso), item?.atualizadoEm || null, booleanoSql(item?.ativo, true)
      );
    }

    const mapaPendencias = new Map();
    const idsPendencias = new Set();
    let proximaPendencia = Math.max(0, ...pendenciasEntrada.map((item) => numeroId(item?.id) || 0));
    const inserirPendencia = db.prepare(`
      INSERT INTO pendencias (id, titulo, descricao, imagens, status, escopo, criadoPor, responsavelId, criadoEm, atualizadoEm, ativo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of pendenciasEntrada) {
      const original = numeroId(item?.id);
      let id = original;
      if (!id || idsPendencias.has(id)) id = ++proximaPendencia;
      idsPendencias.add(id);
      if (original) mapaPendencias.set(original, id);
      const autorId = usuarioMapeado(item?.criadoPor);
      inserirPendencia.run(
        id,
        String(item?.titulo || "Pendência"),
        String(item?.descricao || ""),
        JSON.stringify(Array.isArray(item?.imagens) ? item.imagens.filter(Boolean) : []),
        ["a_fazer", "em_andamento", "concluido"].includes(item?.status) ? item.status : "a_fazer",
        item?.escopo === "equipe" ? "equipe" : "individual",
        autorId,
        usuarioMapeado(item?.responsavelId, autorId),
        dataImportada(item?.criadoEm, agoraIso),
        dataImportada(item?.atualizadoEm, dataImportada(item?.criadoEm, agoraIso)),
        booleanoSql(item?.ativo, true)
      );
    }

    const pendenciaMapeada = (valor) => {
      const original = numeroId(valor);
      if (!original) return null;
      const id = mapaPendencias.get(original) || original;
      return idsPendencias.has(id) ? id : null;
    };
    const idsPendenciaItens = new Set();
    let proximoPendenciaItem = Math.max(0, ...pendenciaItensEntrada.map((item) => numeroId(item?.id) || 0));
    const inserirPendenciaItem = db.prepare(`
      INSERT INTO pendencia_itens (
        id, pendenciaId, texto, concluido, concluidoPor, concluidoPorNome,
        concluidoEm, ordem, criadoEm, atualizadoEm
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of pendenciaItensEntrada) {
      const pendenciaId = pendenciaMapeada(item?.pendenciaId);
      if (!pendenciaId) continue;
      let id = numeroId(item?.id);
      if (!id || idsPendenciaItens.has(id)) id = ++proximoPendenciaItem;
      idsPendenciaItens.add(id);
      const concluido = booleanoSql(item?.concluido);
      const concluidorOriginal = numeroId(item?.concluidoPor);
      const concluidorId = concluido && concluidorOriginal ? usuarioMapeado(concluidorOriginal, null) : null;
      inserirPendenciaItem.run(
        id,
        pendenciaId,
        String(item?.texto || "Item"),
        concluido,
        concluidorId,
        concluido ? (String(item?.concluidoPorNome || "").trim() || null) : null,
        concluido ? (item?.concluidoEm || null) : null,
        Number.isFinite(Number(item?.ordem)) ? Number(item.ordem) : 0,
        dataImportada(item?.criadoEm, agoraIso),
        dataImportada(item?.atualizadoEm, dataImportada(item?.criadoEm, agoraIso))
      );
    }

    db.prepare("DELETE FROM sessoes").run();

    return {
      usuarios: db.prepare("SELECT COUNT(*) AS total FROM usuarios").get().total,
      notas: db.prepare("SELECT COUNT(*) AS total FROM notas").get().total,
      categorias: db.prepare("SELECT COUNT(*) AS total FROM categorias WHERE ativo = 1").get().total,
      pendencias: db.prepare("SELECT COUNT(*) AS total FROM pendencias WHERE ativo = 1").get().total
    };
  });

  return executar();
}

app.get("/backups", autenticar, exigirAdmin, (req, res) => {
  const arquivos = fs.readdirSync(BACKUPS_DIR)
    .filter((nome) => nome.endsWith(".db"))
    .map((nome) => {
      const completo = path.join(BACKUPS_DIR, nome);
      const stat = fs.statSync(completo);
      return { nome, tamanho: stat.size, criadoEm: stat.mtime.toISOString() };
    })
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  res.json(arquivos);
});

app.post("/backups", autenticar, exigirAdmin, async (req, res) => {
  try {
    const nome = nomeArquivoData("smart-notes-backup");
    await criarCopiaBanco(path.join(BACKUPS_DIR, nome));
    res.status(201).json({ mensagem: "Backup criado com sucesso", nome });
  } catch (error) {
    res.status(500).json({ erro: error.message || "Não foi possível criar o backup" });
  }
});

app.get("/backups/export-database", autenticar, exigirAdmin, async (req, res) => {
  const nome = nomeArquivoData("smart-notes");
  const temporario = path.join(BACKUPS_DIR, `.export-${process.pid}-${Date.now()}.db`);

  try {
    await criarCopiaBanco(temporario);

    const conteudo = fs.readFileSync(temporario);
    if (conteudo.length < 100 || conteudo.subarray(0, 16).toString("utf8") !== "SQLite format 3\u0000") {
      throw new Error("A cópia gerada não é um banco SQLite válido.");
    }

    fs.rmSync(temporario, { force: true });

    res.status(200);
    res.setHeader("Content-Type", "application/vnd.sqlite3");
    res.setHeader("Content-Disposition", `attachment; filename="${nome}"; filename*=UTF-8''${encodeURIComponent(nome)}`);
    res.setHeader("Content-Length", String(conteudo.length));
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.send(conteudo);
  } catch (error) {
    fs.rmSync(temporario, { force: true });
    if (!res.headersSent) {
      res.status(500).json({ erro: error.message || "Não foi possível exportar o banco" });
    }
  }
});

app.post(
  "/backups/import-database",
  autenticar,
  exigirAdmin,
  express.raw({ type: ["application/octet-stream", "application/vnd.sqlite3", "application/x-sqlite3", "application/json", "text/json"], limit: "250mb" }),
  async (req, res) => {
    let recebido = null;
    try {
      if (!Buffer.isBuffer(req.body) || req.body.length < 2) {
        return res.status(400).json({ erro: "Selecione um arquivo .db ou .json válido" });
      }

      const inicioTexto = req.body.subarray(0, Math.min(req.body.length, 2048)).toString("utf8").replace(/^\uFEFF/, "").trimStart();
      const pareceJson = inicioTexto.startsWith("{");

      if (pareceJson) {
        let dados;
        try {
          dados = JSON.parse(req.body.toString("utf8").replace(/^\uFEFF/, ""));
        } catch {
          return res.status(400).json({ erro: "O arquivo JSON está inválido ou corrompido." });
        }

        validarBackupMobileJson(dados);
        const backupSeguranca = nomeArquivoData("smart-notes-antes-da-importacao-mobile");
        await criarCopiaBanco(path.join(BACKUPS_DIR, backupSeguranca));
        const resumo = importarBackupMobileJson(dados);

        return res.json({
          mensagem: "Backup do celular importado com sucesso. Os dados JSON foram convertidos para o banco SQLite do computador.",
          backupSeguranca,
          reiniciando: false,
          sessaoEncerrada: true,
          origem: "mobile-json",
          resumo
        });
      }

      if (req.body.length < 100) {
        return res.status(400).json({ erro: "Selecione um arquivo .db SQLite válido ou um backup .json do Smart Notes Mobile" });
      }

      recebido = path.join(BACKUPS_DIR, `.import-${process.pid}-${Date.now()}.db`);
      fs.writeFileSync(recebido, req.body);
      validarBancoImportado(recebido);

      const backupSeguranca = nomeArquivoData("smart-notes-antes-da-importacao");
      await criarCopiaBanco(path.join(BACKUPS_DIR, backupSeguranca));

      fs.copyFileSync(recebido, PENDING_IMPORT_PATH);
      fs.writeFileSync(IMPORT_INFO_PATH, JSON.stringify({
        criadoEm: new Date().toISOString(),
        backupSeguranca
      }, null, 2));

      res.json({
        mensagem: "Banco validado. O Smart Notes será reiniciado para concluir a importação.",
        backupSeguranca,
        reiniciando: true,
        origem: "desktop-db"
      });

      setTimeout(() => {
        try { db.close(); } catch (error) { console.error(error); }
        process.exit(75);
      }, 700);
    } catch (error) {
      res.status(400).json({ erro: error.message || "Não foi possível importar o banco" });
    } finally {
      if (recebido) fs.rmSync(recebido, { force: true });
    }
  }
);

async function criarBackupDiarioSeNecessario() {
  const dia = new Date().toISOString().slice(0, 10);
  const nome = `smart-notes-diario-${dia}.db`;
  const destino = path.join(BACKUPS_DIR, nome);
  if (!fs.existsSync(destino)) {
    await criarCopiaBanco(destino);
    console.log(`[Banco] Backup diario criado: ${nome}`);
  }
}

criarBackupDiarioSeNecessario().catch((error) => {
  console.error("[Banco] Nao foi possivel criar o backup diario:", error.message);
});



const STATUS_PENDENCIA = new Set(["a_fazer", "em_andamento", "concluido"]);
const ESCOPOS_PENDENCIA = new Set(["individual", "equipe"]);

function escopoPendencia(pendencia) {
  return pendencia?.escopo === "equipe" ? "equipe" : "individual";
}

function podeEditarPendencia(pendencia, usuario) {
  if (escopoPendencia(pendencia) === "equipe") return true;
  return usuario.tipoUsuario === "admin"
    || Number(pendencia.criadoPor) === Number(usuario.id)
    || Number(pendencia.responsavelId) === Number(usuario.id);
}

function podeExcluirPendencia(pendencia, usuario) {
  if (escopoPendencia(pendencia) === "equipe") {
    return usuario.tipoUsuario === "admin" || Number(pendencia.criadoPor) === Number(usuario.id);
  }
  return podeEditarPendencia(pendencia, usuario);
}

function podeAlterarEscopoPendencia(pendencia, usuario) {
  return usuario.tipoUsuario === "admin" || Number(pendencia.criadoPor) === Number(usuario.id);
}

function sincronizarItensPendencia(pendenciaId, itensRecebidos, usuario, instante) {
  const atuais = db.prepare("SELECT * FROM pendencia_itens WHERE pendenciaId = ? ORDER BY ordem, id").all(pendenciaId);
  const atuaisPorId = new Map(atuais.map((item) => [Number(item.id), item]));
  const idsMantidos = new Set();
  const atualizar = db.prepare(`
    UPDATE pendencia_itens
    SET texto = ?, concluido = ?, concluidoPor = ?, concluidoPorNome = ?, concluidoEm = ?, ordem = ?, atualizadoEm = ?
    WHERE id = ? AND pendenciaId = ?
  `);
  const inserir = db.prepare(`
    INSERT INTO pendencia_itens (
      pendenciaId, texto, concluido, concluidoPor, concluidoPorNome, concluidoEm, ordem, criadoEm, atualizadoEm
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  (Array.isArray(itensRecebidos) ? itensRecebidos : []).forEach((item, ordem) => {
    const texto = String(typeof item === "string" ? item : (item?.texto || "")).trim();
    if (!texto) return;

    const idRecebido = Number(item?.id);
    const atual = Number.isInteger(idRecebido) ? atuaisPorId.get(idRecebido) : null;
    const concluido = item?.concluido ? 1 : 0;
    let concluidoPor = null;
    let concluidoPorNome = null;
    let concluidoEm = null;

    if (concluido) {
      if (atual && Boolean(atual.concluido)) {
        concluidoPor = atual.concluidoPor || null;
        concluidoPorNome = atual.concluidoPorNome || null;
        concluidoEm = atual.concluidoEm || null;
      } else {
        concluidoPor = usuario.id;
        concluidoPorNome = usuario.nome || "Usuário";
        concluidoEm = instante;
      }
    }

    if (atual) {
      atualizar.run(
        texto,
        concluido,
        concluidoPor,
        concluidoPorNome,
        concluidoEm,
        ordem,
        instante,
        atual.id,
        pendenciaId
      );
      idsMantidos.add(Number(atual.id));
      return;
    }

    const resultado = inserir.run(
      pendenciaId,
      texto,
      concluido,
      concluidoPor,
      concluidoPorNome,
      concluidoEm,
      ordem,
      instante,
      instante
    );
    idsMantidos.add(Number(resultado.lastInsertRowid));
  });

  const excluir = db.prepare("DELETE FROM pendencia_itens WHERE id = ? AND pendenciaId = ?");
  atuais.forEach((item) => {
    if (!idsMantidos.has(Number(item.id))) excluir.run(item.id, pendenciaId);
  });
}

function concluirPendenciaSeChecklistCompleto(pendenciaId, instante) {
  const resumo = db.prepare(`
    SELECT COUNT(*) AS total, SUM(CASE WHEN concluido = 1 THEN 1 ELSE 0 END) AS concluidos
    FROM pendencia_itens
    WHERE pendenciaId = ?
  `).get(pendenciaId);

  const total = Number(resumo?.total || 0);
  const concluidos = Number(resumo?.concluidos || 0);
  if (total > 0 && concluidos === total) {
    db.prepare("UPDATE pendencias SET status = 'concluido', atualizadoEm = ? WHERE id = ?")
      .run(instante, pendenciaId);
    return true;
  }
  return false;
}

function normalizarPendencia(row, usuario) {
  const itens = db.prepare(`
    SELECT i.*, u.nome AS usuarioConcluidorNome
    FROM pendencia_itens i
    LEFT JOIN usuarios u ON u.id = i.concluidoPor
    WHERE i.pendenciaId = ?
    ORDER BY i.ordem, i.id
  `).all(row.id).map((item) => {
    const { usuarioConcluidorNome, ...dadosItem } = item;
    return {
      ...dadosItem,
      concluido: Boolean(item.concluido),
      concluidoPorNome: usuarioConcluidorNome || item.concluidoPorNome || null
    };
  });
  const concluidos = itens.filter((item) => item.concluido).length;
  const total = itens.length;
  const escopo = escopoPendencia(row);

  return {
    ...row,
    escopo,
    ativo: Boolean(row.ativo),
    imagens: lerImagens(row.imagens),
    itens,
    concluidos,
    total,
    progresso: total ? Math.round((concluidos * 100) / total) : 0,
    podeEditar: usuario ? podeEditarPendencia({ ...row, escopo }, usuario) : false,
    podeExcluir: usuario ? podeExcluirPendencia({ ...row, escopo }, usuario) : false,
    podeAlterarEscopo: usuario ? podeAlterarEscopoPendencia({ ...row, escopo }, usuario) : false
  };
}

function buscarPendencia(id) {
  return db.prepare(`
    SELECT p.*, c.nome AS autorNome, r.nome AS responsavelNome
    FROM pendencias p
    LEFT JOIN usuarios c ON c.id = p.criadoPor
    LEFT JOIN usuarios r ON r.id = p.responsavelId
    WHERE p.id = ? AND p.ativo = 1
  `).get(id);
}

app.get("/pendencias", autenticar, (req, res) => {
  const baseConsulta = `
    SELECT p.*, c.nome AS autorNome, r.nome AS responsavelNome
    FROM pendencias p
    LEFT JOIN usuarios c ON c.id = p.criadoPor
    LEFT JOIN usuarios r ON r.id = p.responsavelId
    WHERE p.ativo = 1
  `;

  const rows = req.usuario.tipoUsuario === "admin"
    ? db.prepare(`${baseConsulta} ORDER BY p.atualizadoEm DESC`).all()
    : db.prepare(`${baseConsulta}
        AND (
          COALESCE(p.escopo, 'individual') = 'equipe'
          OR p.criadoPor = ?
          OR p.responsavelId = ?
        )
        ORDER BY p.atualizadoEm DESC
      `).all(req.usuario.id, req.usuario.id);

  res.json(rows.map((row) => normalizarPendencia(row, req.usuario)));
});

app.post("/pendencias", autenticar, (req, res) => {
  const titulo = String(req.body.titulo || "").trim();
  const descricao = String(req.body.descricao || "").trim();
  const status = STATUS_PENDENCIA.has(req.body.status) ? req.body.status : "a_fazer";
  const escopo = ESCOPOS_PENDENCIA.has(req.body.escopo) ? req.body.escopo : "individual";
  let imagens = [];

  try {
    imagens = validarImagens(req.body.imagens || [], 6);
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }

  let responsavelId = req.usuario.id;
  if (req.usuario.tipoUsuario === "admin" && req.body.responsavelId) {
    responsavelId = Number(req.body.responsavelId);
  }

  const responsavel = db.prepare("SELECT id FROM usuarios WHERE id = ? AND ativo = 1").get(responsavelId);
  if (!titulo) return res.status(400).json({ erro: "Informe o título da pendência" });
  if (!responsavel) return res.status(400).json({ erro: "Responsável inválido ou inativo" });

  const agora = new Date().toISOString();
  const transacao = db.transaction(() => {
    const resultado = db.prepare(`
      INSERT INTO pendencias (
        titulo, descricao, imagens, status, escopo, criadoPor, responsavelId, criadoEm, atualizadoEm, ativo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(titulo, descricao, JSON.stringify(imagens), status, escopo, req.usuario.id, responsavelId, agora, agora);

    sincronizarItensPendencia(resultado.lastInsertRowid, req.body.itens, req.usuario, agora);
    concluirPendenciaSeChecklistCompleto(resultado.lastInsertRowid, agora);

    return resultado.lastInsertRowid;
  });

  const id = transacao();
  res.status(201).json(normalizarPendencia(buscarPendencia(id), req.usuario));
});

app.put("/pendencias/:id", autenticar, (req, res) => {
  const pendencia = buscarPendencia(Number(req.params.id));
  if (!pendencia) return res.status(404).json({ erro: "Pendência não encontrada" });
  if (!podeEditarPendencia(pendencia, req.usuario)) {
    return res.status(403).json({ erro: "Sem permissão para alterar esta pendência" });
  }

  const titulo = String(req.body.titulo ?? pendencia.titulo).trim();
  const descricao = String(req.body.descricao ?? pendencia.descricao).trim();
  const status = STATUS_PENDENCIA.has(req.body.status) ? req.body.status : pendencia.status;
  let imagens = lerImagens(pendencia.imagens);
  if (req.body.imagens !== undefined) {
    try {
      imagens = validarImagens(req.body.imagens || [], 6);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }
  let escopo = escopoPendencia(pendencia);
  let responsavelId = pendencia.responsavelId;

  if (!titulo) return res.status(400).json({ erro: "Informe o título da pendência" });

  if (podeAlterarEscopoPendencia(pendencia, req.usuario) && ESCOPOS_PENDENCIA.has(req.body.escopo)) {
    escopo = req.body.escopo;
  }

  if (req.usuario.tipoUsuario === "admin" && req.body.responsavelId !== undefined) {
    responsavelId = Number(req.body.responsavelId);
  }

  if (!db.prepare("SELECT id FROM usuarios WHERE id = ? AND ativo = 1").get(responsavelId)) {
    return res.status(400).json({ erro: "Responsável inválido" });
  }

  const agora = new Date().toISOString();
  const transacao = db.transaction(() => {
    db.prepare(`
      UPDATE pendencias
      SET titulo = ?, descricao = ?, imagens = ?, status = ?, escopo = ?, responsavelId = ?, atualizadoEm = ?
      WHERE id = ?
    `).run(titulo, descricao, JSON.stringify(imagens), status, escopo, responsavelId, agora, pendencia.id);

    if (Array.isArray(req.body.itens)) {
      sincronizarItensPendencia(pendencia.id, req.body.itens, req.usuario, agora);
      concluirPendenciaSeChecklistCompleto(pendencia.id, agora);
    }
  });

  transacao();
  res.json(normalizarPendencia(buscarPendencia(pendencia.id), req.usuario));
});

app.patch("/pendencias/:id/status", autenticar, (req, res) => {
  const pendencia = buscarPendencia(Number(req.params.id));
  const status = String(req.body.status || "");
  if (!pendencia) return res.status(404).json({ erro: "Pendência não encontrada" });
  if (!podeEditarPendencia(pendencia, req.usuario)) return res.status(403).json({ erro: "Sem permissão" });
  if (!STATUS_PENDENCIA.has(status)) return res.status(400).json({ erro: "Status inválido" });

  db.prepare("UPDATE pendencias SET status = ?, atualizadoEm = ? WHERE id = ?")
    .run(status, new Date().toISOString(), pendencia.id);
  res.json(normalizarPendencia(buscarPendencia(pendencia.id), req.usuario));
});

app.delete("/pendencias/:id", autenticar, (req, res) => {
  const pendencia = buscarPendencia(Number(req.params.id));
  if (!pendencia) return res.status(404).json({ erro: "Pendência não encontrada" });
  if (!podeExcluirPendencia(pendencia, req.usuario)) {
    return res.status(403).json({ erro: "Somente o criador ou um administrador pode excluir esta pendência da equipe" });
  }

  db.prepare("UPDATE pendencias SET ativo = 0, atualizadoEm = ? WHERE id = ?")
    .run(new Date().toISOString(), pendencia.id);
  res.json({ mensagem: "Pendência excluída" });
});

app.listen(3000, "0.0.0.0", () => {
  console.log("Smart Notes 1.5.4 rodando em http://localhost:3000");
});
