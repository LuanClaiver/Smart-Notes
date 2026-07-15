const express = require("express");
const cors = require("cors");
const db = require("./database");

const app = express();

app.use(cors());
app.use(express.json());

// Listar
app.get("/notas", (req, res) => {

  const notas = db
    .prepare(
      "SELECT * FROM notas ORDER BY id DESC"
    )
    .all();

  res.json(
    notas.map((nota) => ({
      ...nota,
      favorita: Boolean(nota.favorita),
      fixada: Boolean(nota.fixada),
      naLixeira: Boolean(nota.naLixeira)
    }))
  );

});

// Criar
app.post("/notas", (req, res) => {

  const resultado = db
    .prepare(`
      INSERT INTO notas (
        titulo,
        conteudo,
        categoria,
        criadoEm
      )
      VALUES (?, ?, ?, ?)
    `)
    .run(
      req.body.titulo,
      req.body.conteudo,
      req.body.categoria,
      new Date().toISOString()
    );

  const nota = db
    .prepare(
      "SELECT * FROM notas WHERE id = ?"
    )
    .get(resultado.lastInsertRowid);

  res.status(201).json({
    ...nota,
    favorita: Boolean(nota.favorita),
    fixada: Boolean(nota.fixada),
    naLixeira: Boolean(nota.naLixeira)
  });

});

// Editar
app.put("/notas/:id", (req, res) => {

  const id = Number(req.params.id);

  const resultado = db
    .prepare(`
      UPDATE notas
      SET
        titulo = ?,
        conteudo = ?,
        categoria = ?
      WHERE id = ?
    `)
    .run(
      req.body.titulo,
      req.body.conteudo,
      req.body.categoria,
      id
    );

  if (!resultado.changes) {
    return res.status(404).json({
      erro: "Nota não encontrada"
    });
  }

  const nota = db
    .prepare(
      "SELECT * FROM notas WHERE id = ?"
    )
    .get(id);

  res.json(nota);

});

// Enviar para lixeira
app.delete("/notas/:id", (req, res) => {

  const id = Number(req.params.id);

  const resultado = db
    .prepare(`
      UPDATE notas
      SET naLixeira = 1
      WHERE id = ?
    `)
    .run(id);

  if (!resultado.changes) {
    return res.status(404).json({
      erro: "Nota não encontrada"
    });
  }

  res.json({
    mensagem: "Nota enviada para lixeira"
  });

});

// Restaurar da lixeira
app.patch("/notas/:id/restaurar", (req, res) => {

  const id = Number(req.params.id);

  const resultado = db
    .prepare(`
      UPDATE notas
      SET naLixeira = 0
      WHERE id = ?
    `)
    .run(id);

  if (!resultado.changes) {
    return res.status(404).json({
      erro: "Nota não encontrada"
    });
  }

  const nota = db
    .prepare(
      "SELECT * FROM notas WHERE id = ?"
    )
    .get(id);

  res.json(nota);

});

// Excluir definitivamente
app.delete("/notas/:id/permanente", (req, res) => {

  const id = Number(req.params.id);

  const resultado = db
    .prepare(`
      DELETE FROM notas
      WHERE id = ?
    `)
    .run(id);

  if (!resultado.changes) {
    return res.status(404).json({
      erro: "Nota não encontrada"
    });
  }

  res.json({
    mensagem: "Nota excluída permanentemente"
  });

});

app.patch("/notas/:id/favorita", (req, res) => {

  const id = Number(req.params.id);

  const nota = db
    .prepare(
      "SELECT * FROM notas WHERE id = ?"
    )
    .get(id);

  if (!nota) {
    return res.status(404).json({
      erro: "Nota não encontrada"
    });
  }

  db.prepare(`
    UPDATE notas
    SET favorita = ?
    WHERE id = ?
  `)
  .run(
    nota.favorita ? 0 : 1,
    id
  );

  const atualizada = db
    .prepare(
      "SELECT * FROM notas WHERE id = ?"
    )
    .get(id);

  res.json(atualizada);

});

app.patch("/notas/:id/fixada", (req, res) => {

  const id = Number(req.params.id);

  const nota = db
    .prepare(
      "SELECT * FROM notas WHERE id = ?"
    )
    .get(id);

  if (!nota) {
    return res.status(404).json({
      erro: "Nota não encontrada"
    });
  }

  db.prepare(`
    UPDATE notas
    SET fixada = ?
    WHERE id = ?
  `)
  .run(
    nota.fixada ? 0 : 1,
    id
  );

  const atualizada = db
    .prepare(
      "SELECT * FROM notas WHERE id = ?"
    )
    .get(id);

  res.json(atualizada);

});

app.listen(3000, () => {
  console.log(
    "Servidor disponível na rede local"
  );
});