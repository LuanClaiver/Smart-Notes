function NotaCard({
  nota,
  temaEscuro,
  tempoDecorrido,
  alternarFavorita,
  setNotaSelecionada
}) {
  const imagens = Array.isArray(nota.imagens) ? nota.imagens : nota.imagem ? [nota.imagem] : [];

  return (
    <article
      onClick={() => setNotaSelecionada(nota)}
      className={`w-full rounded-3xl border shadow-xl cursor-pointer transition-all duration-200 hover:-translate-y-1 animate-fade-in overflow-hidden ${
        temaEscuro ? "bg-slate-900 border-slate-800 hover:border-emerald-500/50" : "bg-white border-slate-200 hover:border-emerald-500/50"
      }`}
    >
      <div className="p-5">
        <div className="flex justify-between items-start gap-3 mb-3">
          <div className="min-w-0">
            <h2 className="text-lg md:text-xl font-black break-words">{nota.titulo}</h2>

            <div className="flex gap-2 flex-wrap mt-2">
              <span className="text-xs rounded-full px-3 py-1 bg-emerald-600/15 text-emerald-400 font-bold">📂 {nota.categoria}</span>
              {nota.subcategoria && <span className="text-xs rounded-full px-3 py-1 bg-cyan-600/15 text-cyan-300 font-bold">🧩 {nota.subcategoria}</span>}
              {nota.compartilhada && <span className="text-xs rounded-full px-3 py-1 bg-blue-600/15 text-blue-400 font-bold">🌐 Pública</span>}
              {nota.compartilhamentoPrivado && <span className="text-xs rounded-full px-3 py-1 bg-purple-600/15 text-purple-300 font-bold">🔒 Protegida</span>}
              {imagens.length > 0 && <span className="text-xs rounded-full px-3 py-1 bg-violet-600/15 text-violet-300 font-bold">🖼️ {imagens.length}</span>}
              {!nota.minhaNota && <span className="text-xs rounded-full px-3 py-1 bg-amber-500/15 text-amber-400 font-bold">👤 {nota.autorNome}</span>}
            </div>
          </div>

          <button
            onClick={(event) => {
              event.stopPropagation();
              if (nota.podeFavoritar) {
                alternarFavorita(nota.id);
              }
            }}
            disabled={!nota.podeFavoritar}
            title={nota.podeFavoritar ? "Favoritar" : "Desbloqueie para favoritar"}
            className={`text-2xl transition-all ${nota.podeFavoritar ? "cursor-pointer hover:scale-125 active:scale-90" : "opacity-40 cursor-not-allowed"}`}
          >
            {nota.favorita ? "❤️" : "🤍"}
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-3">
          {tempoDecorrido(nota.criadoEm)}{nota.atualizadoEm && " • atualizado"}
        </p>

        {nota.bloqueada ? (
          <div className={`rounded-2xl border p-4 ${temaEscuro ? "bg-slate-950 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"}`}>
            🔒 Nota protegida por senha. Clique para desbloquear.
          </div>
        ) : (
          <>
            <p className={`break-words leading-relaxed whitespace-pre-wrap ${temaEscuro ? "text-slate-300" : "text-slate-700"}`}>
              {nota.conteudo.length > 150 ? `${nota.conteudo.slice(0, 150)}...` : nota.conteudo}
            </p>

            {imagens.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-4">
                {imagens.slice(0, 3).map((imagem, indice) => (
                  <div key={`${imagem.slice(0, 25)}-${indice}`} className="relative">
                    <img src={imagem} alt={`Imagem ${indice + 1}`} className="w-full h-20 object-cover rounded-2xl border border-emerald-500/30" />
                    {indice === 2 && imagens.length > 3 && <div className="absolute inset-0 rounded-2xl bg-black/65 flex items-center justify-center text-white font-black">+{imagens.length - 3}</div>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </article>
  );
}

export default NotaCard;
