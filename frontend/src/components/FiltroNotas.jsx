import { useEffect, useMemo } from "react";

function FiltroNotas({
  aberto,
  onFechar,
  temaEscuro,
  categorias,
  subcategorias,
  categoriaSelecionada,
  subcategoriaSelecionada,
  setCategoriaSelecionada,
  setSubcategoriaSelecionada,
  totalTodas,
  totalDaPasta,
  totalDaSubcategoria
}) {
  useEffect(() => {
    if (!aberto) return;

    function fecharComEsc(event) {
      if (event.key === "Escape") onFechar();
    }

    document.addEventListener("keydown", fecharComEsc);
    return () => document.removeEventListener("keydown", fecharComEsc);
  }, [aberto, onFechar]);

  const subcategoriasDaPasta = useMemo(() => {
    if (!categoriaSelecionada || categoriaSelecionada === "Todas") return [];
    return subcategorias.filter((item) => item.categoria === categoriaSelecionada);
  }, [subcategorias, categoriaSelecionada]);

  if (!aberto) return null;

  function selecionarCategoria(nome) {
    setCategoriaSelecionada(nome);
    setSubcategoriaSelecionada("");
  }

  return (
    <div onClick={onFechar} className="fixed inset-0 z-[65] bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
      <section
        onClick={(event) => event.stopPropagation()}
        className={`w-full md:max-w-4xl max-h-[88dvh] overflow-y-auto rounded-t-[2rem] md:rounded-[2rem] border shadow-2xl animate-modal-in ${
          temaEscuro ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-950"
        }`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 p-5 border-b border-slate-700/40 bg-inherit">
          <div>
            <span className="text-xs uppercase tracking-[0.22em] text-emerald-500 font-black">Filtrar notas</span>
            <h2 className="text-2xl font-black mt-1">Pastas e subcategorias</h2>
          </div>
          <button type="button" onClick={onFechar} className="w-11 h-11 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xl font-black">✕</button>
        </div>

        <div className="p-5 md:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => selecionarCategoria("Todas")}
              className={`text-left rounded-2xl p-4 transition-all ${
                categoriaSelecionada === "Todas"
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                  : temaEscuro
                  ? "bg-slate-900 hover:bg-slate-800 text-slate-200"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-800"
              }`}
            >
              <span className="text-2xl">📋</span>
              <strong className="block mt-2">Todas</strong>
              <small className="opacity-70">{totalTodas} nota{totalTodas === 1 ? "" : "s"}</small>
            </button>

            {categorias.map((pasta) => (
              <button
                key={pasta.id || pasta.nome}
                type="button"
                onClick={() => selecionarCategoria(pasta.nome)}
                className={`text-left rounded-2xl p-4 transition-all ${
                  categoriaSelecionada === pasta.nome
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                    : temaEscuro
                    ? "bg-slate-900 hover:bg-slate-800 text-slate-200"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                }`}
              >
                <span className="text-2xl">{pasta.icone || "📁"}</span>
                <strong className="block mt-2 break-words">{pasta.nome}</strong>
                <small className="opacity-70">{totalDaPasta(pasta.nome)} nota{totalDaPasta(pasta.nome) === 1 ? "" : "s"}</small>
              </button>
            ))}
          </div>

          {categoriaSelecionada !== "Todas" && (
            <div className={`mt-5 rounded-3xl border p-4 ${temaEscuro ? "bg-slate-900/70 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <span className="text-xs uppercase tracking-[0.18em] text-cyan-400 font-black">Dentro de {categoriaSelecionada}</span>
                  <h3 className="text-lg font-black mt-1">Subcategorias</h3>
                </div>
                {subcategoriaSelecionada && (
                  <button type="button" onClick={() => setSubcategoriaSelecionada("")} className="px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-black">Limpar</button>
                )}
              </div>

              {subcategoriasDaPasta.length === 0 ? (
                <p className="text-sm text-slate-400">Esta pasta não possui subcategorias.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {subcategoriasDaPasta.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSubcategoriaSelecionada(item.nome)}
                      className={`px-4 py-3 rounded-2xl text-sm font-black transition-all ${
                        subcategoriaSelecionada === item.nome
                          ? "bg-cyan-600 text-white"
                          : temaEscuro
                          ? "bg-slate-950 hover:bg-slate-800 text-slate-300"
                          : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      🧩 {item.nome} <span className="opacity-70">({totalDaSubcategoria(categoriaSelecionada, item.nome)})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button
              type="button"
              onClick={() => {
                setCategoriaSelecionada("Todas");
                setSubcategoriaSelecionada("");
              }}
              className={`sm:w-auto px-5 py-3 rounded-2xl font-black ${temaEscuro ? "bg-slate-800 hover:bg-slate-700 text-white" : "bg-slate-200 hover:bg-slate-300 text-slate-900"}`}
            >
              Remover filtros
            </button>
            <button type="button" onClick={onFechar} className="flex-1 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg shadow-emerald-600/20">
              Mostrar notas
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default FiltroNotas;
