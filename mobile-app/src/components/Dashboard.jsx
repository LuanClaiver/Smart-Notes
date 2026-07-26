function Dashboard({
  notas,
  notasDaAba,
  temaEscuro,
  abaAtiva,
  selecionarAba,
  categorias,
  categoriaSelecionada,
  setCategoriaSelecionada,
  setSubcategoriaSelecionada,
  limparPesquisa
}) {
  const abas = [
    {
      id: "minhas",
      titulo: "Minhas notas",
      subtitulo: "Privadas, pessoais e as que você compartilhou",
      icone: "🗂️",
      valor: notas.filter((nota) => nota.minhaNota && !nota.naLixeira).length
    },
    {
      id: "compartilhadas",
      titulo: "Comunidade",
      subtitulo: "Notas compartilhadas entre os usuários",
      icone: "🤝",
      valor: notas.filter((nota) => nota.compartilhada && !nota.naLixeira).length
    },
    {
      id: "favoritas",
      titulo: "Favoritas",
      subtitulo: "Favoritas somente do seu usuário",
      icone: "❤️",
      valor: notas.filter((nota) => nota.favorita && !nota.naLixeira).length
    },
    {
      id: "lixeira",
      titulo: "Lixeira",
      subtitulo: "Notas removidas",
      icone: "🗑️",
      valor: notas.filter((nota) => nota.naLixeira).length,
      menor: true
    }
  ];

  function selecionarPasta(nome) {
    limparPesquisa();
    setCategoriaSelecionada(nome);
    setSubcategoriaSelecionada("");
  }

  function totalDaPasta(nome) {
    return notasDaAba.filter((nota) => nota.categoria === nome).length;
  }

  const totalTodas = notasDaAba.length;
  const pastasOrdenadas = categorias.length > 0
    ? categorias
    : [
        { id: "Atendimentos", nome: "Atendimentos", icone: "🧾" },
        { id: "Trabalho", nome: "Trabalho", icone: "💼" },
        { id: "Projetos", nome: "Projetos", icone: "🚀" },
        { id: "Documentação", nome: "Documentação", icone: "📚" },
        { id: "Ideias", nome: "Ideias", icone: "💡" }
      ];

  const textoAba = {
    minhas: "Organize suas notas pessoais em pastas para não virar aquele monte de cards na tela.",
    compartilhadas: "Área geral do app. Aqui ficam as notas que a galera decidiu compartilhar.",
    favoritas: "Cada usuário tem seus próprios favoritos. O que você favoritar não muda para ninguém.",
    lixeira: "Área menor para recuperar ou excluir definitivamente o que foi removido."
  }[abaAtiva];

  return (
    <section className="mb-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[1.2fr_1.2fr_1.2fr_0.8fr] gap-4 mb-5">
        {abas.map((aba) => (
          <button
            key={aba.id}
            onClick={() => selecionarAba(aba.id)}
            className={`text-left rounded-[1.75rem] border p-4 md:p-5 shadow-xl transition-all hover:-translate-y-1 ${
              abaAtiva === aba.id
                ? aba.id === "lixeira"
                  ? "bg-red-600 border-red-500 text-white shadow-red-600/20"
                  : "bg-emerald-600 border-emerald-500 text-white shadow-emerald-600/25"
                : temaEscuro
                ? "bg-slate-900/80 border-slate-800 hover:border-emerald-500/50"
                : "bg-white border-slate-200 hover:border-emerald-500/50"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className={aba.menor ? "text-2xl" : "text-3xl"}>{aba.icone}</span>
              <strong className={aba.menor ? "text-2xl" : "text-3xl"}>{aba.valor}</strong>
            </div>
            <h3 className="mt-4 text-lg font-black">{aba.titulo}</h3>
            <p className="text-xs md:text-sm opacity-75 mt-1 leading-relaxed">{aba.subtitulo}</p>
          </button>
        ))}
      </div>

      <div className={`rounded-[2rem] border p-5 mb-5 ${temaEscuro ? "bg-slate-900/70 border-slate-800" : "bg-white border-slate-200"}`}>
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-5">
          <div>
            <span className="text-xs uppercase tracking-[0.22em] text-emerald-500 font-black">Pastas</span>
            <h2 className="text-2xl md:text-3xl font-black mt-1">{abaAtiva === "lixeira" ? "Itens na lixeira" : "Organização da tela inicial"}</h2>
            <p className="text-sm text-slate-400 mt-2 max-w-3xl">{textoAba}</p>
          </div>
          <button
            onClick={() => selecionarPasta("Todas")}
            className={`px-5 py-3 rounded-2xl font-black transition-all ${
              categoriaSelecionada === "Todas"
                ? "bg-emerald-600 text-white"
                : temaEscuro
                ? "bg-slate-800 hover:bg-slate-700 text-white"
                : "bg-slate-100 hover:bg-slate-200 text-slate-950"
            }`}
          >
            Todas ({totalTodas})
          </button>
        </div>

        {abaAtiva === "lixeira" ? (
          <div className={`rounded-3xl p-5 border ${temaEscuro ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
            <p className="text-sm text-slate-400">A lixeira fica separada para não misturar com suas notas principais. As notas daqui aparecem logo abaixo.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
            {pastasOrdenadas.map((pasta) => {
              const total = totalDaPasta(pasta.nome);

              return (
                <button
                  key={pasta.id || pasta.nome}
                  onClick={() => selecionarPasta(pasta.nome)}
                  className={`group text-left rounded-3xl p-4 border transition-all hover:-translate-y-1 ${
                    categoriaSelecionada === pasta.nome
                      ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/20"
                      : temaEscuro
                      ? "bg-slate-950/80 border-slate-800 hover:border-emerald-500/50"
                      : "bg-slate-50 border-slate-200 hover:border-emerald-500/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-3xl">{pasta.icone || "📁"}</span>
                    <span className={`rounded-full px-3 py-1 text-sm font-black ${categoriaSelecionada === pasta.nome ? "bg-white/20 text-white" : "bg-emerald-600/15 text-emerald-400"}`}>{total}</span>
                  </div>
                  <h3 className="font-black text-lg">{pasta.nome}</h3>
                  <p className="text-xs opacity-70 mt-1">Abrir pasta</p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default Dashboard;
