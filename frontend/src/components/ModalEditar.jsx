import { useEffect, useMemo, useState } from "react";
import EditorImagens from "./EditorImagens";
import { listarUsuariosAdminService } from "../services/authService";

function ModalEditar({
  aberto,
  nota,
  temaEscuro,
  categorias,
  subcategorias,
  criarSubcategoria,
  usuario,
  onFechar,
  onSalvar
}) {
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [categoria, setCategoria] = useState("Atendimentos");
  const [subcategoria, setSubcategoria] = useState("");
  const [compartilhada, setCompartilhada] = useState(false);
  const [compartilhamentoPrivado, setCompartilhamentoPrivado] = useState(false);
  const [senhaCompartilhamento, setSenhaCompartilhamento] = useState("");
  const [novaSubcategoria, setNovaSubcategoria] = useState("");
  const [imagens, setImagens] = useState([]);
  const [responsavelId, setResponsavelId] = useState("");
  const [usuariosResponsaveis, setUsuariosResponsaveis] = useState([]);
  const [carregandoResponsaveis, setCarregandoResponsaveis] = useState(false);
  const [erroResponsaveis, setErroResponsaveis] = useState("");

  useEffect(() => {
    if (nota) {
      setTitulo(nota.titulo || "");
      setConteudo(nota.conteudo || "");
      setCategoria(nota.categoria || "Atendimentos");
      setSubcategoria(nota.subcategoria || "");
      setCompartilhada(Boolean(nota.compartilhada));
      setCompartilhamentoPrivado(Boolean(nota.compartilhamentoPrivado));
      setSenhaCompartilhamento("");
      setImagens(Array.isArray(nota.imagens) ? nota.imagens : nota.imagem ? [nota.imagem] : []);
      setResponsavelId(String(nota.usuarioId || ""));
    }
  }, [nota]);

  useEffect(() => {
    let ativo = true;

    async function carregarResponsaveis() {
      if (!aberto || !usuario?.admin || !nota) {
        setUsuariosResponsaveis([]);
        setErroResponsaveis("");
        return;
      }

      setCarregandoResponsaveis(true);
      setErroResponsaveis("");

      try {
        const resposta = await listarUsuariosAdminService();
        if (!ativo) return;
        const lista = (resposta.data || []).filter((item) => item.ativo || Number(item.id) === Number(nota.usuarioId));
        setUsuariosResponsaveis(lista);
      } catch (error) {
        if (!ativo) return;
        setErroResponsaveis(error.response?.data?.erro || "Não foi possível carregar os responsáveis.");
        setUsuariosResponsaveis([{ id: nota.usuarioId, nome: nota.autorNome, usuario: nota.autorEmail, ativo: true }]);
      } finally {
        if (ativo) setCarregandoResponsaveis(false);
      }
    }

    carregarResponsaveis();
    return () => { ativo = false; };
  }, [aberto, usuario?.admin, nota]);

  const subcategoriasDaCategoria = useMemo(() => {
    return subcategorias.filter((item) => item.categoria === categoria);
  }, [subcategorias, categoria]);

  if (!aberto || !nota) {
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

  return (
    <div onClick={onFechar} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 md:p-4">
      <div
        onClick={(event) => event.stopPropagation()}
        className={`w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-[2rem] p-5 md:p-7 border shadow-2xl animate-modal-in ${
          temaEscuro ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-950"
        }`}
      >
        <div className="flex justify-between items-start gap-4 mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-500 font-black">Editar nota</p>
            <h2 className="text-2xl md:text-3xl font-black mt-1 break-words">{nota.titulo}</h2>
          </div>
          <button onClick={onFechar} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-2xl font-black transition-all">✕</button>
        </div>

        {usuario?.admin && (
          <div className={`mb-4 rounded-2xl border p-4 ${temaEscuro ? "bg-emerald-950/20 border-emerald-500/25" : "bg-emerald-50 border-emerald-200"}`}>
            <label className="grid gap-2 font-black">
              Responsável pela nota
              <select
                value={responsavelId}
                onChange={(event) => setResponsavelId(event.target.value)}
                disabled={carregandoResponsaveis}
                className={`p-4 rounded-2xl border outline-none font-medium ${temaEscuro ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}
              >
                {usuariosResponsaveis.map((item) => (
                  <option key={item.id} value={item.id}>{item.nome} (@{item.usuario || item.email})</option>
                ))}
              </select>
            </label>
            <p className="text-xs text-slate-400 mt-2">Ao trocar o responsável, a nota passa a aparecer em “Minhas notas” da conta escolhida.</p>
            {erroResponsaveis && <p className="text-sm text-red-400 font-bold mt-2">{erroResponsaveis}</p>}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input
            value={titulo}
            onChange={(event) => setTitulo(event.target.value)}
            placeholder="Título"
            className={`p-4 rounded-2xl border outline-none ${temaEscuro ? "bg-slate-900 border-slate-800 focus:border-emerald-500" : "bg-slate-50 border-slate-200 focus:border-emerald-500"}`}
          />
          <select
            value={categoria}
            onChange={(event) => {
              setCategoria(event.target.value);
              setSubcategoria("");
            }}
            className={`p-4 rounded-2xl border outline-none ${temaEscuro ? "bg-slate-900 border-slate-800 focus:border-emerald-500" : "bg-slate-50 border-slate-200 focus:border-emerald-500"}`}
          >
            {categorias.map((item) => <option key={item.id || item.nome} value={item.nome}>{item.icone} {item.nome}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 mb-4">
          <select
            value={subcategoria}
            onChange={(event) => setSubcategoria(event.target.value)}
            className={`p-4 rounded-2xl border outline-none ${temaEscuro ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"}`}
          >
            <option value="">Sem subcategoria</option>
            {subcategoriasDaCategoria.map((item) => <option key={item.id} value={item.nome}>{item.nome}</option>)}
          </select>
          {usuario?.admin && (
            <div className="flex gap-2">
              <input
                value={novaSubcategoria}
                onChange={(event) => setNovaSubcategoria(event.target.value)}
                placeholder="Nova subcategoria"
                className={`min-w-0 p-4 rounded-2xl border outline-none ${temaEscuro ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"}`}
              />
              <button type="button" onClick={adicionarSubcategoria} className="px-4 py-3 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-black">+</button>
            </div>
          )}
        </div>

        {subcategoriasDaCategoria.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {subcategoriasDaCategoria.map((item) => (
              <span key={item.id} className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-black ${temaEscuro ? "bg-slate-900 border border-slate-800 text-slate-300" : "bg-slate-100 border border-slate-200 text-slate-700"}`}>
                🧩 {item.nome}
              </span>
            ))}
          </div>
        )}

        <div className={`rounded-2xl border overflow-hidden mb-4 ${temaEscuro ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
          <div className={`flex gap-2 flex-wrap p-3 border-b ${temaEscuro ? "border-slate-800" : "border-slate-200"}`}>
            <button type="button" onClick={() => inserirMarcador("•")} className="px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold">Lista</button>
            <button type="button" onClick={() => inserirMarcador("✓")} className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold">Tarefa</button>
            <button type="button" onClick={() => inserirMarcador("Importante:")} className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-sm font-bold">Importante</button>
          </div>
          <textarea value={conteudo} onChange={(event) => setConteudo(event.target.value)} rows={8} className="w-full p-4 bg-transparent outline-none resize-y leading-relaxed" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4 mb-6">
          <EditorImagens imagens={imagens} setImagens={setImagens} temaEscuro={temaEscuro} />

          <div className="flex flex-col gap-3">
            <label className={`flex items-start gap-3 rounded-2xl border p-4 cursor-pointer h-fit ${temaEscuro ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
              <input type="checkbox" checked={compartilhada} onChange={(event) => setCompartilhada(event.target.checked)} className="w-5 h-5 mt-1" />
              <span><strong className="block">Compartilhada</strong><small className="text-slate-400">A equipe visualiza, mas não edita o conteúdo original.</small></span>
            </label>

            {compartilhada && (
              <label className={`flex items-start gap-3 rounded-2xl border p-4 cursor-pointer h-fit ${temaEscuro ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                <input type="checkbox" checked={compartilhamentoPrivado} onChange={(event) => setCompartilhamentoPrivado(event.target.checked)} className="w-5 h-5 mt-1" />
                <span><strong className="block">Pública protegida por senha</strong><small className="text-slate-400">Exige senha para os demais usuários abrirem.</small></span>
              </label>
            )}

            {compartilhada && compartilhamentoPrivado && (
              <input
                type="password"
                value={senhaCompartilhamento}
                onChange={(event) => setSenhaCompartilhamento(event.target.value)}
                placeholder="Nova senha da nota, opcional"
                className={`p-4 rounded-2xl border outline-none ${temaEscuro ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"}`}
              />
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <button onClick={onFechar} className="px-5 py-3 rounded-2xl bg-slate-600 hover:bg-slate-700 text-white font-black transition-all">Cancelar</button>
          <button
            onClick={() => onSalvar(nota.id, {
              titulo,
              conteudo,
              categoria,
              subcategoria,
              compartilhada,
              compartilhamentoPrivado,
              senhaCompartilhamento,
              imagens,
              responsavelId: usuario?.admin ? Number(responsavelId) : undefined
            })}
            className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black transition-all"
          >
            Salvar alterações
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalEditar;
