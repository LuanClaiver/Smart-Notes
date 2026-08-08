import { useEffect, useRef, useState } from "react";
import AdminSubcategorias from "./AdminSubcategorias";
import AdminUsuarios from "./AdminUsuarios";
import {
  aguardarReinicioServidorService,
  exportarBancoService,
  importarBancoService,
  listarBackupsService
} from "../services/backupService";

function Configuracoes({
  temaEscuro,
  usuario,
  onBancoImportado,
  categorias = [],
  subcategorias = [],
  criarSubcategoria,
  editarSubcategoria,
  excluirSubcategoria
}) {
  const [backups, setBackups] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [secao, setSecao] = useState("geral");
  const inputRef = useRef(null);

  async function carregarBackups() {
    if (!usuario?.admin) return;
    try {
      setBackups(await listarBackupsService());
    } catch (falha) {
      setErro(falha.message);
    }
  }

  useEffect(() => {
    carregarBackups();
  }, [usuario?.admin]);

  useEffect(() => {
    if (!usuario?.admin && secao !== "geral") setSecao("geral");
  }, [usuario?.admin, secao]);

  async function executar(acao, sucesso) {
    setCarregando(true);
    setErro("");
    setMensagem("");
    try {
      const resultado = await acao();
      setMensagem(typeof sucesso === "function" ? sucesso(resultado) : sucesso);
      if (!resultado?.sessaoEncerrada) await carregarBackups();
      return resultado;
    } catch (falha) {
      setErro(falha.message || "Não foi possível concluir a operação.");
      return null;
    } finally {
      setCarregando(false);
    }
  }

  async function importar(event) {
    const arquivo = event.target.files?.[0];
    event.target.value = "";
    if (!arquivo) return;
    const confirmar = window.confirm("Importar este arquivo substituirá os dados atuais. Você pode selecionar um banco .db do computador ou um backup .json exportado pelo celular. Um backup de segurança será criado antes. Continuar?");
    if (!confirmar) return;
    const resultado = await executar(
      () => importarBancoService(arquivo),
      (dados) => `${dados.mensagem} Backup de segurança: ${dados.backupSeguranca}.`
    );
    if (resultado?.reiniciando) {
      setCarregando(true);
      setMensagem("Banco validado. Aplicando a restauração e reiniciando o servidor...");
      try {
        await aguardarReinicioServidorService();
        onBancoImportado?.();
      } catch (falha) {
        setMensagem("");
        setErro(falha.message || "O servidor não reiniciou após a importação.");
      } finally {
        setCarregando(false);
      }
    } else if (resultado?.sessaoEncerrada) {
      setErro("");
      setMensagem("Backup do celular convertido e importado. Voltando ao login para carregar os dados restaurados...");
      window.setTimeout(() => onBancoImportado?.(), 700);
    }
  }

  const painel = temaEscuro ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200";
  const botaoSecao = (id) => secao === id
    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
    : temaEscuro
      ? "bg-slate-800 hover:bg-slate-700 text-slate-200"
      : "bg-slate-100 hover:bg-slate-200 text-slate-800";

  return (
    <section className="space-y-5 animate-fade-in">
      <article className={`rounded-[2rem] border p-5 md:p-7 shadow-2xl ${painel}`}>
        <p className="text-xs uppercase tracking-[0.25em] text-emerald-500 font-black">Configurações</p>
        <h2 className="text-2xl md:text-3xl font-black mt-1">Conta e funcionamento</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
          <div className={`rounded-2xl border p-4 ${temaEscuro ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
            <span className="text-xs text-slate-400">Nome</span><strong className="block mt-1">{usuario?.nome}</strong>
          </div>
          <div className={`rounded-2xl border p-4 ${temaEscuro ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
            <span className="text-xs text-slate-400">Usuário</span><strong className="block mt-1">@{usuario?.usuario}</strong>
          </div>
          <div className={`rounded-2xl border p-4 ${temaEscuro ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
            <span className="text-xs text-slate-400">Permissão</span><strong className="block mt-1">{usuario?.admin ? "Administrador" : "Usuário"}</strong>
          </div>
        </div>

        {usuario?.admin && (
          <div className={`mt-6 pt-5 border-t ${temaEscuro ? "border-slate-800" : "border-slate-200"}`}>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400 font-black mb-3">Administração</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button type="button" onClick={() => setSecao("geral")} className={`p-3 rounded-2xl font-black transition-all ${botaoSecao("geral")}`}>⚙️ Geral</button>
              <button type="button" onClick={() => setSecao("usuarios")} className={`p-3 rounded-2xl font-black transition-all ${botaoSecao("usuarios")}`}>👑 Gerenciar usuários</button>
              <button type="button" onClick={() => setSecao("subcategorias")} className={`p-3 rounded-2xl font-black transition-all ${botaoSecao("subcategorias")}`}>🧩 Subcategorias</button>
            </div>
          </div>
        )}
      </article>

      {secao === "usuarios" && usuario?.admin ? (
        <AdminUsuarios temaEscuro={temaEscuro} usuarioAtual={usuario} />
      ) : secao === "subcategorias" && usuario?.admin ? (
        <AdminSubcategorias
          temaEscuro={temaEscuro}
          categorias={categorias}
          subcategorias={subcategorias}
          criarSubcategoria={criarSubcategoria}
          editarSubcategoria={editarSubcategoria}
          excluirSubcategoria={excluirSubcategoria}
        />
      ) : (
        <>
          <article className={`rounded-[2rem] border p-5 md:p-7 ${painel}`}>
            <h3 className="text-xl font-black">Privacidade das notas</h3>
            <p className="text-sm text-slate-400 mt-3 leading-relaxed">
              Notas privadas aparecem somente para o autor e administradores. Notas públicas aparecem na Comunidade para os demais usuários. Também é possível proteger uma nota pública com senha.
            </p>
          </article>

          {usuario?.admin && (
            <article className={`rounded-[2rem] border p-5 md:p-7 ${painel}`}>
              <h3 className="text-xl font-black">Backup e banco de dados</h3>
              <p className="text-sm text-slate-400 mt-3">Os backups automáticos continuam ativos internamente. Importe bancos .db do computador ou backups .json exportados pelo Smart Notes no celular.</p>

              {mensagem && <div className="mt-4 rounded-2xl p-4 bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 font-bold">{mensagem}</div>}
              {erro && <div className="mt-4 rounded-2xl p-4 bg-red-500/10 border border-red-500/40 text-red-400 font-bold">{erro}</div>}

              <div className="flex flex-wrap gap-3 mt-5">
                <button disabled={carregando} onClick={() => executar(exportarBancoService, (dados) => `Banco exportado: ${dados.nome} (${Math.max(1, Math.round(dados.tamanho / 1024))} KB).`)} className="smart-action-button">Exportar banco</button>
                <button disabled={carregando} onClick={() => inputRef.current?.click()} className="smart-action-button">Importar banco</button>
                <input ref={inputRef} type="file" accept=".db,.json,application/json,application/vnd.sqlite3,application/octet-stream" onChange={importar} className="hidden" />
              </div>

              <div className="mt-5 divide-y divide-emerald-500/15">
                {backups.slice(0, 8).map((item) => (
                  <div key={item.nome} className="py-3 flex items-center justify-between gap-3 text-sm">
                    <span className="truncate">{item.nome}</span>
                    <span className="shrink-0 text-slate-400">{Math.max(1, Math.round(item.tamanho / 1024))} KB</span>
                  </div>
                ))}
                {backups.length === 0 && <p className="py-4 text-sm text-slate-400">Nenhum backup automático registrado ainda.</p>}
              </div>
            </article>
          )}
        </>
      )}
    </section>
  );
}

export default Configuracoes;
