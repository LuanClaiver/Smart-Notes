function Sidebar({
  menuAberto,
  temaEscuro,
  categoriaSelecionada,
  setCategoriaSelecionada,
  setMostrarFavoritas,
  setMostrarFixadas,
  setMostrarLixeira,
  notas,
  limparPesquisa
}) {

  if (!menuAberto) return null;

  return (
    <div
      className={`w-64 p-3 rounded-2xl h-fit ${
        temaEscuro
          ? "bg-gray-800"
          : "bg-white shadow-lg"
      }`}
    >

      {/* SIDEBAR - TÍTULO */}
      <h2 className="text-xl font-bold mb-4">
        📂 Categorias
      </h2>

      {[
        "Todas",
        "Atendimentos",
        "Trabalho",
        "Projetos",
        "Documentação"
      ].map((cat) => (
        <button
          key={cat}
          onClick={() => {
            limparPesquisa();

            setCategoriaSelecionada(cat);

            setMostrarFavoritas(false);
            setMostrarFixadas(false);
            setMostrarLixeira(false);

            }}
          className={`
            w-full
            text-left
            p-3
            rounded-xl
            mb-2
            cursor-pointer
            transition-all
            duration-200
            hover:scale-[1.02]
            hover:shadow-blue-500/30
            hover:shadow-lg
            ${
              categoriaSelecionada === cat
                ? "bg-blue-600 text-white"
                : temaEscuro
                  ? "bg-gray-700 hover:bg-gray-600 text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-black"
            }
          `}
        >

          {cat === "Todas" && "📋 "}
          {cat === "Atendimentos" && "🏠 "}
          {cat === "Trabalho" && "💼 "}
          {cat === "Projetos" && "🚀 "}
          {cat === "Documentação" && "📚 "}

          {cat}

          {" ("}

          {cat === "Todas"
            ? notas.filter(
                nota => !nota.naLixeira
              ).length
            : notas.filter(
                nota =>
                  nota.categoria === cat &&
                  !nota.naLixeira
              ).length}

          {")"}

        </button>
      ))}

      <hr className="my-4" />

      {/* SIDEBAR - FAVORITAS */}
      <button
        onClick={() => {
            limparPesquisa();
          setCategoriaSelecionada("Todas");

          setMostrarFavoritas(true);
          setMostrarFixadas(false);
          setMostrarLixeira(false);

        }}
        className="
          w-full
          bg-yellow-500
          hover:bg-yellow-600
          text-black
          p-2
          rounded-lg
          cursor-pointer
          transition-all
        "
      >
        📌 Favoritas (
        {
          notas.filter(
            nota => nota.favorita
          ).length
        }
        )
      </button>

      {/* SIDEBAR - LIXEIRA */}
      <button
        onClick={() => {
            limparPesquisa();
          setCategoriaSelecionada("Todas");

          setMostrarFavoritas(false);
          setMostrarFixadas(false);
          setMostrarLixeira(true);

        }}
        className="
          w-full
          bg-red-600
          hover:bg-red-700
          text-white
          p-2
          mt-2
          rounded-lg
          cursor-pointer
          transition-all
        "
      >
        🗑️ Lixeira (
        {
          notas.filter(
            nota => nota.naLixeira
          ).length
        }
        )
      </button>

    </div>
  );
}

export default Sidebar;