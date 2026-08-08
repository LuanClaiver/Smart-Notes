import { useMemo, useState } from "react";

function AdminSubcategorias({
  temaEscuro,
  categorias = [],
  subcategorias = [],
  criarSubcategoria,
  editarSubcategoria,
  excluirSubcategoria
}) {
  const [categoriaNova, setCategoriaNova] = useState(categorias[0]?.nome || "");
  const [nomeNovo, setNomeNovo] = useState("");
  const [editandoId, setEditandoId] = useState(null);
  const [nomeEditando, setNomeEditando] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [abertas, setAbertas] = useState({});

  const categoriasDisponiveis = useMemo(
    () => categorias.filter((item) => item?.nome && item.nome !== "Todas"),
    [categorias]
  );

  const categoriaSelecionada = categoriasDisponiveis.some((item) => item.nome === categoriaNova)
    ? categoriaNova
    : categoriasDisponiveis[0]?.nome || "";

  async function criar() {
    const nome = nomeNovo.trim();
    if (!categoriaSelecionada || !nome || salvando) return;
    setSalvando(true);
    try {
      const criada = await criarSubcategoria?.(categoriaSelecionada, nome);
      if (criada) {
        setNomeNovo("");
        setAbertas((atual) => ({ ...atual, [categoriaSelecionada]: true }));
      }
    } finally {
      setSalvando(false);
    }
  }

  function iniciarEdicao(item) {
    setEditandoId(item.id);
    setNomeEditando(item.nome);
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setNomeEditando("");
  }

  async function salvarEdicao(item) {
    const nome = nomeEditando.trim();
    if (!nome || salvando) return;
    setSalvando(true);
    try {
      const atualizada = await editarSubcategoria?.(item, nome);
      if (atualizada) cancelarEdicao();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className={`rounded-[2rem] border p-5 md:p-7 shadow-2xl animate-fade-in ${temaEscuro ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200"}`}>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.25em] text-cyan-400 font-black">Administrador</p>
        <h2 className="text-2xl md:text-3xl font-black mt-1">Gerenciar subcategorias</h2>
        <p className="text-sm text-slate-400 mt-2">Crie, renomeie ou exclua subcategorias. Ao excluir, as notas continuam preservadas na categoria principal.</p>
      </div>

      <div className={`rounded-3xl border p-4 mb-5 ${temaEscuro ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
        <h3 className="font-black mb-3">Nova subcategoria</h3>
        <div className="grid grid-cols-1 md:grid-cols-[minmax(180px,.65fr)_1fr_auto] gap-3">
          <select
            value={categoriaSelecionada}
            onChange={(event) => setCategoriaNova(event.target.value)}
            className={`p-3 rounded-2xl border outline-none ${temaEscuro ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}
          >
            {categoriasDisponiveis.map((item) => (
              <option key={item.id || item.nome} value={item.nome}>{item.icone || "📁"} {item.nome}</option>
            ))}
          </select>
          <input
            value={nomeNovo}
            onChange={(event) => setNomeNovo(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                criar();
              }
              if (event.key === "Escape") setNomeNovo("");
            }}
            placeholder="Nome da nova subcategoria"
            className={`p-3 rounded-2xl border outline-none focus:border-emerald-500 ${temaEscuro ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}
          />
          <button
            type="button"
            onClick={criar}
            disabled={salvando || !categoriaSelecionada || !nomeNovo.trim()}
            className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black"
          >
            Criar
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {categoriasDisponiveis.map((categoria) => {
          const itens = subcategorias.filter((item) => item.categoria === categoria.nome);
          if (itens.length === 0) return null;
          const aberta = abertas[categoria.nome] !== false;

          return (
            <article key={categoria.id || categoria.nome} className={`rounded-3xl border overflow-hidden ${temaEscuro ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
              <button
                type="button"
                onClick={() => setAbertas((atual) => ({ ...atual, [categoria.nome]: !aberta }))}
                className={`w-full flex items-center justify-between gap-3 p-4 text-left ${temaEscuro ? "hover:bg-slate-900" : "hover:bg-white"}`}
              >
                <strong>{categoria.icone || "📁"} {categoria.nome}</strong>
                <span className="text-sm text-slate-400">{itens.length} {aberta ? "⌃" : "⌄"}</span>
              </button>

              {aberta && (
                <div className="px-4 pb-4 space-y-2">
                  {itens.map((item) => (
                    <div key={item.id} className={`rounded-2xl border p-3 ${temaEscuro ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
                      {editandoId === item.id ? (
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2">
                          <input
                            autoFocus
                            value={nomeEditando}
                            onChange={(event) => setNomeEditando(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                salvarEdicao(item);
                              }
                              if (event.key === "Escape") cancelarEdicao();
                            }}
                            className={`p-3 rounded-xl border outline-none focus:border-emerald-500 ${temaEscuro ? "bg-slate-950 border-slate-700" : "bg-white border-slate-200"}`}
                          />
                          <button type="button" disabled={salvando} onClick={() => salvarEdicao(item)} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black">Salvar</button>
                          <button type="button" onClick={cancelarEdicao} className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-black">Cancelar</button>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <span className="flex-1 min-w-0 font-bold">🧩 {item.nome}</span>
                          <button type="button" onClick={() => iniciarEdicao(item)} className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black">Editar</button>
                          <button type="button" onClick={() => excluirSubcategoria?.(item)} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black">Excluir</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </article>
          );
        })}

        {subcategorias.length === 0 && (
          <div className={`rounded-3xl border p-6 text-center text-slate-400 ${temaEscuro ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
            Nenhuma subcategoria cadastrada ainda.
          </div>
        )}
      </div>
    </section>
  );
}

export default AdminSubcategorias;
