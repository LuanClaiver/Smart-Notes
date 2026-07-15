function NotaCard({
  nota,
  temaEscuro,
  tempoDecorrido,
  alternarFavorita,
  setNotaSelecionada
}) {
  return (
    <div
      onClick={() =>
        setNotaSelecionada(nota)
      }
      className={`
        p-5
        rounded-2xl
        border
        shadow-lg
        cursor-pointer
        hover:shadow-xl
        hover:scale-[1.02]
        transition-all
        duration-200
        ${
          temaEscuro
            ? "bg-gray-800 border-gray-700 hover:bg-gray-700"
            : "bg-white border-gray-300 hover:bg-gray-50"
        }
      `}
    >

      {/* CABEÇALHO DA NOTA */}
      <div className="flex justify-between items-center mb-2">

        <h2 className="text-xl font-bold">
          📄 {nota.titulo}
        </h2>

        <button
          onClick={(e) => {
            e.stopPropagation();
            alternarFavorita(nota.id);
          }}
          className="
            text-2xl
            cursor-pointer
            hover:scale-125
            active:scale-90
            transition-all
          "
        >
          {nota.favorita ? "❤️" : "🤍"}
        </button>

      </div>

      {/* CATEGORIA */}
      <p className="text-blue-400 text-sm mb-2">
        📂 {nota.categoria}
      </p>

      {/* DATA */}
      <p
        className={`text-xs italic mb-3 ${
          temaEscuro
            ? "text-gray-500"
            : "text-gray-600"
        }`}
      >
        {tempoDecorrido(nota.criadoEm)}
      </p>

      {/* RESUMO DA NOTA */}
      <p
        className={`mb-4 break-words ${
          temaEscuro
            ? "text-gray-300"
            : "text-gray-700"
        }`}
      >
        {nota.conteudo.length > 120
          ? `${nota.conteudo.slice(0, 120)}...`
          : nota.conteudo}
      </p>

    </div>
  );
}

export default NotaCard;