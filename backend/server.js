const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const { randomBytes, pbkdf2Sync, timingSafeEqual } = require("crypto");
const db = require("./database");

const app = express();

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
  const hashDigitado = pbkdf2Sync(
    senha,
    salt,
    100000,
    64,
    "sha512"
  ).toString("hex");

  try {
    return timingSafeEqual(
      Buffer.from(hashOriginal, "hex"),
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
    ultimoLogin: usuario.ultimoLogin
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
        usuarios.email AS autorEmail
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
    versao: "1.4.2"
  });
});

app.post("/auth/cadastro", (req, res) => {
  const nome = String(req.body.nome || "").trim();
  const usuarioLogin = String(req.body.usuario || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const senha = String(req.body.senha || "");

  if (!nome || !usuarioLogin || !email || !senha) {
    return res.status(400).json({ erro: "Preencha nome, usuário, e-mail e senha" });
  }

  if (!/^[a-zA-Z0-9._-]{3,30}$/.test(usuarioLogin)) {
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
  const nome = String(req.body.nome || "").trim();
  const usuarioLogin = String(req.body.usuario || req.usuario.usuario || "").trim();
  const fotoPerfil = String(req.body.fotoPerfil || "");

  if (!nome || !usuarioLogin) {
    return res.status(400).json({ erro: "Informe nome e usuário" });
  }

  if (!/^[a-zA-Z0-9._-]{3,30}$/.test(usuarioLogin)) {
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
    SELECT id, nome, usuario, email, fotoPerfil, tipoUsuario, criadoEm, ultimoLogin, ativo
    FROM usuarios
    ORDER BY ativo DESC, nome
  `).all();

  res.json(usuarios.map(normalizarUsuario));
});

app.put("/admin/usuarios/:id", autenticar, exigirAdmin, (req, res) => {
  const id = Number(req.params.id);
  const nome = String(req.body.nome || "").trim();
  const usuarioLogin = String(req.body.usuario || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const tipoUsuario = String(req.body.tipoUsuario || "usuario") === "admin" ? "admin" : "usuario";
  const ativo = req.body.ativo ? 1 : 0;

  if (!nome || !usuarioLogin || !email) {
    return res.status(400).json({ erro: "Preencha nome, usuário e e-mail" });
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

app.post("/categorias/subcategorias", autenticar, (req, res) => {
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

app.delete('/categorias/subcategorias/:id', autenticar, (req, res) => {
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

app.post('/categorias/subcategorias/excluir', autenticar, (req, res) => {
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
      usuarios.email AS autorEmail
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
  let imagens = [];

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
    for (const tabela of ["usuarios", "notas", "categorias", "subcategorias"]) {
      if (!tabelas.has(tabela)) {
        throw new Error("O arquivo não pertence ao Smart Notes ou está incompleto.");
      }
    }
  } finally {
    importado.close();
  }
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
  express.raw({ type: ["application/octet-stream", "application/vnd.sqlite3", "application/x-sqlite3"], limit: "250mb" }),
  async (req, res) => {
    let recebido = null;
    try {
      if (!Buffer.isBuffer(req.body) || req.body.length < 100) {
        return res.status(400).json({ erro: "Selecione um arquivo .db válido" });
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
        reiniciando: true
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

app.listen(3000, "0.0.0.0", () => {
  console.log("Smart Notes 1.4.2 rodando em http://localhost:3000");
});
