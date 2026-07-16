function Dashboard({
  notas,
  temaEscuro,
  mostrarFavoritas,
  mostrarFixadas,
  mostrarLixeira,
  setMostrarFavoritas,
  setMostrarFixadas,
  setMostrarLixeira,
  setCategoriaSelecionada,
  limparPesquisa
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">

      {/* DASHBOARD - CARD TOTAL */}
      <div
        onClick={() => {
          setMostrarFavoritas(false);
          setMostrarFixadas(false);
          setMostrarLixeira(false);
          limparPesquisa();
          setCategoriaSelecionada("Todas");
        }}
        className={`p-4 rounded-2xl shadow-lg cursor-pointer hover:scale-105 transition-all ${
          !mostrarFavoritas &&
          !mostrarFixadas &&
          !mostrarLixeira
            ? "bg-blue-600 text-white"
            : temaEscuro
            ? "bg-gray-800"
            : "bg-white"
        }`}
      >
        <p className="text-xl">📝</p>

        <h3 className="text-lg font-bold">
          {notas.filter((n) => !n.naLixeira).length}
        </h3>

        <p className="text-sm">Total</p>
      </div>

      {/* DASHBOARD - CARD FAVORITAS */}
      <div
        onClick={() => {
            limparPesquisa();
          setCategoriaSelecionada("Todas");
          setMostrarFavoritas(true);
          setMostrarFixadas(false);
          setMostrarLixeira(false);
        }}
        className={`p-4 rounded-2xl shadow-lg cursor-pointer hover:scale-105 transition-all ${
          mostrarFavoritas
            ? "bg-blue-600 text-white"
            : temaEscuro
            ? "bg-gray-800"
            : "bg-white"
        }`}
      >
        <p className="text-xl">❤️</p>

        <h3 className="text-lg font-bold">
          {
            notas.filter(
              (n) => n.favorita && !n.naLixeira
            ).length
          }
        </h3>

        <p>Favoritas</p>
      </div>

      {/* DASHBOARD - CARD FIXADAS */}
      <div
        onClick={() => {
            limparPesquisa();
          setCategoriaSelecionada("Todas");
          setMostrarFixadas(true);
          setMostrarFavoritas(false);
          setMostrarLixeira(false);
        }}
        className={`p-4 rounded-2xl shadow-lg cursor-pointer hover:scale-105 transition-all ${
          mostrarFixadas
            ? "bg-blue-600 text-white"
            : temaEscuro
            ? "bg-gray-800"
            : "bg-white"
        }`}
      >
        <p className="text-xl">📌</p>

        <h3 className="text-lg font-bold">
          {
            notas.filter(
              (n) => n.fixada && !n.naLixeira
            ).length
          }
        </h3>

        <p>Fixadas</p>
      </div>

      {/* DASHBOARD - CARD LIXEIRA */}
      <div
        onClick={() => {
            limparPesquisa();
          setCategoriaSelecionada("Todas");
          setMostrarLixeira(true);
          setMostrarFavoritas(false);
          setMostrarFixadas(false);
        }}
        className={`p-4 rounded-2xl shadow-lg cursor-pointer hover:scale-105 transition-all ${
          mostrarLixeira
            ? "bg-blue-600 text-white"
            : temaEscuro
            ? "bg-gray-800"
            : "bg-white"
        }`}
      >
        <p className="text-xl">🗑️</p>

        <h3 className="text-lg font-bold">
          {
            notas.filter((n) => n.naLixeira)
              .length
          }
        </h3>

        <p>Lixeira</p>
      </div>

    </div>
  );
}

export default Dashboard;