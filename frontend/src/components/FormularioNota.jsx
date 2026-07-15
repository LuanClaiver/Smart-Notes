function FormularioNota({
  formularioAberto,
  temaEscuro,
  titulo,
  setTitulo,
  categoria,
  setCategoria,
  conteudo,
  setConteudo,
  editandoId,
  editarNota,
  criarNota
}) {

  if (!formularioAberto) return null;

  return (
    <div
      className={`rounded-2xl p-6 shadow-lg mb-8 ${
        temaEscuro
          ? "bg-gray-800"
          : "bg-white"
      }`}
    >

      {/* FORMULÁRIO - TÍTULO */}
      <input
        type="text"
        placeholder="Título"
        value={titulo}
        onChange={(e) =>
          setTitulo(e.target.value)
        }
        className={`w-full p-3 rounded-lg mb-4 ${
          temaEscuro
            ? "bg-gray-700"
            : "bg-white border border-gray-300 text-black"
        }`}
      />

      {/* FORMULÁRIO - CATEGORIA */}
      <select
        value={categoria}
        onChange={(e) =>
          setCategoria(e.target.value)
        }
        className={`w-full p-3 rounded-lg mb-4 ${
          temaEscuro
            ? "bg-gray-700"
            : "bg-white border border-gray-300 text-black"
        }`}
      >
        <option>Atendimentos</option>
        <option>Trabalho</option>
        <option>Projetos</option>
        <option>Documentação</option>
      </select>

      {/* FORMULÁRIO - CONTEÚDO */}
      <textarea
        placeholder="Escreva sua nota..."
        value={conteudo}
        onChange={(e) =>
          setConteudo(e.target.value)
        }
        className={`w-full p-3 rounded-lg mb-4 ${
          temaEscuro
            ? "bg-gray-700"
            : "bg-white border border-gray-300 text-black"
        }`}
      />

      {/* FORMULÁRIO - BOTÃO */}
      {editandoId ? (
        <button
          onClick={() =>
            editarNota(editandoId)
          }
          className="
            bg-yellow-500
            hover:bg-yellow-600
            px-4
            py-2
            rounded-lg
            cursor-pointer
          "
        >
          Salvar Alterações
        </button>
      ) : (
        <button
          onClick={criarNota}
          className="
            bg-blue-600
            hover:bg-blue-700
            px-4
            py-2
            rounded-lg
            cursor-pointer
          "
        >
          Criar Nota
        </button>
      )}

    </div>
  );
}

export default FormularioNota;