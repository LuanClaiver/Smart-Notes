const path = require("path");
const { randomBytes, pbkdf2Sync } = require("crypto");
const Database = require("better-sqlite3");

const db = new Database(path.join(__dirname, "notas.db"));

db.pragma("foreign_keys = ON");

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

function colunasTabela(nomeTabela) {
  return db
    .prepare(`PRAGMA table_info(${nomeTabela})`)
    .all()
    .map((coluna) => coluna.name);
}

function adicionarColuna(nomeTabela, nomeColuna, comando) {
  const colunas = colunasTabela(nomeTabela);

  if (!colunas.includes(nomeColuna)) {
    db.exec(`ALTER TABLE ${nomeTabela} ADD COLUMN ${comando}`);
  }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    usuario TEXT,
    email TEXT NOT NULL UNIQUE,
    senhaHash TEXT NOT NULL,
    tipoUsuario TEXT DEFAULT 'usuario',
    fotoPerfil TEXT,
    codigoRecuperacao TEXT,
    codigoRecuperacaoExpiraEm TEXT,
    criadoEm TEXT NOT NULL,
    ultimoLogin TEXT,
    ativo INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS sessoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuarioId INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    criadoEm TEXT NOT NULL,
    expiraEm TEXT NOT NULL,
    FOREIGN KEY (usuarioId) REFERENCES usuarios(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS notas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuarioId INTEGER NOT NULL,
    titulo TEXT NOT NULL,
    conteudo TEXT NOT NULL,
    categoria TEXT NOT NULL,
    subcategoria TEXT DEFAULT '',
    compartilhada INTEGER DEFAULT 0,
    compartilhamentoPrivado INTEGER DEFAULT 0,
    senhaCompartilhamentoHash TEXT,
    imagem TEXT,
    imagens TEXT DEFAULT '[]',
    favorita INTEGER DEFAULT 0,
    fixada INTEGER DEFAULT 0,
    naLixeira INTEGER DEFAULT 0,
    criadoEm TEXT NOT NULL,
    atualizadoEm TEXT,
    FOREIGN KEY (usuarioId) REFERENCES usuarios(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE,
    icone TEXT DEFAULT '📁',
    criadoPor INTEGER,
    criadoEm TEXT NOT NULL,
    ativo INTEGER DEFAULT 1,
    FOREIGN KEY (criadoPor) REFERENCES usuarios(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS subcategorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    categoriaId INTEGER NOT NULL,
    nome TEXT NOT NULL,
    criadoPor INTEGER,
    criadoEm TEXT NOT NULL,
    ativo INTEGER DEFAULT 1,
    UNIQUE(categoriaId, nome),
    FOREIGN KEY (categoriaId) REFERENCES categorias(id) ON DELETE CASCADE,
    FOREIGN KEY (criadoPor) REFERENCES usuarios(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS nota_favoritos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    notaId INTEGER NOT NULL,
    usuarioId INTEGER NOT NULL,
    criadoEm TEXT NOT NULL,
    UNIQUE(notaId, usuarioId),
    FOREIGN KEY (notaId) REFERENCES notas(id) ON DELETE CASCADE,
    FOREIGN KEY (usuarioId) REFERENCES usuarios(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS nota_fixadas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    notaId INTEGER NOT NULL,
    usuarioId INTEGER NOT NULL,
    criadoEm TEXT NOT NULL,
    UNIQUE(notaId, usuarioId),
    FOREIGN KEY (notaId) REFERENCES notas(id) ON DELETE CASCADE,
    FOREIGN KEY (usuarioId) REFERENCES usuarios(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS nota_observacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    notaId INTEGER NOT NULL,
    usuarioId INTEGER NOT NULL,
    texto TEXT NOT NULL,
    imagens TEXT DEFAULT '[]',
    criadoEm TEXT NOT NULL,
    atualizadoEm TEXT,
    ativo INTEGER DEFAULT 1,
    FOREIGN KEY (notaId) REFERENCES notas(id) ON DELETE CASCADE,
    FOREIGN KEY (usuarioId) REFERENCES usuarios(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS pendencias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    descricao TEXT DEFAULT '',
    imagens TEXT DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'a_fazer',
    escopo TEXT NOT NULL DEFAULT 'individual',
    criadoPor INTEGER,
    responsavelId INTEGER NOT NULL,
    criadoEm TEXT NOT NULL,
    atualizadoEm TEXT NOT NULL,
    ativo INTEGER DEFAULT 1,
    FOREIGN KEY (criadoPor) REFERENCES usuarios(id) ON DELETE SET NULL,
    FOREIGN KEY (responsavelId) REFERENCES usuarios(id) ON DELETE RESTRICT
  );

  CREATE TABLE IF NOT EXISTS pendencia_itens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pendenciaId INTEGER NOT NULL,
    texto TEXT NOT NULL,
    concluido INTEGER DEFAULT 0,
    concluidoPor INTEGER,
    concluidoPorNome TEXT,
    concluidoEm TEXT,
    ordem INTEGER DEFAULT 0,
    criadoEm TEXT NOT NULL,
    atualizadoEm TEXT NOT NULL,
    FOREIGN KEY (pendenciaId) REFERENCES pendencias(id) ON DELETE CASCADE,
    FOREIGN KEY (concluidoPor) REFERENCES usuarios(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS nota_acessos_privados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    notaId INTEGER NOT NULL,
    usuarioId INTEGER NOT NULL,
    criadoEm TEXT NOT NULL,
    UNIQUE(notaId, usuarioId),
    FOREIGN KEY (notaId) REFERENCES notas(id) ON DELETE CASCADE,
    FOREIGN KEY (usuarioId) REFERENCES usuarios(id) ON DELETE CASCADE
  );
`);

adicionarColuna("usuarios", "usuario", "usuario TEXT");
adicionarColuna("usuarios", "tipoUsuario", "tipoUsuario TEXT DEFAULT 'usuario'");
adicionarColuna("usuarios", "fotoPerfil", "fotoPerfil TEXT");
adicionarColuna("usuarios", "codigoRecuperacao", "codigoRecuperacao TEXT");
adicionarColuna("usuarios", "codigoRecuperacaoExpiraEm", "codigoRecuperacaoExpiraEm TEXT");
adicionarColuna("usuarios", "ultimoLogin", "ultimoLogin TEXT");
adicionarColuna("usuarios", "ativo", "ativo INTEGER DEFAULT 1");

adicionarColuna("notas", "usuarioId", "usuarioId INTEGER");
adicionarColuna("notas", "atualizadoEm", "atualizadoEm TEXT");
adicionarColuna("notas", "compartilhada", "compartilhada INTEGER DEFAULT 0");
adicionarColuna("notas", "subcategoria", "subcategoria TEXT DEFAULT ''");
adicionarColuna("notas", "compartilhamentoPrivado", "compartilhamentoPrivado INTEGER DEFAULT 0");
adicionarColuna("notas", "senhaCompartilhamentoHash", "senhaCompartilhamentoHash TEXT");
adicionarColuna("notas", "imagem", "imagem TEXT");
adicionarColuna("notas", "imagens", "imagens TEXT DEFAULT '[]'");
adicionarColuna("notas", "favorita", "favorita INTEGER DEFAULT 0");
adicionarColuna("notas", "fixada", "fixada INTEGER DEFAULT 0");
adicionarColuna("notas", "naLixeira", "naLixeira INTEGER DEFAULT 0");

adicionarColuna("categorias", "icone", "icone TEXT DEFAULT '📁'");
adicionarColuna("categorias", "criadoPor", "criadoPor INTEGER");
adicionarColuna("categorias", "criadoEm", "criadoEm TEXT");
adicionarColuna("categorias", "ativo", "ativo INTEGER DEFAULT 1");

adicionarColuna("subcategorias", "categoriaId", "categoriaId INTEGER");
adicionarColuna("subcategorias", "criadoPor", "criadoPor INTEGER");
adicionarColuna("subcategorias", "criadoEm", "criadoEm TEXT");
adicionarColuna("subcategorias", "ativo", "ativo INTEGER DEFAULT 1");

adicionarColuna("pendencias", "escopo", "escopo TEXT NOT NULL DEFAULT 'individual'");
adicionarColuna("pendencias", "imagens", "imagens TEXT DEFAULT '[]'");
adicionarColuna("pendencia_itens", "concluidoPor", "concluidoPor INTEGER");
adicionarColuna("pendencia_itens", "concluidoPorNome", "concluidoPorNome TEXT");
adicionarColuna("pendencia_itens", "concluidoEm", "concluidoEm TEXT");

db.prepare("UPDATE categorias SET icone = '📁' WHERE icone IS NULL OR icone = ''").run();
db.prepare("UPDATE categorias SET criadoEm = ? WHERE criadoEm IS NULL OR criadoEm = ''").run(new Date().toISOString());
db.prepare("UPDATE categorias SET ativo = 1 WHERE ativo IS NULL").run();
db.prepare("UPDATE subcategorias SET criadoEm = ? WHERE criadoEm IS NULL OR criadoEm = ''").run(new Date().toISOString());
db.prepare("UPDATE subcategorias SET ativo = 1 WHERE ativo IS NULL").run();
db.prepare("UPDATE pendencias SET escopo = 'individual' WHERE escopo IS NULL OR escopo NOT IN ('individual', 'equipe')").run();

function gerarUsuarioUnico(nome, email, id) {
  const baseOriginal = String(email || nome || `usuario${id}`)
    .split("@")[0]
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, 28) || `usuario${id}`;

  let candidato = baseOriginal;
  let contador = 1;

  while (db.prepare("SELECT id FROM usuarios WHERE lower(usuario) = lower(?) AND id != ?").get(candidato, id)) {
    contador += 1;
    candidato = `${baseOriginal.slice(0, 24)}${contador}`;
  }

  return candidato;
}

for (const usuarioExistente of db.prepare("SELECT id, nome, email, usuario FROM usuarios ORDER BY id").all()) {
  const atual = String(usuarioExistente.usuario || "").trim();
  const usuario = atual || gerarUsuarioUnico(usuarioExistente.nome, usuarioExistente.email, usuarioExistente.id);
  db.prepare("UPDATE usuarios SET usuario = ? WHERE id = ?").run(usuario, usuarioExistente.id);
}

db.exec("CREATE UNIQUE INDEX IF NOT EXISTS ux_usuarios_usuario_nocase ON usuarios(usuario COLLATE NOCASE)");

let usuarioPadrao = db
  .prepare("SELECT * FROM usuarios WHERE email = ?")
  .get("admin@smartnotes.com");

if (!usuarioPadrao) {
  const resultado = db
    .prepare(`
      INSERT INTO usuarios (
        nome,
        usuario,
        email,
        senhaHash,
        tipoUsuario,
        criadoEm,
        ativo
      )
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `)
    .run(
      "Administrador",
      "Admin",
      "admin@smartnotes.com",
      gerarHashSenha("1234"),
      "admin",
      new Date().toISOString()
    );

  usuarioPadrao = db
    .prepare("SELECT * FROM usuarios WHERE id = ?")
    .get(resultado.lastInsertRowid);
} else {
  db.prepare("UPDATE usuarios SET tipoUsuario = 'admin', ativo = 1, usuario = COALESCE(NULLIF(usuario, ''), 'Admin') WHERE id = ?")
    .run(usuarioPadrao.id);
}

db.prepare(`
  UPDATE notas
  SET usuarioId = ?
  WHERE usuarioId IS NULL
`).run(usuarioPadrao.id);

db.prepare(`
  UPDATE notas
  SET imagens = json_array(imagem)
  WHERE imagem IS NOT NULL
  AND imagem != ''
  AND (imagens IS NULL OR imagens = '' OR imagens = '[]')
`).run();

const categoriasPadrao = [
  ["Atendimentos", "🧾", ["Redes", "Sistemas", "Impressoras", "Acesso", "Equipamentos"]],
  ["Trabalho", "💼", ["Rotina", "Pendências", "Reuniões", "Suporte"]],
  ["Projetos", "🚀", ["Backend", "Frontend", "Banco de dados", "Design"]],
  ["Documentação", "📚", ["Manuais", "Procedimentos", "Relatórios"]],
  ["Ideias", "💡", ["Melhorias", "Rascunhos", "Inspirações"]]
];

for (const [nome, icone, subcategorias] of categoriasPadrao) {
  db.prepare(`
    INSERT OR IGNORE INTO categorias (nome, icone, criadoPor, criadoEm, ativo)
    VALUES (?, ?, ?, ?, 1)
  `).run(nome, icone, usuarioPadrao.id, new Date().toISOString());

  const categoria = db.prepare("SELECT id FROM categorias WHERE nome = ?").get(nome);

  for (const subcategoria of subcategorias) {
    db.prepare(`
      INSERT OR IGNORE INTO subcategorias (categoriaId, nome, criadoPor, criadoEm, ativo)
      VALUES (?, ?, ?, ?, 1)
    `).run(categoria.id, subcategoria, usuarioPadrao.id, new Date().toISOString());
  }
}

const notasAntigasFavoritas = db.prepare(`
  SELECT id, usuarioId
  FROM notas
  WHERE favorita = 1
`).all();

for (const nota of notasAntigasFavoritas) {
  db.prepare(`
    INSERT OR IGNORE INTO nota_favoritos (notaId, usuarioId, criadoEm)
    VALUES (?, ?, ?)
  `).run(nota.id, nota.usuarioId, new Date().toISOString());
}

const notasAntigasFixadas = db.prepare(`
  SELECT id, usuarioId
  FROM notas
  WHERE fixada = 1
`).all();

for (const nota of notasAntigasFixadas) {
  db.prepare(`
    INSERT OR IGNORE INTO nota_fixadas (notaId, usuarioId, criadoEm)
    VALUES (?, ?, ?)
  `).run(nota.id, nota.usuarioId, new Date().toISOString());
}

module.exports = db;

// Corrige somente a conta administrativa padrão em bancos antigos, sem redefinir senha.
db.prepare(`UPDATE usuarios SET tipoUsuario = 'admin', ativo = 1 WHERE lower(email) = lower(?) OR lower(usuario) = lower(?)`).run('admin@smartnotes.com', 'Admin');
