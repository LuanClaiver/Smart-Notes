import { useEffect, useState } from "react";
import {
  alterarSenhaUsuarioAdminService,
  editarUsuarioAdminService,
  excluirUsuarioAdminService,
  listarUsuariosAdminService
} from "../services/authService";

function AdminUsuarios({ temaEscuro, usuarioAtual }) {
  const [usuarios, setUsuarios] = useState([]);
  const [destinosExclusao, setDestinosExclusao] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  async function carregarUsuarios() {
    setCarregando(true);
    setErro("");

    try {
      const resposta = await listarUsuariosAdminService();
      const lista = resposta.data || [];
      setUsuarios(lista);
      setDestinosExclusao((atuais) => {
        const proximos = { ...atuais };

        for (const conta of lista) {
          if (Number(conta.id) === Number(usuarioAtual.id)) continue;
          const destinosValidos = lista.filter((item) => item.ativo && Number(item.id) !== Number(conta.id));
          const atualValido = destinosValidos.some((item) => Number(item.id) === Number(proximos[conta.id]));
          if (!atualValido) {
            proximos[conta.id] = destinosValidos.find((item) => Number(item.id) === Number(usuarioAtual.id))?.id
              || destinosValidos[0]?.id
              || "";
          }
        }

        return proximos;
      });
    } catch (error) {
      setErro(error.response?.data?.erro || "Erro ao carregar usuários.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarUsuarios();
  }, []);

  async function salvarUsuario(usuario) {
    setMensagem("");
    setErro("");

    try {
      await editarUsuarioAdminService(usuario.id, usuario);
      setMensagem("Usuário atualizado com sucesso.");
      await carregarUsuarios();
    } catch (error) {
      setErro(error.response?.data?.erro || "Erro ao atualizar usuário.");
    }
  }

  async function redefinirSenha(usuario) {
    const novaSenha = window.prompt(`Nova senha para ${usuario.nome}`);

    if (!novaSenha) {
      return;
    }

    setMensagem("");
    setErro("");

    try {
      await alterarSenhaUsuarioAdminService(usuario.id, { novaSenha });
      setMensagem("Senha alterada pelo administrador.");
    } catch (error) {
      setErro(error.response?.data?.erro || "Erro ao alterar senha.");
    }
  }

  async function excluirUsuario(usuario) {
    if (Number(usuario.id) === Number(usuarioAtual.id)) {
      setErro("Você não pode excluir o usuário que está conectado.");
      return;
    }

    const responsavelId = Number(destinosExclusao[usuario.id] || usuarioAtual.id);
    const responsavel = usuarios.find((item) => Number(item.id) === responsavelId && item.ativo);

    if (!responsavel) {
      setErro("Selecione um responsável ativo para receber as notas desse usuário.");
      return;
    }

    const totalNotas = Number(usuario.totalNotas || 0);
    const avisoNotas = totalNotas > 0
      ? `\n\n${totalNotas} nota(s) serão transferidas para ${responsavel.nome}.`
      : "";
    const confirmar = window.confirm(
      `Excluir definitivamente o usuário \"${usuario.nome}\"?${avisoNotas}\n\nSessões, favoritos e observações próprias desse usuário também serão removidos.`
    );

    if (!confirmar) return;

    setMensagem("");
    setErro("");

    try {
      const resposta = await excluirUsuarioAdminService(usuario.id, { responsavelId });
      setMensagem(resposta.data?.mensagem || "Usuário excluído com sucesso.");
      await carregarUsuarios();
    } catch (error) {
      setErro(error.response?.data?.erro || "Erro ao excluir usuário.");
    }
  }

  function atualizarCampo(id, campo, valor) {
    setUsuarios(usuarios.map((usuario) => usuario.id === id ? { ...usuario, [campo]: valor } : usuario));
  }

  return (
    <section className={`rounded-[2rem] border p-5 md:p-7 shadow-2xl animate-fade-in ${temaEscuro ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200"}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-amber-400 font-black">Administrador</p>
          <h2 className="text-2xl md:text-3xl font-black mt-1">Gerenciar usuários</h2>
          <p className="text-sm text-slate-400 mt-2">Edite contas, redefina senhas e transfira as notas antes de excluir um usuário.</p>
        </div>
        <button onClick={carregarUsuarios} className="px-5 py-3 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-black">Atualizar</button>
      </div>

      {mensagem && <div className="rounded-2xl p-4 mb-4 bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 font-bold">{mensagem}</div>}
      {erro && <div className="rounded-2xl p-4 mb-4 bg-red-500/10 border border-red-500/40 text-red-400 font-bold">{erro}</div>}

      {carregando ? (
        <div className="p-8 text-center text-slate-400">Carregando usuários...</div>
      ) : (
        <div className="space-y-4">
          {usuarios.map((usuario) => {
            const destinos = usuarios.filter((item) => item.ativo && Number(item.id) !== Number(usuario.id));
            const usuarioAtualConectado = Number(usuario.id) === Number(usuarioAtual.id);

            return (
              <article key={usuario.id} className={`rounded-3xl border p-4 ${temaEscuro ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.8fr_1fr_150px_110px] gap-3 items-center">
                  <input value={usuario.nome} onChange={(event) => atualizarCampo(usuario.id, "nome", event.target.value)} placeholder="Nome de exibição" maxLength={80} className={`p-3 rounded-2xl border outline-none ${temaEscuro ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`} />
                  <input value={usuario.usuario || ""} onChange={(event) => atualizarCampo(usuario.id, "usuario", event.target.value)} placeholder="Nome de usuário" minLength={3} maxLength={30} spellCheck="false" className={`p-3 rounded-2xl border outline-none ${temaEscuro ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`} />
                  <input value={usuario.email} onChange={(event) => atualizarCampo(usuario.id, "email", event.target.value)} className={`p-3 rounded-2xl border outline-none ${temaEscuro ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`} />
                  <select value={usuario.tipoUsuario} onChange={(event) => atualizarCampo(usuario.id, "tipoUsuario", event.target.value)} className={`p-3 rounded-2xl border outline-none ${temaEscuro ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
                    <option value="usuario">Usuário</option>
                    <option value="admin">Admin</option>
                  </select>
                  <label className="flex gap-2 items-center font-bold">
                    <input type="checkbox" checked={usuario.ativo} disabled={usuarioAtualConectado} onChange={(event) => atualizarCampo(usuario.id, "ativo", event.target.checked)} /> Ativo
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <button onClick={() => salvarUsuario(usuario)} className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black">Salvar</button>
                  <button onClick={() => redefinirSenha(usuario)} className="px-4 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black">Redefinir senha</button>
                  <span className="px-4 py-2 rounded-2xl bg-slate-700/60 text-slate-300 text-sm">Notas: {Number(usuario.totalNotas || 0)}</span>
                  <span className="px-4 py-2 rounded-2xl bg-slate-700/60 text-slate-300 text-sm">Criado: {new Date(usuario.criadoEm).toLocaleDateString()}</span>
                </div>

                {!usuarioAtualConectado && (
                  <div className={`mt-4 rounded-2xl border p-3 ${temaEscuro ? "border-red-500/25 bg-red-950/20" : "border-red-200 bg-red-50"}`}>
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 items-end">
                      <label className="grid gap-2 text-sm font-bold">
                        Transferir as notas para
                        <select
                          value={destinosExclusao[usuario.id] || ""}
                          onChange={(event) => setDestinosExclusao((atual) => ({ ...atual, [usuario.id]: Number(event.target.value) }))}
                          className={`p-3 rounded-2xl border outline-none ${temaEscuro ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}
                        >
                          {destinos.map((item) => <option key={item.id} value={item.id}>{item.nome} (@{item.usuario})</option>)}
                        </select>
                      </label>
                      <button
                        type="button"
                        onClick={() => excluirUsuario(usuario)}
                        disabled={destinos.length === 0}
                        className="px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black"
                      >
                        Excluir usuário
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default AdminUsuarios;
