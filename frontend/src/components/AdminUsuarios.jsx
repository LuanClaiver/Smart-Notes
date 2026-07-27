import { useEffect, useState } from "react";
import {
  alterarSenhaUsuarioAdminService,
  editarUsuarioAdminService,
  listarUsuariosAdminService
} from "../services/authService";

function AdminUsuarios({ temaEscuro, usuarioAtual }) {
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  async function carregarUsuarios() {
    setCarregando(true);
    setErro("");

    try {
      const resposta = await listarUsuariosAdminService();
      setUsuarios(resposta.data);
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

    try {
      await alterarSenhaUsuarioAdminService(usuario.id, { novaSenha });
      setMensagem("Senha alterada pelo administrador.");
    } catch (error) {
      setErro(error.response?.data?.erro || "Erro ao alterar senha.");
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
        </div>
        <button onClick={carregarUsuarios} className="px-5 py-3 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-black">Atualizar</button>
      </div>

      {mensagem && <div className="rounded-2xl p-4 mb-4 bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 font-bold">{mensagem}</div>}
      {erro && <div className="rounded-2xl p-4 mb-4 bg-red-500/10 border border-red-500/40 text-red-400 font-bold">{erro}</div>}

      {carregando ? (
        <div className="p-8 text-center text-slate-400">Carregando usuários...</div>
      ) : (
        <div className="space-y-4">
          {usuarios.map((usuario) => (
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
                  <input type="checkbox" checked={usuario.ativo} disabled={usuario.id === usuarioAtual.id} onChange={(event) => atualizarCampo(usuario.id, "ativo", event.target.checked)} /> Ativo
                </label>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                <button onClick={() => salvarUsuario(usuario)} className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black">Salvar</button>
                <button onClick={() => redefinirSenha(usuario)} className="px-4 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black">Redefinir senha</button>
                <span className="px-4 py-2 rounded-2xl bg-slate-700/60 text-slate-300 text-sm">Criado: {new Date(usuario.criadoEm).toLocaleDateString()}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default AdminUsuarios;
