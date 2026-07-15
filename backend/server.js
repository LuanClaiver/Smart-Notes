const express = require("express");
const cors = require("cors");
const fs = require("fs");

const app = express();

app.use(cors());
app.use(express.json());

const ARQUIVO = "./notas.json";

// Ler notas
function lerNotas() {
  try {
    const dados = fs.readFileSync(ARQUIVO, "utf8");
    return JSON.parse(dados);
  } catch {
    return [];
  }
}

// Salvar notas
function salvarNotas(notas) {
  fs.writeFileSync(
    ARQUIVO,
    JSON.stringify(notas, null, 2)
  );
}

// Listar
app.get("/notas", (req, res) => {
  const notas = lerNotas();
  res.json(notas);
});

// Criar
app.post("/notas", (req, res) => {
  const notas = lerNotas();

    const novaNota = {
    id: Date.now(),
    titulo: req.body.titulo,
    conteudo: req.body.conteudo,
    categoria: req.body.categoria,
    favorita: false,
    fixada: false,
    naLixeira: false,
    criadoEm: new Date()
    };

  notas.push(novaNota);

  salvarNotas(notas);

  res.status(201).json(novaNota);
});

// Editar
app.put("/notas/:id", (req, res) => {
  const id = Number(req.params.id);

  const notas = lerNotas();

  const indice = notas.findIndex(
    nota => nota.id === id
  );

  if (indice === -1) {
    return res.status(404).json({
      erro: "Nota não encontrada"
    });
  }

  notas[indice].titulo = req.body.titulo;
  notas[indice].conteudo = req.body.conteudo;
  notas[indice].categoria = req.body.categoria;

  salvarNotas(notas);

  res.json(notas[indice]);
});

// Enviar para lixeira
app.delete("/notas/:id", (req, res) => {
  const id = Number(req.params.id);

  const notas = lerNotas();

  const nota = notas.find(
    (n) => n.id === id
  );

  if (!nota) {
    return res.status(404).json({
      erro: "Nota não encontrada"
    });
  }

  nota.naLixeira = true;

  salvarNotas(notas);

  res.json({
    mensagem: "Nota enviada para lixeira"
  });
});

// Restaurar da lixeira
app.patch("/notas/:id/restaurar", (req, res) => {
  const id = Number(req.params.id);

  const notas = lerNotas();

  const nota = notas.find(
    (n) => n.id === id
  );

  if (!nota) {
    return res.status(404).json({
      erro: "Nota não encontrada"
    });
  }

  nota.naLixeira = false;

  salvarNotas(notas);

  res.json(nota);
});

// Excluir definitivamente
app.delete("/notas/:id/permanente", (req, res) => {
  const id = Number(req.params.id);

  const notas = lerNotas();

  const novasNotas = notas.filter(
    (nota) => nota.id !== id
  );

  salvarNotas(novasNotas);

  res.json({
    mensagem: "Nota excluída permanentemente"
  });
});

app.patch("/notas/:id/favorita", (req, res) => {
  const id = Number(req.params.id);

  const notas = lerNotas();

  const nota = notas.find(
    (n) => n.id === id
  );

  if (!nota) {
    return res.status(404).json({
      erro: "Nota não encontrada"
    });
  }

  nota.favorita = !nota.favorita;

  salvarNotas(notas);

  res.json(nota);
});

app.patch("/notas/:id/fixada", (req, res) => {
  const id = Number(req.params.id);

  const notas = lerNotas();

  const nota = notas.find(
    (n) => n.id === id
  );

  if (!nota) {
    return res.status(404).json({
      erro: "Nota não encontrada"
    });
  }

  nota.fixada = !nota.fixada;

  salvarNotas(notas);

  res.json(nota);
});

app.listen(3000, () => {
  console.log(
    "Servidor disponível na rede local"
  );
});