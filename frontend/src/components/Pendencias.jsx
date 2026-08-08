import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  listarPendenciasService,
  criarPendenciaService,
  editarPendenciaService,
  moverPendenciaService,
  excluirPendenciaService
} from "../services/pendenciasService";
import { listarUsuariosAdminService } from "../services/authService";
import EditorImagens from "./EditorImagens";
import VisualizadorImagem from "./VisualizadorImagem";

const COLUNAS = [
  ["a_fazer", "A fazer"],
  ["em_andamento", "Em andamento"],
  ["concluido", "Concluído"]
];

const tipoEscopo = (valor) => valor === "equipe" ? "equipe" : "individual";

function checklistSugerido(form) {
  const base = `${form?.titulo || ""} ${form?.descricao || ""}`.toLowerCase();

  if (/acesso|senha|usu[aá]rio|permiss[aã]o|login/.test(base)) {
    return [
      "Identificar usuário e necessidade",
      "Validar autorização da solicitação",
      "Aplicar acesso ou permissão",
      "Testar com o usuário",
      "Registrar a conclusão"
    ];
  }
  if (/impressora|equipamento|computador|notebook|hardware/.test(base)) {
    return [
      "Confirmar equipamento e sintoma",
      "Verificar conexões e configurações",
      "Aplicar a correção necessária",
      "Executar teste de funcionamento",
      "Registrar o atendimento"
    ];
  }
  if (/rede|internet|switch|vlan|wifi|wi-fi|cabo/.test(base)) {
    return [
      "Identificar ponto e equipamento",
      "Verificar conectividade física",
      "Validar configuração de rede",
      "Executar testes de comunicação",
      "Registrar a solução"
    ];
  }
  return [
    "Entender a solicitação",
    "Planejar a execução",
    "Executar a tarefa",
    "Validar o resultado",
    "Registrar a conclusão"
  ];
}

const MODELOS_FIXOS = [
  {
    id: "atendimento",
    titulo: "Atendimento",
    descricao: "Fluxo curto para acompanhar um atendimento do início ao fim.",
    itens: ["Entender a solicitação", "Executar o atendimento", "Validar com o solicitante", "Registrar a conclusão"]
  },
  {
    id: "infra",
    titulo: "Infraestrutura",
    descricao: "Modelo para mudanças, instalações e atividades técnicas.",
    itens: ["Planejar atividade", "Preparar ambiente", "Executar alteração", "Realizar testes", "Documentar resultado"]
  },
  {
    id: "validacao",
    titulo: "Revisão e validação",
    descricao: "Modelo para tarefas que passam por conferência antes de concluir.",
    itens: ["Revisar requisitos", "Executar tarefa", "Conferir resultado", "Ajustar pendências", "Aprovar conclusão"]
  }
];

