import { useEffect, useState } from "react";
import EditorImagens from "./EditorImagens";
import {
  carregarObservacoesService,
  criarObservacaoService,
  desbloquearNotaService,
  excluirObservacaoService
} from "../services/notasService";

function ModalNota({
  notaSelecionada,
  setNotaSelecionada,
  temaEscuro,
  tempoDecorrido,
  alternarFavorita,
  alternarFixada,
  abrirModalEditar,
  solicitarExclusao,
  restaurarNota,
  excluirDefinitivamente,
  atualizarNotaSelecionada,
  abrirImagem
}) {
  const [senha, setSenha] = useState("");
  const [erroSenha, setErroSenha] = useState("");
  const [observacoes, setObservacoes] = useState([]);
  const [textoObservacao, setTextoObservacao] = useState("");
  const [imagensObservacao, setImagensObservacao] = useState([]);
  const [carregandoObservacoes, setCarregandoObservacoes] = useState(false);

  useEffect(() => {
    setSenha("");
    setErroSenha("");
    setTextoObservacao("");
    setImagensObservacao([]);
    setObservacoes([]);

    if (notaSelecionada && notaSelecionada.compartilhada && !notaSelecionada.bloqueada) {
      carregarObservacoes();
    }
  }, [notaSelecionada?.id, notaSelecionada?.bloqueada]);

  if (!notaSelecionada) {
    return null;
  }

  const imagens = Array.isArray(notaSelecionada.imagens)
    ? notaSelecionada.imagens
    : notaSelecionada.imagem
    ? [notaSelecionada.imagem]
    : [];

  async function carregarObservacoes() {
    if (!notaSelecionada) {
      return;
    }

    setCarregandoObservacoes(true);

    try {
      const resposta = await carregarObservacoesService(notaSelecionada.id);
      setObservacoes(resposta.data);
    } catch (error) {
      setObservacoes([]);
    } finally {
      setCarregandoObservacoes(false);
    }
  }

  async function desbloquearNota() {
    setErroSenha("");

    try {
      const resposta = await desbloquearNotaService(notaSelecionada.id, senha);
      setNotaSelecionada(resposta.data);
      atualizarNotaSelecionada(resposta.data);
      setSenha("");
    } catch (error) {
      setErroSenha(error.response?.data?.erro || "Senha incorreta");
    }
  }

  async function salvarObservacao() {
    if (!textoObservacao.trim() && imagensObservacao.length === 0) {
      return;
    }

    try {
      await criarObservacaoService(notaSelecionada.id, {
        texto: textoObservacao,
        imagens: imagensObservacao
      });
      setTextoObservacao("");
      setImagensObservacao([]);
      await carregarObservacoes();
    } catch (error) {
      alert(error.response?.data?.erro || "Erro ao adicionar observação.");
    }
  }

  async function removerObservacao(observacaoId) {
    try {
      await excluirObservacaoService(notaSelecionada.id, observacaoId);
      await carregarObservacoes();
    } catch (error) {
      alert(error.response?.data?.erro || "Erro ao remover observação.");
    }
  }

  return (
    <div onClick={() => setNotaSelecionada(null)} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 md:p-4">
      <div
        onClick={(event) => event.stopPropagation()}
        className={`w-full max-w-6xl max-h-[92vh] overflow-y-auto rounded-[2rem] border shadow-2xl animate-modal-in ${
          temaEscuro ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-950"
        }`}
      >
        <div className="p-5 md:p-7">
          <div className="flex justify-between items-start gap-4 mb-4">
            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="text-xs rounded-full px-3 py-1 bg-emerald-600/15 text-emerald-400 font-bold">📂 {notaSelecionada.categoria}</span>
                {notaSelecionada.subcategoria && <span className="text-xs rounded-full px-3 py-1 bg-cyan-600/15 text-cyan-300 font-bold">🧩 {notaSelecionada.subcategoria}</span>}
                {notaSelecionada.compartilhada && <span className="text-xs rounded-full px-3 py-1 bg-blue-600/15 text-blue-400 font-bold">🌐 Pública</span>}
                {notaSelecionada.compartilhamentoPrivado && <span className="text-xs rounded-full px-3 py-1 bg-purple-600/15 text-purple-300 font-bold">🔒 Protegida</span>}
                {imagens.length > 0 && <span className="text-xs rounded-full px-3 py-1 bg-violet-600/15 text-violet-300 font-bold">🖼️ {imagens.length} imagem{imagens.length > 1 ? "s" : ""}</span>}
                {!notaSelecionada.minhaNota && <span className="text-xs rounded-full px-3 py-1 bg-amber-500/15 text-amber-400 font-bold">Criada por {notaSelecionada.autorNome}</span>}
              </div>

              <h2 className="text-3xl md:text-4xl font-black break-words">{notaSelecionada.titulo}</h2>
              <p className="text-sm text-slate-500 mt-2">
                {tempoDecorrido(notaSelecionada.criadoEm)}{notaSelecionada.atualizadoEm && " • atualizada"}
              </p>
            </div>

            <button onClick={() => setNotaSelecionada(null)} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-2xl font-black transition-all">✕</button>
          </div>

          {notaSelecionada.bloqueada ? (
            <div className={`rounded-3xl p-5 border mb-5 ${temaEscuro ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
              <h3 className="text-2xl font-black mb-2">Nota pública protegida</h3>
              <p className="text-slate-400 mb-4">Digite a senha informada pelo autor para visualizar o conteúdo desta nota.</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="password"
                  value={senha}
                  onChange={(event) => setSenha(event.target.value)}
                  placeholder="Senha da nota"
                  className={`flex-1 p-4 rounded-2xl border outline-none ${temaEscuro ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200"}`}
                />
                <button onClick={desbloquearNota} className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black">Desbloquear</button>
              </div>
              {erroSenha && <p className="mt-3 text-red-400 font-bold">{erroSenha}</p>}
            </div>
          ) : (
            <>
              <div className={`rounded-3xl p-5 whitespace-pre-wrap break-words leading-relaxed border mb-5 ${temaEscuro ? "bg-slate-900 border-slate-800 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-700"}`}>
                {notaSelecionada.conteudo}
              </div>

              {imagens.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm uppercase tracking-[0.18em] text-emerald-500 font-black mb-3">Imagens anexadas</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {imagens.map((imagem, indice) => (
                      <button
                        key={`${imagem.slice(0, 30)}-${indice}`}
                        type="button"
                        onClick={() => abrirImagem?.({ src: imagem, alt: `Imagem ${indice + 1} da nota ${notaSelecionada.titulo}`, nome: `smart-notes-${notaSelecionada.id}-${indice + 1}` })}
                        className={`group relative w-full rounded-3xl border p-2 cursor-zoom-in transition-all hover:border-emerald-500 ${temaEscuro ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"}`}
                      >
                        <img src={imagem} alt={`Imagem ${indice + 1}`} className="w-full max-h-80 object-contain rounded-2xl" />
                        <span className="absolute inset-x-4 bottom-4 rounded-xl bg-black/70 px-3 py-2 text-xs text-white font-black opacity-0 group-hover:opacity-100 transition-opacity">Toque para ampliar</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {!notaSelecionada.bloqueada && !notaSelecionada.podeEditar && (
            <div className="rounded-2xl p-4 bg-amber-500/10 border border-amber-500/30 text-amber-300 mb-4">
              Essa nota é pública e foi criada por outro usuário. Você pode visualizar e adicionar observações, mas não alterar o conteúdo original.
            </div>
          )}

          {!notaSelecionada.bloqueada && notaSelecionada.compartilhada && (
            <section className={`rounded-3xl border p-4 mb-5 ${temaEscuro ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-xl font-black">Observações da equipe</h3>
                  <p className="text-sm text-slate-400">Adicione comentários ou imagens sem apagar o conteúdo do autor.</p>
                </div>
                {carregandoObservacoes && <span className="text-sm text-emerald-400">Carregando...</span>}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_330px] gap-4 mb-4">
                <textarea
                  value={textoObservacao}
                  onChange={(event) => setTextoObservacao(event.target.value)}
                  rows={5}
                  placeholder="Escreva uma observação sobre esta nota pública..."
                  className={`p-4 rounded-2xl border outline-none resize-y ${temaEscuro ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200"}`}
                />
                <EditorImagens imagens={imagensObservacao} setImagens={setImagensObservacao} temaEscuro={temaEscuro} />
              </div>
              <button onClick={salvarObservacao} className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black mb-4">Adicionar observação</button>

              <div className="space-y-3">
                {observacoes.length === 0 ? (
                  <p className="text-sm text-slate-400">Nenhuma observação adicionada ainda.</p>
                ) : observacoes.map((observacao) => (
                  <article key={observacao.id} className={`rounded-2xl p-4 border ${temaEscuro ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200"}`}>
                    <div className="flex justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3">
                        {observacao.autorFoto ? <img src={observacao.autorFoto} alt={observacao.autorNome} className="w-9 h-9 rounded-full object-cover" /> : <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center font-black text-white">{observacao.autorNome?.charAt(0) || "U"}</div>}
                        <div>
                          <strong>{observacao.autorNome}</strong>
                          <p className="text-xs text-slate-500">{tempoDecorrido(observacao.criadoEm)}</p>
                        </div>
                      </div>
                      {observacao.podeExcluir && <button onClick={() => removerObservacao(observacao.id)} className="text-red-400 font-black">Remover</button>}
                    </div>
                    <p className="whitespace-pre-wrap text-slate-300 mb-3">{observacao.texto}</p>
                    {observacao.imagens?.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {observacao.imagens.map((imagem, indice) => (
                          <button
                            key={`${observacao.id}-${indice}`}
                            type="button"
                            onClick={() => abrirImagem?.({ src: imagem, alt: `Imagem da observação de ${observacao.autorNome}`, nome: `smart-notes-observacao-${observacao.id}-${indice + 1}` })}
                            className="rounded-2xl overflow-hidden border border-emerald-500/30 cursor-zoom-in hover:border-emerald-400 transition-all"
                          >
                            <img src={imagem} alt={`Imagem ${indice + 1} da observação`} className="w-full h-32 object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}

          <div className="flex gap-2 flex-wrap">
            {notaSelecionada.naLixeira ? (
              <>
                {notaSelecionada.podeEditar && <button onClick={() => { restaurarNota(notaSelecionada.id); setNotaSelecionada(null); }} className="bg-green-600 hover:bg-green-700 px-4 py-3 rounded-2xl cursor-pointer text-white font-bold">♻ Restaurar</button>}
                {notaSelecionada.podeExcluir && <button onClick={() => { excluirDefinitivamente(notaSelecionada.id); setNotaSelecionada(null); }} className="bg-red-700 hover:bg-red-800 px-4 py-3 rounded-2xl cursor-pointer text-white font-bold">❌ Excluir definitivamente</button>}
              </>
            ) : (
              <>
                <button onClick={() => alternarFavorita(notaSelecionada.id)} disabled={!notaSelecionada.podeFavoritar} className={`px-4 py-3 rounded-2xl font-bold transition-all ${notaSelecionada.podeFavoritar ? "bg-pink-600 hover:bg-pink-700 text-white cursor-pointer" : "bg-slate-700 text-slate-400 cursor-not-allowed"}`}>{notaSelecionada.favorita ? "💔 Remover favorita" : "❤️ Favoritar"}</button>
                <button onClick={() => alternarFixada(notaSelecionada.id)} disabled={!notaSelecionada.podeFixar} className={`px-4 py-3 rounded-2xl font-bold transition-all ${notaSelecionada.podeFixar ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer" : "bg-slate-700 text-slate-400 cursor-not-allowed"}`}>{notaSelecionada.fixada ? "📍 Desafixar" : "📌 Fixar"}</button>
                {notaSelecionada.podeEditar && <button onClick={() => { abrirModalEditar(notaSelecionada); setNotaSelecionada(null); }} className="bg-yellow-500 hover:bg-yellow-600 px-4 py-3 rounded-2xl cursor-pointer text-black font-bold">✏️ Editar</button>}
                {notaSelecionada.podeExcluir && <button onClick={() => { solicitarExclusao(notaSelecionada); setNotaSelecionada(null); }} className="bg-red-600 hover:bg-red-700 px-4 py-3 rounded-2xl cursor-pointer text-white font-bold">🗑️ Excluir</button>}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModalNota;
