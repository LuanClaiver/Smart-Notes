function BottomNav({ abaAtiva, telaAtual, telaConfiguracoes, telaPendencias, menuAberto, onInicio, onAba, onPendencias, onConfiguracoes, onMenu }) {
  const itens = [
    { id: "inicio", icone: "⌂", texto: "Início", acao: onInicio, ativo: telaAtual === "inicio" && !telaConfiguracoes && !telaPendencias },
    { id: "minhas", icone: "▣", texto: "Minhas", acao: () => onAba("minhas"), ativo: telaAtual === "notas" && abaAtiva === "minhas" },
    { id: "pendencias", icone: "✓", texto: "Pendências", acao: onPendencias, ativo: telaPendencias },
    { id: "config", icone: "⚙", texto: "Ajustes", acao: onConfiguracoes, ativo: telaConfiguracoes },
    { id: "mais", icone: "☰", texto: "Mais", acao: onMenu, ativo: Boolean(menuAberto) }
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-emerald-500/20 bg-slate-950/95 backdrop-blur-xl px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
      <div className="grid grid-cols-5 gap-1 max-w-xl mx-auto">
        {itens.map((item) => (
          <button key={item.id} type="button" onClick={item.acao} className={`flex flex-col items-center justify-center gap-1 min-h-14 rounded-2xl text-[11px] font-black transition-all ${item.ativo ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" : "text-slate-400 hover:bg-slate-900 hover:text-white"}`}>
            <span className="text-xl leading-none">{item.icone}</span>
            <span>{item.texto}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

export default BottomNav;