export default function Pendencias({ temaEscuro, usuario }) {
  const [lista, setLista] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [editando, setEditando] = useState(null);
  const [visao, setVisao] = useState("individual");
  const [form, setForm] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [mostrarModelos, setMostrarModelos] = useState(false);
  const [imagemVisualizada, setImagemVisualizada] = useState(null);

  const fecharFormulario = useCallback(() => {
    setEditando(null);
    setForm(null);
    setMostrarModelos(false);
  }, []);

  const criarFormularioVazio = (escopo = visao, status = "a_fazer") => ({
    titulo: "",
    descricao: "",
    status,
    escopo: tipoEscopo(escopo),
    responsavelId: usuario.id,
    itens: [],
    imagens: []
  });

  async function carregar() {
    try {
      setLista((await listarPendenciasService()).data);
      if (usuario.admin) {
        setUsuarios((await listarUsuariosAdminService()).data.filter((item) => item.ativo));
      }
    } catch (error) {
      toast.error(error.response?.data?.erro || error.message || "Erro ao carregar pendências");
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  useEffect(() => {
    if (!form) return undefined;
    const controlarTeclado = (evento) => {
      if (imagemVisualizada) return;

      if (evento.key === "Escape") {
        evento.preventDefault();
        fecharFormulario();
        return;
      }

      if (evento.key !== "Enter" || evento.shiftKey || evento.defaultPrevented || salvando) return;
      const alvo = evento.target;
      const tag = String(alvo?.tagName || "").toLowerCase();
      const tipo = String(alvo?.type || "").toLowerCase();
      if (tag === "textarea" || tag === "select" || tag === "button" || alvo?.isContentEditable) return;
      if (tipo === "checkbox" || tipo === "radio" || tipo === "file") return;
      if (alvo?.dataset?.checklistItem !== undefined) return;

      evento.preventDefault();
      salvar();
    };
    window.addEventListener("keydown", controlarTeclado);
    return () => window.removeEventListener("keydown", controlarTeclado);
  }, [form, fecharFormulario, salvando, imagemVisualizada]);

  const individuais = useMemo(
    () => lista.filter((item) => tipoEscopo(item.escopo) === "individual"),
    [lista]
  );
  const equipe = useMemo(
    () => lista.filter((item) => tipoEscopo(item.escopo) === "equipe"),
    [lista]
  );
  const listaVisivel = visao === "equipe" ? equipe : individuais;

  function abrir(pendencia = null, statusInicial = "a_fazer") {
    setMostrarModelos(false);
    setEditando(pendencia?.id || 0);
    setForm(pendencia
      ? {
          ...pendencia,
          escopo: tipoEscopo(pendencia.escopo),
          itens: (pendencia.itens || []).map((item) => ({ ...item })),
          imagens: Array.isArray(pendencia.imagens) ? [...pendencia.imagens] : []
        }
      : criarFormularioVazio(visao, statusInicial));
  }

  function aplicarModelo(itens) {
    const novos = itens.map((texto) => ({ texto, concluido: false }));
    setForm((atual) => ({ ...atual, itens: [...(atual.itens || []), ...novos] }));
    setMostrarModelos(false);
  }

  async function salvar() {
    if (!form?.titulo?.trim()) {
      toast.warning("Informe o título da pendência.", { position: "top-right" });
      return;
    }
    try {
      setSalvando(true);
      if (editando) await editarPendenciaService(editando, form);
      else await criarPendenciaService(form);
      toast.success(editando ? "Pendência atualizada!" : "Pendência criada!");
      setVisao(tipoEscopo(form.escopo));
      fecharFormulario();
      await carregar();
    } catch (error) {
      toast.error(error.response?.data?.erro || error.message || "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  async function mover(id, status) {
    try {
      await moverPendenciaService(id, status);
      toast.info("Status da pendência atualizado.");
      await carregar();
    } catch (error) {
      toast.error(error.response?.data?.erro || error.message || "Não foi possível mover a pendência");
    }
  }

  async function excluir(pendencia) {
    if (!confirm(`Excluir a pendência “${pendencia.titulo}”?`)) return;
    try {
      await excluirPendenciaService(pendencia.id);
      if (Number(editando) === Number(pendencia.id)) fecharFormulario();
      toast.success("Pendência excluída.");
      await carregar();
    } catch (error) {
      toast.error(error.response?.data?.erro || error.message || "Não foi possível excluir a pendência");
    }
  }

  const box = temaEscuro ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
  const campo = temaEscuro
    ? "bg-slate-800 border-slate-700 text-white"
    : "bg-white border-slate-300 text-slate-950";
  const card = temaEscuro
    ? "bg-slate-950 border-slate-800 hover:border-slate-600"
    : "bg-slate-50 border-slate-200 hover:border-slate-400";
  const abaAtiva = "bg-emerald-600 text-white shadow-lg shadow-emerald-700/20";
  const abaInativa = temaEscuro
    ? "bg-slate-800 text-slate-200 hover:bg-slate-700"
    : "bg-slate-100 text-slate-700 hover:bg-slate-200";

  const podeAlterarEscopoFormulario = !editando
    || usuario.admin
    || Number(form?.criadoPor) === Number(usuario.id)
    || form?.podeAlterarEscopo;

  const totalFormulario = form?.itens?.length || 0;
  const concluidosFormulario = form?.itens?.filter((item) => item.concluido).length || 0;
  const progressoFormulario = totalFormulario ? Math.round((concluidosFormulario / totalFormulario) * 100) : 0;
  const atividadesChecklist = (form?.itens || [])
    .filter((item) => item.concluido && item.concluidoPorNome)
    .sort((a, b) => String(b.concluidoEm || "").localeCompare(String(a.concluidoEm || "")));

  return (
    <div className="animate-fade-in">
      <div className={`rounded-[2rem] border p-5 mb-5 ${box}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black">Pendências</h2>
            <p className="text-slate-400">Quadro compacto de tarefas com checklist, progresso e responsáveis.</p>
          </div>
          <button
            onClick={() => abrir()}
            className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black"
          >
            {visao === "equipe" ? "+ Nova da equipe" : "+ Nova individual"}
          </button>
        </div>

        <div className={`mt-5 p-1.5 rounded-2xl flex flex-col sm:flex-row gap-2 ${temaEscuro ? "bg-slate-950" : "bg-slate-100"}`}>
          <button
            onClick={() => setVisao("individual")}
            className={`flex-1 rounded-xl px-4 py-3 font-black transition ${visao === "individual" ? abaAtiva : abaInativa}`}
          >
            👤 Individuais <span className="opacity-75">({individuais.length})</span>
          </button>
          <button
            onClick={() => setVisao("equipe")}
            className={`flex-1 rounded-xl px-4 py-3 font-black transition ${visao === "equipe" ? abaAtiva : abaInativa}`}
          >
            👥 Equipe <span className="opacity-75">({equipe.length})</span>
          </button>
        </div>

        <p className="mt-3 text-sm text-slate-400">
          {visao === "equipe"
            ? "As pendências da equipe ficam separadas das individuais e podem ser atualizadas por todos."
            : "Clique em um cartão para abrir os detalhes. Também é possível arrastá-lo entre as colunas."}
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
        {COLUNAS.map(([status, nome]) => {
          const itensColuna = listaVisivel.filter((item) => item.status === status);
          return (
            <section
              key={`${visao}-${status}`}
              onDragOver={(evento) => evento.preventDefault()}
              onDrop={(evento) => {
                const id = Number(evento.dataTransfer.getData("id"));
                if (id) mover(id, status);
              }}
              className={`rounded-[1.6rem] border p-3 min-h-48 ${box}`}
            >
              <div className="flex items-center justify-between gap-3 px-1 mb-3">
                <h3 className="font-black text-lg">
                  {nome} <span className="text-xs text-slate-400">({itensColuna.length})</span>
                </h3>
                <button
                  type="button"
                  onClick={() => abrir(null, status)}
                  className={`w-8 h-8 rounded-lg text-xl leading-none ${temaEscuro ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}
                  title={`Adicionar em ${nome}`}
                >
                  +
                </button>
              </div>

              <div className="space-y-2">
                {itensColuna.map((pendencia) => (
                  <article
                    key={pendencia.id}
                    draggable={pendencia.podeEditar !== false}
                    onDragStart={(evento) => {
                      evento.dataTransfer.effectAllowed = "move";
                      evento.dataTransfer.setData("id", String(pendencia.id));
                    }}
                    onClick={() => abrir(pendencia)}
                    className={`group rounded-xl border px-3 py-2.5 cursor-pointer transition shadow-sm ${card}`}
                    title="Clique para abrir a pendência"
                  >
                    <div className="flex items-start gap-2">
                      <span className={`mt-0.5 text-[11px] ${tipoEscopo(pendencia.escopo) === "equipe" ? "text-cyan-400" : "text-emerald-400"}`}>
                        {tipoEscopo(pendencia.escopo) === "equipe" ? "👥" : "👤"}
                      </span>
                      <strong className="flex-1 text-sm leading-5 break-words">{pendencia.titulo}</strong>
                      <span className="text-[11px] text-emerald-400 font-black whitespace-nowrap">{pendencia.progresso}%</span>
                    </div>

                    {pendencia.total > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className={`h-1.5 flex-1 rounded-full overflow-hidden ${temaEscuro ? "bg-slate-700" : "bg-slate-300"}`}>
                          <div className="h-full bg-emerald-600" style={{ width: `${pendencia.progresso}%` }} />
                        </div>
                        <span className="text-[11px] text-slate-400 whitespace-nowrap">☑ {pendencia.concluidos}/{pendencia.total}</span>
                      </div>
                    )}

                    <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                      <span className="truncate">{pendencia.responsavelNome}</span>
                      <span className="flex items-center gap-2 shrink-0">
                        {Array.isArray(pendencia.imagens) && pendencia.imagens.length > 0 && (
                          <span title="Imagens anexadas">🖼 {pendencia.imagens.length}</span>
                        )}
                        <span className="opacity-0 group-hover:opacity-100 transition">Abrir ↗</span>
                      </span>
                    </div>
                  </article>
                ))}

                <button
                  type="button"
                  onClick={() => abrir(null, status)}
                  className={`w-full text-left rounded-xl px-3 py-2 text-sm font-bold transition ${temaEscuro ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}
                >
                  + Adicionar pendência
                </button>
              </div>
            </section>
          );
        })}
      </div>

      {editando !== null && form && (
        <div
          className="fixed inset-0 z-[70] bg-black/75 p-2 sm:p-4 flex items-center justify-center"
          onPointerDown={(evento) => {
            if (evento.target === evento.currentTarget) fecharFormulario();
          }}
        >
          <div
            className={`w-full max-w-6xl h-[94vh] max-h-[94vh] overflow-hidden rounded-[1.6rem] border shadow-2xl flex flex-col ${box}`}
            onPointerDown={(evento) => evento.stopPropagation()}
          >
            <div className={`shrink-0 flex items-center gap-3 px-4 sm:px-5 py-3 border-b ${temaEscuro ? "border-slate-800" : "border-slate-200"}`}>
              <select
                value={form.status}
                onChange={(evento) => setForm({ ...form, status: evento.target.value })}
                className={`px-3 py-2 rounded-xl border text-sm font-black ${campo}`}
              >
                {COLUNAS.map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
              </select>
              <span className="text-xs text-slate-400 hidden sm:inline">{editando ? `Pendência #${editando}` : "Nova pendência"}</span>
              <button
                type="button"
                onClick={fecharFormulario}
                className={`ml-auto w-9 h-9 rounded-xl text-xl ${temaEscuro ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,.75fr)] flex-1 min-h-0 overflow-y-auto lg:overflow-hidden overscroll-contain">
              <div className="p-4 sm:p-6 min-h-0 lg:overflow-y-auto overscroll-contain">
                <input
                  value={form.titulo}
                  onChange={(evento) => setForm({ ...form, titulo: evento.target.value })}
                  placeholder="Título da pendência"
                  className={`w-full px-1 py-2 bg-transparent border-0 outline-none text-2xl sm:text-3xl font-black ${temaEscuro ? "text-white" : "text-slate-950"}`}
                />

                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setMostrarModelos((valor) => !valor)}
                    className={`px-3 py-2 rounded-xl border text-sm font-bold ${campo}`}
                  >
                    ☑ Checklist
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, status: form.status === "a_fazer" ? "em_andamento" : form.status === "em_andamento" ? "concluido" : "a_fazer" })}
                    className={`px-3 py-2 rounded-xl border text-sm font-bold ${campo}`}
                  >
                    ↔ Alterar status
                  </button>
                  <span className={`px-3 py-2 rounded-xl text-sm font-black ${tipoEscopo(form.escopo) === "equipe" ? "bg-cyan-500/15 text-cyan-400" : "bg-emerald-500/15 text-emerald-400"}`}>
                    {tipoEscopo(form.escopo) === "equipe" ? "👥 Equipe" : "👤 Individual"}
                  </span>
                </div>

                {mostrarModelos && (
                  <div className={`mt-3 rounded-2xl border p-3 ${temaEscuro ? "border-slate-700 bg-slate-950/60" : "border-slate-200 bg-slate-50"}`}>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div>
                        <strong className="block">Adicionar checklist</strong>
                        <span className="text-xs text-slate-400">Escolha um modelo pronto ou comece em branco.</span>
                      </div>
                      <button type="button" onClick={() => setMostrarModelos(false)} className="text-slate-400">×</button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => aplicarModelo(checklistSugerido(form))}
                        className={`text-left rounded-xl border p-3 ${campo}`}
                      >
                        <strong className="block text-sm">✨ Sugerido pela tarefa</strong>
                        <span className="block mt-1 text-xs text-slate-400">Monta etapas conforme o título e a descrição.</span>
                      </button>
                      {MODELOS_FIXOS.map((modelo) => (
                        <button
                          type="button"
                          key={modelo.id}
                          onClick={() => aplicarModelo(modelo.itens)}
                          className={`text-left rounded-xl border p-3 ${campo}`}
                        >
                          <strong className="block text-sm">{modelo.titulo}</strong>
                          <span className="block mt-1 text-xs text-slate-400">{modelo.descricao}</span>
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setForm((atual) => ({ ...atual, itens: [...(atual.itens || []), { texto: "", concluido: false }] }));
                          setMostrarModelos(false);
                        }}
                        className={`text-left rounded-xl border p-3 ${campo}`}
                      >
                        <strong className="block text-sm">＋ Em branco</strong>
                        <span className="block mt-1 text-xs text-slate-400">Adiciona um item vazio para você montar do seu jeito.</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  <h4 className="font-black mb-2">Descrição</h4>
                  <textarea
                    value={form.descricao}
                    onChange={(evento) => setForm({ ...form, descricao: evento.target.value })}
                    placeholder="Adicione uma descrição mais detalhada..."
                    rows={5}
                    className={`w-full p-4 rounded-2xl border resize-y ${campo}`}
                  />
                </div>

                <div className="mt-6">
                  <EditorImagens
                    imagens={Array.isArray(form.imagens) ? form.imagens : []}
                    setImagens={(imagens) => setForm((atual) => ({ ...atual, imagens }))}
                    temaEscuro={temaEscuro}
                    titulo="Imagens da pendência"
                    descricao="Adicione até 6 imagens para registrar evidências, referências ou detalhes da atividade."
                    textoVazio="Nenhuma imagem adicionada nesta pendência."
                    maxImagens={6}
                    onAbrirImagem={setImagemVisualizada}
                  />
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <h4 className="font-black">☑ Checklist</h4>
                    <span className="text-sm font-black text-emerald-400">{progressoFormulario}%</span>
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs text-slate-400 w-8">{progressoFormulario}%</span>
                    <div className={`h-2 flex-1 rounded-full overflow-hidden ${temaEscuro ? "bg-slate-700" : "bg-slate-300"}`}>
                      <div className="h-full bg-emerald-600 transition-all" style={{ width: `${progressoFormulario}%` }} />
                    </div>
                    <span className="text-xs text-slate-400">{concluidosFormulario}/{totalFormulario}</span>
                  </div>

                  <div className="space-y-1.5">
                    {(form.itens || []).map((item, indice) => (
                      <div
                        key={item.id || `novo-${indice}`}
                        className={`rounded-xl border px-2.5 py-2 ${temaEscuro ? "border-slate-800 bg-slate-950/40" : "border-slate-200 bg-slate-50"}`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={Boolean(item.concluido)}
                            onChange={(evento) => {
                              const concluido = evento.target.checked;
                              const itens = [...form.itens];
                              itens[indice] = {
                                ...item,
                                concluido,
                                concluidoPor: concluido ? (item.concluido ? item.concluidoPor : usuario.id) : null,
                                concluidoPorNome: concluido ? (item.concluido ? item.concluidoPorNome : usuario.nome) : null,
                                concluidoEm: concluido ? (item.concluido ? item.concluidoEm : new Date().toISOString()) : null
                              };
                              const itensValidos = itens.filter((itemChecklist) => String(itemChecklist.texto || "").trim());
                              const checklistCompleto = itensValidos.length > 0 && itensValidos.every((itemChecklist) => Boolean(itemChecklist.concluido));
                              setForm({
                                ...form,
                                itens,
                                status: checklistCompleto ? "concluido" : form.status
                              });
                            }}
                            className="w-4 h-4 shrink-0"
                          />
                          <input
                            value={item.texto}
                            data-checklist-item={indice}
                            onChange={(evento) => {
                              const itens = [...form.itens];
                              itens[indice] = { ...item, texto: evento.target.value };
                              setForm({ ...form, itens });
                            }}
                            onKeyDown={(evento) => {
                              if (evento.key !== "Enter" || evento.shiftKey) return;
                              evento.preventDefault();
                              const itens = [...form.itens];
                              itens.splice(indice + 1, 0, { texto: "", concluido: false });
                              setForm({ ...form, itens });
                              window.setTimeout(() => {
                                document.querySelector(`[data-checklist-item="${indice + 1}"]`)?.focus();
                              }, 0);
                            }}
                            placeholder={`Item ${indice + 1}`}
                            className={`flex-1 min-w-0 px-2 py-1.5 rounded-lg border-0 outline-none ${item.concluido ? "line-through opacity-60" : ""} ${temaEscuro ? "bg-slate-900" : "bg-white"}`}
                          />
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, itens: form.itens.filter((_, posicao) => posicao !== indice) })}
                            className={`w-8 h-8 rounded-lg shrink-0 ${temaEscuro ? "hover:bg-red-500/20 text-red-400" : "hover:bg-red-50 text-red-600"}`}
                            title="Excluir item"
                          >
                            ×
                          </button>
                        </div>
                        {item.concluido && item.concluidoPorNome && (
                          <p className={`mt-1.5 pl-6 text-[11px] ${Number(item.concluidoPor) === Number(usuario.id) ? "text-emerald-400" : "text-cyan-400"}`}>
                            ✓ Concluído por <strong>{Number(item.concluidoPor) === Number(usuario.id) ? "você" : item.concluidoPorNome}</strong>
                            {item.concluidoEm ? ` • ${new Date(item.concluidoEm).toLocaleString()}` : ""}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, itens: [...form.itens, { texto: "", concluido: false }] })}
                    className={`mt-3 px-3 py-2 rounded-xl text-sm font-bold ${temaEscuro ? "bg-slate-800 hover:bg-slate-700" : "bg-slate-100 hover:bg-slate-200"}`}
                  >
                    + Adicionar um item
                  </button>
                </div>
              </div>

              <aside className={`p-4 sm:p-5 min-h-0 border-t lg:border-t-0 lg:border-l lg:overflow-y-auto overscroll-contain ${temaEscuro ? "border-slate-800 bg-slate-950/30" : "border-slate-200 bg-slate-50/60"}`}>
                <h4 className="font-black mb-3">Detalhes</h4>

                <label className="block text-xs font-black mb-1 text-slate-400">Tipo de pendência</label>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button
                    type="button"
                    disabled={!podeAlterarEscopoFormulario}
                    onClick={() => setForm({ ...form, escopo: "individual" })}
                    className={`rounded-xl px-2 py-2 text-xs font-black disabled:opacity-50 ${tipoEscopo(form.escopo) === "individual" ? abaAtiva : abaInativa}`}
                  >
                    👤 Individual
                  </button>
                  <button
                    type="button"
                    disabled={!podeAlterarEscopoFormulario}
                    onClick={() => setForm({ ...form, escopo: "equipe" })}
                    className={`rounded-xl px-2 py-2 text-xs font-black disabled:opacity-50 ${tipoEscopo(form.escopo) === "equipe" ? abaAtiva : abaInativa}`}
                  >
                    👥 Equipe
                  </button>
                </div>

                {usuario.admin && (
                  <>
                    <label className="block text-xs font-black mb-1 text-slate-400">Responsável</label>
                    <select
                      value={form.responsavelId}
                      onChange={(evento) => setForm({ ...form, responsavelId: Number(evento.target.value) })}
                      className={`w-full p-3 rounded-xl border mb-4 ${campo}`}
                    >
                      {usuarios.map((item) => <option key={item.id} value={item.id}>{item.nome} (@{item.usuario})</option>)}
                    </select>
                  </>
                )}

                <div className={`rounded-xl border p-3 text-xs space-y-2 ${temaEscuro ? "border-slate-800" : "border-slate-200"}`}>
                  <p><span className="text-slate-400">Responsável:</span> <strong>{form.responsavelNome || usuario.nome}</strong></p>
                  {form.autorNome && <p><span className="text-slate-400">Criada por:</span> <strong>{form.autorNome}</strong></p>}
                  {form.criadoEm && <p><span className="text-slate-400">Criada em:</span> {new Date(form.criadoEm).toLocaleString()}</p>}
                  {form.atualizadoEm && <p><span className="text-slate-400">Atualizada:</span> {new Date(form.atualizadoEm).toLocaleString()}</p>}
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h4 className="font-black">Atividade do checklist</h4>
                    <span className="text-xs text-slate-400">{atividadesChecklist.length}</span>
                  </div>
                  {atividadesChecklist.length > 0 ? (
                    <div className="space-y-2">
                      {atividadesChecklist.map((item, indice) => (
                        <div key={`${item.id || indice}-${item.concluidoEm || indice}`} className={`rounded-xl border p-3 text-xs ${temaEscuro ? "border-slate-800 bg-slate-900/70" : "border-slate-200 bg-white"}`}>
                          <strong className="block">{item.concluidoPorNome}</strong>
                          <span className="text-slate-400">concluiu “{item.texto || `Item ${indice + 1}`}”</span>
                          {item.concluidoEm && <span className="block mt-1 text-[11px] text-slate-500">{new Date(item.concluidoEm).toLocaleString()}</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">As conclusões dos itens aparecerão aqui com o nome de quem marcou cada tarefa.</p>
                  )}
                </div>

                <div className="mt-6 flex flex-col gap-2">
                  <button
                    onClick={salvar}
                    disabled={salvando}
                    className="w-full p-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black disabled:opacity-60"
                  >
                    {salvando ? "Salvando..." : "Salvar alterações"}
                  </button>
                  {editando && form.podeExcluir !== false && (
                    <button
                      type="button"
                      onClick={() => excluir(form)}
                      className="w-full p-3 rounded-xl bg-red-600/15 text-red-400 hover:bg-red-600/25 font-black"
                    >
                      Excluir pendência
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={fecharFormulario}
                    className={`w-full p-3 rounded-xl font-black ${temaEscuro ? "bg-slate-800 hover:bg-slate-700" : "bg-slate-200 hover:bg-slate-300"}`}
                  >
                    Fechar
                  </button>
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}

      <VisualizadorImagem
        imagem={imagemVisualizada}
        temaEscuro={temaEscuro}
        onFechar={() => setImagemVisualizada(null)}
      />
    </div>
  );
}
