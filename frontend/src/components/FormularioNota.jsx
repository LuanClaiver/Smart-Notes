import { useMemo, useState } from "react";
import EditorImagens from "./EditorImagens";

function FormularioNota({
  formularioAberto,
  temaEscuro,
  titulo,
  setTitulo,
  categoria,
  setCategoria,
  subcategoria,
  setSubcategoria,
  conteudo,
  setConteudo,
  compartilhada,
  setCompartilhada,
  compartilhamentoPrivado,
  setCompartilhamentoPrivado,
  senhaCompartilhamento,
  setSenhaCompartilhamento,
  imagens,
  setImagens,
  categorias,
  subcategorias,
  criarSubcategoria,
  usuario,
  criarNota,
  onFechar
}) {
  const [novaSubcategoria, setNovaSubcategoria] = useState("");

  const subcategoriasDaCategoria = useMemo(() => {
    return subcategorias.filter((item) => item.categoria === categoria);
  }, [subcategorias, categoria]);

  if (!formularioAberto) {
    return null;
  }

  function inserirMarcador(marcador) {
    setConteudo(`${conteudo}${conteudo ? "\n" : ""}${marcador} `);
  }

  async function adicionarSubcategoria() {
    if (!novaSubcategoria.trim()) {
      return;
    }

    const criada = await criarSubcategoria(categoria, novaSubcategoria);

    if (criada) {
      setSubcategoria(novaSubcategoria.trim());
      setNovaSubcategoria("");
    }
  }

  function fecharAoClicarFora(event) {
    if (event.target === event.currentTarget) {
      onFechar?.();
    }
  }

  return (
    <div onMouseDown={fecharAoClicarFora} className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-md p-3 md:p-6 flex items-center justify-center animate-fade-in">
      <div
        className={`w-full max-w-6xl max-h-[92vh] overflow-y-auto rounded-[2rem] p-5 md:p-7 border shadow-2xl ${
          temaEscuro ? "bg-slate-900/95 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-950"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-500 font-black">Nova anotação</p>
            <h2 className="text-2xl md:text-3xl font-black mt-1">Registrar nota</h2>
            <p className="text-sm text-slate-400 mt-2 max-w-3xl">
              O editor abre como janela para não jogar a tela para baixo. Escreva, escolha a pasta e anexe imagens dentro da nota.
            </p>
          </div>

          <button
            type="button"
            onClick={onFechar}
            className={`shrink-0 px-4 py-3 rounded-2xl font-black transition-all ${
              temaEscuro ? "bg-slate-800 hover:bg-slate-700 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-950"
            }`}
          >
            Fechar ✕
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input
            value={titulo}
            onChange={(event) => setTitulo(event.target.value)}
            placeholder="Título da nota"
            className={`p-4 rounded-2xl border outline-none transition-all ${
              temaEscuro ? "bg-slate-950 border-slate-800 focus:border-emerald-500" : "bg-slate-50 border-slate-200 focus:border-emerald-500"
            }`}
          />

          <select
            value={categoria}
            onChange={(event) => {
              setCategoria(event.target.value);
              setSubcategoria("");
            }}
            className={`p-4 rounded-2xl border outline-none transition-all ${
              temaEscuro ? "bg-slate-950 border-slate-800 focus:border-emerald-500" : "bg-slate-50 border-slate-200 focus:border-emerald-500"
            }`}
          >
            {categorias.map((item) => (
              <option key={item.id || item.nome} value={item.nome}>{item.icone} {item.nome}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 mb-4">
          <select
            value={subcategoria}
            onChange={(event) => setSubcategoria(event.target.value)}
            className={`p-4 rounded-2xl border outline-none transition-all ${
              temaEscuro ? "bg-slate-950 border-slate-800 focus:border-emerald-500" : "bg-slate-50 border-slate-200 focus:border-emerald-500"
            }`}
          >
            <option value="">Sem subcategoria</option>
            {subcategoriasDaCategoria.map((item) => (
              <option key={item.id} value={item.nome}>{item.nome}</option>
            ))}
          </select>

          {usuario?.admin && (
            <div className="flex gap-2">
              <input
                value={novaSubcategoria}
                onChange={(event) => setNovaSubcategoria(event.target.value)}
                placeholder="Nova subcategoria"
                className={`min-w-0 p-4 rounded-2xl border outline-none ${
                  temaEscuro ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                }`}
              />
              <button
                type="button"
                onClick={adicionarSubcategoria}
                className="px-4 py-3 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-black"
              >
                +
              </button>
            </div>
          )}
        </div>

        {subcategoriasDaCategoria.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {subcategoriasDaCategoria.map((item) => (
              <span key={item.id} className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-black ${temaEscuro ? "bg-slate-950 border border-slate-800 text-slate-300" : "bg-slate-100 border border-slate-200 text-slate-700"}`}>
                🧩 {item.nome}
              </span>
            ))}
          </div>
        )}

        <div className={`rounded-2xl border overflow-hidden mb-4 ${temaEscuro ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
          <div className={`flex gap-2 flex-wrap p-3 border-b ${temaEscuro ? "border-slate-800" : "border-slate-200"}`}>
            <button type="button" onClick={() => inserirMarcador("•")} className="px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold">Lista</button>
            <button type="button" onClick={() => inserirMarcador("✓")} className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold">Tarefa</button>
            <button type="button" onClick={() => inserirMarcador("Importante:")} className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-sm font-bold">Importante</button>
            <span className="px-3 py-2 text-xs text-slate-400">As imagens entram como anexos dentro da nota.</span>
          </div>

          <textarea
            value={conteudo}
            onChange={(event) => setConteudo(event.target.value)}
            placeholder="Escreva o conteúdo da nota..."
            rows={8}
            className="w-full p-4 bg-transparent outline-none resize-y leading-relaxed"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4 items-start">
          <EditorImagens imagens={imagens} setImagens={setImagens} temaEscuro={temaEscuro} />

          <div className="flex flex-col gap-3">
            <label className={`flex items-start gap-3 rounded-2xl border p-4 cursor-pointer ${temaEscuro ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
              <input type="checkbox" checked={compartilhada} onChange={(event) => setCompartilhada(event.target.checked)} className="w-5 h-5 mt-1" />
              <span>
                <strong className="block">Compartilhar com a equipe</strong>
                <small className="text-slate-400">Outros usuários visualizam, mas não alteram o conteúdo original.</small>
              </span>
            </label>

            {compartilhada && (
              <label className={`flex items-start gap-3 rounded-2xl border p-4 cursor-pointer ${temaEscuro ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                <input type="checkbox" checked={compartilhamentoPrivado} onChange={(event) => setCompartilhamentoPrivado(event.target.checked)} className="w-5 h-5 mt-1" />
                <span>
                  <strong className="block">Pública protegida por senha</strong>
                  <small className="text-slate-400">Exige senha para outros usuários abrirem a nota.</small>
                </span>
              </label>
            )}

            {compartilhada && compartilhamentoPrivado && (
              <input
                type="password"
                value={senhaCompartilhamento}
                onChange={(event) => setSenhaCompartilhamento(event.target.value)}
                placeholder="Senha da nota pública"
                className={`p-4 rounded-2xl border outline-none ${temaEscuro ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"}`}
              />
            )}

            <button onClick={criarNota} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl px-6 py-4 shadow-lg shadow-emerald-600/20 transition-all hover:-translate-y-0.5">
              Salvar nota
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FormularioNota;
