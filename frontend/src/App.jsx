import { useEffect, useState } from "react";
import {
  carregarNotasService,
  criarNotaService,
  editarNotaService,
  excluirNotaService,
  alternarFavoritaService,
  alternarFixadaService,
  restaurarNotaService,
  excluirDefinitivamenteService
} from "./services/notasService";
import ModalExcluir from "./components/ModalExcluir";
import ModalNota from "./components/ModalNota";
import NotaCard from "./components/NotaCard";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import FormularioNota from "./components/FormularioNota";

function App() {
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [categoria, setCategoria] = useState("Atendimentos");

  const [notas, setNotas] = useState([]);
  const [editandoId, setEditandoId] = useState(null);

  const [pesquisa, setPesquisa] = useState("");
  const [categoriaSelecionada, setCategoriaSelecionada] =
  useState("Todas");

  const [mostrarFavoritas, setMostrarFavoritas] =
  useState(false);

  const [mostrarFixadas, setMostrarFixadas] =
  useState(false);

  const [menuAberto, setMenuAberto] =
  useState(false);

  {/* MODAL DE VISUALIZAÇÃO */}
  const [notaSelecionada, setNotaSelecionada] =
  useState(null);
  
  const [formularioAberto, setFormularioAberto] =
  useState(false);

  const [temaEscuro, setTemaEscuro] =
  useState(() => {
    const temaSalvo =
      localStorage.getItem("temaEscuro");

    return temaSalvo
      ? JSON.parse(temaSalvo)
      : true;
  });

  const [modalExcluir, setModalExcluir] =
  useState(false);

  const [notaParaExcluir, setNotaParaExcluir] =
  useState(null);

  const [mostrarLixeira, setMostrarLixeira] =
  useState(false);

  async function carregarNotas() {
  const resposta =
  await carregarNotasService();

  setNotas(resposta.data);
  }

  async function criarNota() {
    if (!titulo || !conteudo) return;

    await criarNotaService({
      titulo,
      conteudo,
      categoria
    });

    setTitulo("");
    setConteudo("");
    setCategoria("Atendimentos");

    carregarNotas();
  }

  async function editarNota(id) {
    await editarNotaService(
    id,
    {
      titulo,
      conteudo,
      categoria
    }
  );

    setTitulo("");
    setConteudo("");
    setCategoria("Atendimentos");
    setEditandoId(null);

    carregarNotas();
    }

    function solicitarExclusao(nota) {
    setNotaParaExcluir(nota);
    setModalExcluir(true);
    }

    async function excluirNota() {
    await excluirNotaService(
      notaParaExcluir.id
    );

    setModalExcluir(false);
    setNotaParaExcluir(null);

    carregarNotas();
    }

  async function alternarFavorita(id) {
    await alternarFavoritaService(id);

    carregarNotas();
  }

  
  async function alternarFixada(id) {
  await alternarFixadaService(id);

  carregarNotas();
}

  async function restaurarNota(id) {
   await restaurarNotaService(id);

    carregarNotas();
  }
  async function excluirDefinitivamente(id) {
    await excluirDefinitivamenteService(id);

    carregarNotas();
  }
    function limparPesquisa() {
    setPesquisa("");
  }

  function iniciarEdicao(nota) {
    console.log("EDITANDO", nota);

    setTitulo(nota.titulo);
    setConteudo(nota.conteudo);
    setCategoria(nota.categoria || "Atendimentos");
    setEditandoId(nota.id);

    setFormularioAberto(true);
  }

  useEffect(() => {
    carregarNotas();
  }, []);

  useEffect(() => {
  localStorage.setItem(
    "temaEscuro",
    JSON.stringify(temaEscuro)
  );
  }, [temaEscuro]);

  function tempoDecorrido(data) {
  const agora = new Date();
  const criada = new Date(data);

  const segundos =
    Math.floor((agora - criada) / 1000);

  const minutos =
    Math.floor(segundos / 60);

  const horas =
    Math.floor(minutos / 60);

  const dias =
    Math.floor(horas / 24);

  if (segundos < 60) {
    return "🕒 Agora mesmo";
  }

  if (minutos < 60) {
    return `🕒 Há ${minutos} minuto${minutos > 1 ? "s" : ""}`;
  }

  if (horas < 24) {
    return `🕒 Há ${horas} hora${horas > 1 ? "s" : ""}`;
  }

  return `🕒 Há ${dias} dia${dias > 1 ? "s" : ""}`;
}

    const notasFiltradas = notas
    .filter((nota) => {

      const atendeLixeira =
        mostrarLixeira
          ? nota.naLixeira
          : !nota.naLixeira;

      const atendePesquisa =
        nota.titulo
          .toLowerCase()
          .includes(pesquisa.toLowerCase()) ||
        nota.conteudo
          .toLowerCase()
          .includes(pesquisa.toLowerCase());

      const atendeCategoria =
        categoriaSelecionada === "Todas" ||
        nota.categoria === categoriaSelecionada;

      const atendeFavorita =
        !mostrarFavoritas ||
        nota.favorita === true;

      const atendeFixada =
        !mostrarFixadas ||
        nota.fixada === true;

      return (
        atendeLixeira &&
        atendePesquisa &&
        atendeCategoria &&
        atendeFavorita &&
        atendeFixada
      );
    })
    .sort((a, b) => {
      if (a.fixada && !b.fixada) return -1;
      if (!a.fixada && b.fixada) return 1;
      return 0;
    });

  return (
    <div
        className={`min-h-screen p-8 ${
          temaEscuro
            ? "bg-gray-900 text-white"
            : "bg-gray-100 text-black"
        }`}
      >
      

      <div className="max-w-7xl mx-auto flex gap-6">

        <Sidebar
          limparPesquisa={limparPesquisa}
          menuAberto={menuAberto}
          temaEscuro={temaEscuro}
          categoriaSelecionada={categoriaSelecionada}
          setCategoriaSelecionada={setCategoriaSelecionada}
          setMostrarFavoritas={setMostrarFavoritas}
          setMostrarFixadas={setMostrarFixadas}
          setMostrarLixeira={setMostrarLixeira}
          notas={notas}
        />

        <div className="flex-1">

          <div className="flex items-center gap-3 mb-6">

            <button
              onClick={() =>
                setMenuAberto(!menuAberto)
              }
              className="
                bg-blue-600
                hover:bg-blue-700
                px-4
                py-2
                rounded-lg
                text-xl
                cursor-pointer
                transition-all
              "
            >
              {menuAberto ? "✖" : "☰"}
            </button>

            <div className="flex items-center gap-3">

            {/* TÍTULO PRINCIPAL */}
            <h1 className="text-4xl font-bold">

              {mostrarLixeira
                ? `🗑️ Lixeira (${
                    notas.filter(
                      (n) => n.naLixeira
                    ).length
                  })`

                : mostrarFavoritas
                ? `❤️ Favoritas (${
                    notas.filter(
                      (n) =>
                        n.favorita &&
                        !n.naLixeira
                    ).length
                  })`

                : mostrarFixadas
                ? `📌 Fixadas (${
                    notas.filter(
                      (n) =>
                        n.fixada &&
                        !n.naLixeira
                    ).length
                  })`

                : categoriaSelecionada !== "Todas"
                ? `${
                    categoriaSelecionada === "Atendimentos"
                      ? "🏠 "
                      : categoriaSelecionada === "Trabalho"
                      ? "💼 "
                      : categoriaSelecionada === "Projetos"
                      ? "🚀 "
                      : categoriaSelecionada === "Documentação"
                      ? "📚 "
                      : ""
                  }${categoriaSelecionada} (${
                    notas.filter(
                      (n) =>
                        n.categoria ===
                          categoriaSelecionada &&
                        !n.naLixeira
                    ).length
                  })`

                : `📝 Minhas Notas (${
                    notas.filter(
                      (n) => !n.naLixeira
                    ).length
                  })`
              }

            </h1>

            <button
              onClick={() =>
                setTemaEscuro(!temaEscuro)
              }
              className="
                bg-indigo-600
                hover:bg-indigo-700
                px-4
                py-2
                rounded-lg
                cursor-pointer
                transition-all
              "
            >
              {temaEscuro ? "☀ Claro" : "🌙 Escuro"}
            </button>

          </div>

          </div>

          <input
            type="text"
            placeholder="🔍 Pesquisar notas..."
            value={pesquisa}
            onChange={(e) => {

              const valor = e.target.value;

              setPesquisa(valor);

              if (valor.trim() !== "") {

                setCategoriaSelecionada("Todas");

                setMostrarFavoritas(false);
                setMostrarFixadas(false);
                setMostrarLixeira(false);

              }

            }}
            className={`w-full p-3 mb-6 rounded-lg ${
            temaEscuro
              ? "bg-gray-800"
              : "bg-white border"
          }`}
          />
          <Dashboard
            limparPesquisa={limparPesquisa}
            notas={notas}
            temaEscuro={temaEscuro}
            mostrarFavoritas={mostrarFavoritas}
            mostrarFixadas={mostrarFixadas}
            mostrarLixeira={mostrarLixeira}
            setMostrarFavoritas={setMostrarFavoritas}
            setMostrarFixadas={setMostrarFixadas}
            setMostrarLixeira={setMostrarLixeira}
            setCategoriaSelecionada={setCategoriaSelecionada}
          />

          {!mostrarLixeira && (
          <button
            onClick={() =>
              setFormularioAberto(
                !formularioAberto
              )
            }
            className="
              bg-green-600
              hover:bg-green-700
              px-4
              py-2
              rounded-lg
              mb-6
              cursor-pointer
            "
          >
            {formularioAberto
              ? "➖ Fechar"
              : "➕ Nova Nota"}
          </button>
        )}
          <FormularioNota
            formularioAberto={formularioAberto}
            temaEscuro={temaEscuro}
            titulo={titulo}
            setTitulo={setTitulo}
            categoria={categoria}
            setCategoria={setCategoria}
            conteudo={conteudo}
            setConteudo={setConteudo}
            editandoId={editandoId}
            editarNota={editarNota}
            criarNota={criarNota}
          />

          <div className="grid md:grid-cols-2 gap-3">

            {/* LISTA DE NOTAS */}
            {notasFiltradas.map((nota) => (
              <NotaCard
                key={nota.id}
                nota={nota}
                temaEscuro={temaEscuro}
                tempoDecorrido={tempoDecorrido}
                alternarFavorita={alternarFavorita}
                setNotaSelecionada={setNotaSelecionada}
              />
            ))}

</div>

        </div>

      </div>

    <ModalNota
      notaSelecionada={notaSelecionada}
      setNotaSelecionada={setNotaSelecionada}
      temaEscuro={temaEscuro}
      tempoDecorrido={tempoDecorrido}
      alternarFavorita={alternarFavorita}
      alternarFixada={alternarFixada}
      iniciarEdicao={iniciarEdicao}
      solicitarExclusao={solicitarExclusao}
      restaurarNota={restaurarNota}
      excluirDefinitivamente={excluirDefinitivamente}
    />

{/* MODAL DE EXCLUSÃO */}
<ModalExcluir
  modalExcluir={modalExcluir}
  notaParaExcluir={notaParaExcluir}
  temaEscuro={temaEscuro}
  setModalExcluir={setModalExcluir}
  excluirNota={excluirNota}
/>

    </div>
  );
}

export default App;