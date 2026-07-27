import { useEffect, useRef, useState } from "react";
import {
  exportarBancoService,
  importarBancoService,
  listarBackupsService
} from "../services/backupService";

function Configuracoes({ temaEscuro, usuario, onBancoImportado }) {
  const [backups, setBackups] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
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

  async function executar(acao, sucesso) {
    setCarregando(true);
    setErro("");
    setMensagem("");
    try {
      const resultado = await acao();
      setMensagem(typeof sucesso === "function" ? sucesso(resultado) : sucesso);
      await carregarBackups();
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
    const confirmar = window.confirm("Importar este banco substituirá todos os usuários, notas e categorias atuais. Um backup de segurança será criado antes. Continuar?");
    if (!confirmar) return;
    const resultado = await executar(
      () => importarBancoService(arquivo),
      (dados) => `${dados.mensagem} Backup de segurança: ${dados.backupSeguranca}.`
    );
    if (resultado?.reiniciando) {
      setTimeout(() => onBancoImportado?.(), 900);
    }
  }

  const painel = temaEscuro ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200";

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
      </article>

      <article className={`rounded-[2rem] border p-5 md:p-7 ${painel}`}>
        <h3 className="text-xl font-black">Privacidade das notas</h3>
        <p className="text-sm text-slate-400 mt-3 leading-relaxed">
          Notas privadas aparecem somente para o autor e administradores. Notas públicas aparecem na Comunidade para os demais usuários. Também é possível proteger uma nota pública com senha.
        </p>
      </article>

      {usuario?.admin && (
        <article className={`rounded-[2rem] border p-5 md:p-7 ${painel}`}>
          <h3 className="text-xl font-black">Backup e banco de dados</h3>
          <p className="text-sm text-slate-400 mt-3">Os backups automáticos continuam ativos internamente. Exporte uma cópia completa ou restaure um banco anterior.</p>

          {mensagem && <div className="mt-4 rounded-2xl p-4 bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 font-bold">{mensagem}</div>}
          {erro && <div className="mt-4 rounded-2xl p-4 bg-red-500/10 border border-red-500/40 text-red-400 font-bold">{erro}</div>}

          <div className="flex flex-wrap gap-3 mt-5">
            <button disabled={carregando} onClick={() => executar(exportarBancoService, (dados) => `Banco exportado: ${dados.nome} (${Math.max(1, Math.round(dados.tamanho / 1024))} KB).`)} className="smart-action-button">Exportar banco</button>
            <button disabled={carregando} onClick={() => inputRef.current?.click()} className="smart-action-button">Importar banco</button>
            <input ref={inputRef} type="file" accept=".db,application/vnd.sqlite3,application/octet-stream" onChange={importar} className="hidden" />
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
    </section>
  );
}

export default Configuracoes;
