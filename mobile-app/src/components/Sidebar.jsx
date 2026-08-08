import { useEffect, useMemo, useState } from "react";

function Sidebar({
  menuAberto,
  setMenuAberto,
  temaEscuro,
  setTemaEscuro,
  abaAtiva,
  telaAtual,
  telaConfiguracoes, telaPendencias, abrirPendencias,
  selecionarAba,
  voltarParaInicio,
  categoriaSelecionada,
  setCategoriaSelecionada,
  subcategoriaSelecionada,
  setSubcategoriaSelecionada,
  setTelaConfiguracoes,
  setTelaPendencias,
  categorias,
  subcategorias,
  notas,
  limparPesquisa,
  usuario,
  abrirPerfil,
  sair
}) {
  const [pastasExpandidas, setPastasExpandidas] = useState({});

  useEffect(() => {
    function fecharComEsc(event) {
      if (event.key === "Escape" && menuAberto) {
        setMenuAberto(false);
      }
    }

    document.addEventListener("keydown", fecharComEsc);
    return () => document.removeEventListener("keydown", fecharComEsc);
  }, [menuAberto, setMenuAberto]);

  const categoriasComTodas = useMemo(() => {
    return [
      { id: "todas", nome: "Todas", icone: "📋" },
      ...categorias
    ];
  }, [categorias]);

  function notaPertenceAba(nota) {
    if (abaAtiva === "lixeira") {
      return nota.naLixeira;
    }

    if (nota.naLixeira) {
      return false;
    }

    if (abaAtiva === "minhas") {
      return nota.minhaNota;
    }

    if (abaAtiva === "compartilhadas") {
      return nota.compartilhada;
    }

    if (abaAtiva === "favoritas") {
      return nota.favorita === true;
    }

    return !nota.naLixeira;
  }

  function abrirAba(aba) {
    selecionarAba(aba);
    setMenuAberto(false);
  }

  function resetarFiltros() {
    limparPesquisa();
    setTelaConfiguracoes(false);
    setTelaPendencias(false);
  }

  function selecionarCategoria(categoria, subcategoria = "", fecharMenu = true) {
    resetarFiltros();
    selecionarAba(abaAtiva);
    setCategoriaSelecionada(categoria);
    setSubcategoriaSelecionada(subcategoria);

    if (categoria !== "Todas") {
      setPastasExpandidas((atual) => ({
        ...atual,
        [categoria]: true
      }));
    }

    if (fecharMenu) {
      setMenuAberto(false);
    }
  }

  function alternarPasta(categoria) {
    setPastasExpandidas((atual) => ({
      ...atual,
      [categoria]: !atual[categoria]
    }));
  }

  function totalCategoria(categoria, subcategoria = "") {
    return notas.filter((nota) => {
      if (!notaPertenceAba(nota)) return false;
      if (categoria === "Todas") return true;
      if (nota.categoria !== categoria) return false;
      if (subcategoria && nota.subcategoria !== subcategoria) return false;
      return true;
    }).length;
  }

  const paginaInicialAtiva = telaAtual === "inicio" && !telaConfiguracoes && !telaPendencias;
  const paginaConfiguracoesAtiva = Boolean(telaConfiguracoes);

  function classeMenuPrincipal(ativo, destaque = "emerald") {
    if (ativo) {
      return destaque === "amber"
        ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 ring-2 ring-amber-300/40"
        : "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 ring-2 ring-emerald-300/30";
    }
    return temaEscuro
      ? "bg-slate-900 hover:bg-slate-800 text-white"
      : "bg-slate-100 hover:bg-slate-200 text-slate-950";
  }

  const abas = [
    { id: "minhas", texto: "Minhas notas", icone: "🗂️", total: notas.filter((nota) => nota.minhaNota && !nota.naLixeira).length },
    { id: "compartilhadas", texto: "Comunidade", icone: "🤝", total: notas.filter((nota) => nota.compartilhada && !nota.naLixeira).length },
    { id: "favoritas", texto: "Favoritas", icone: "❤️", total: notas.filter((nota) => nota.favorita && !nota.naLixeira).length }
  ];

  return (
    <aside
      className={`fixed top-0 left-0 h-full w-[90vw] max-w-[26rem] p-5 z-50 transition-all duration-300 shadow-2xl overflow-y-auto md:sticky md:top-6 md:h-[calc(100vh-3rem)] md:w-[21rem] md:max-w-none md:translate-x-0 md:shrink-0 md:rounded-[2rem] md:border ${
        menuAberto ? "translate-x-0" : "-translate-x-full"
      } ${temaEscuro ? "bg-slate-950/98 border-r border-slate-800 text-white" : "bg-white border-r border-slate-200 text-slate-950"}`}
    >
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="grid grid-cols-[3rem_minmax(0,1fr)_3rem] items-center gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => {
              voltarParaInicio();
              setMenuAberto(false);
            }}
            aria-label="Voltar para a tela inicial"
            title="Voltar para a tela inicial"
            className="w-12 h-12 shrink-0 rounded-2xl transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <img src="/smart-notes-logo.svg" alt="Logo Smart Notes" className="w-12 h-12 rounded-2xl shadow-lg" />
          </button>

          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-500 font-black truncate">Smart Notes</p>
            <h2 className="text-2xl font-black leading-tight">Menu</h2>
          </div>

          <button
            type="button"
            onClick={() => {
              voltarParaInicio();
              setMenuAberto(false);
            }}
            aria-label="Ir para a tela inicial"
            title="Tela inicial"
            aria-current={paginaInicialAtiva ? "page" : undefined}
            className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center text-[1.9rem] leading-none transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
              paginaInicialAtiva
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                : temaEscuro
                  ? "bg-slate-900 hover:bg-slate-800 text-slate-200"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-800"
            }`}
          >
            🏠
          </button>
        </div>
        <button onClick={() => setMenuAberto(false)} className="md:hidden bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-2xl text-white font-black transition-all">✕</button>
      </div>

      <div className={`rounded-3xl p-4 mb-5 border ${temaEscuro ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
        <div className="flex gap-3 items-center">
          {usuario?.fotoPerfil ? (
            <img src={usuario.fotoPerfil} alt={usuario.nome} className="w-14 h-14 rounded-2xl object-cover border border-emerald-500/30" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-white text-2xl font-black">{usuario?.nome?.charAt(0) || "U"}</div>
          )}
          <div className="min-w-0">
            <p className="text-xs text-slate-400">Usuário logado</p>
            <strong className="block truncate text-lg">{usuario?.nome}</strong>
            <p className="text-xs text-emerald-400 truncate">@{usuario?.usuario}</p>
            <p className="text-xs text-slate-500 truncate">{usuario?.email}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap mt-4">
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${usuario?.admin ? "bg-amber-400 text-slate-950" : "bg-emerald-600 text-white"}`}>{usuario?.admin ? "ADMIN" : "USUÁRIO"}</span>
          <button onClick={abrirPerfil} className="rounded-full px-3 py-1 text-xs font-black bg-slate-700 hover:bg-slate-600 text-white">Editar perfil</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-5">
        <button onClick={() => setTemaEscuro(!temaEscuro)} className={`p-3 rounded-2xl font-black transition-all ${temaEscuro ? "bg-slate-800 hover:bg-slate-700 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-950"}`}>{temaEscuro ? "☀ Claro" : "🌙 Escuro"}</button>
        <button onClick={sair} className="p-3 rounded-2xl font-black bg-red-600 hover:bg-red-700 text-white transition-all">Sair</button>
      </div>

      <button onClick={abrirPendencias} className={`w-full mb-2 p-4 rounded-2xl font-black text-left transition-all ${classeMenuPrincipal(telaPendencias)}`}>✅ Pendências</button>

      <button
        onClick={() => {
          resetarFiltros();
                setTelaConfiguracoes(true);
          setTelaPendencias(false);
          setMenuAberto(false);
        }}
        aria-current={paginaConfiguracoesAtiva ? "page" : undefined}
        className={`w-full p-3 rounded-2xl cursor-pointer transition-all font-black mb-5 ${classeMenuPrincipal(paginaConfiguracoesAtiva)}`}
      >
        ⚙️ Configurações {paginaConfiguracoesAtiva && <span className="float-right">●</span>}
      </button>

      <h3 className="text-sm uppercase tracking-[0.18em] text-slate-400 font-black mb-3">Abas</h3>
      <div className="space-y-2 mb-5">
        {abas.map((aba) => (
          <button
            key={aba.id}
            onClick={() => abrirAba(aba.id)}
            className={`w-full text-left p-3 rounded-2xl cursor-pointer transition-all hover:-translate-y-0.5 ${
              telaAtual === "notas" && !telaConfiguracoes && abaAtiva === aba.id
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 ring-2 ring-emerald-300/30"
                : temaEscuro ? "bg-slate-900 hover:bg-slate-800 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-950"
            }`}
          >
            <span className="mr-2">{aba.icone}</span>{aba.texto}
            <span className="float-right opacity-70">{aba.total}</span>
          </button>
        ))}

        <button
          onClick={() => abrirAba("lixeira")}
          className={`w-full text-left px-3 py-2 rounded-2xl cursor-pointer transition-all text-sm ${
            telaAtual === "notas" && !telaConfiguracoes && abaAtiva === "lixeira"
              ? "bg-red-600 text-white shadow-lg shadow-red-600/20 ring-2 ring-red-300/30"
              : temaEscuro ? "bg-slate-900/70 hover:bg-slate-800 text-slate-300" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
          }`}
        >
          🗑️ Lixeira
          <span className="float-right opacity-70">{notas.filter((nota) => nota.naLixeira).length}</span>
        </button>
      </div>

      <h3 className="text-sm uppercase tracking-[0.18em] text-slate-400 font-black mb-3">Pastas da aba</h3>

      {categoriasComTodas.map((categoria) => {
        const subcategoriasDaPasta = subcategorias.filter((item) => item.categoria === categoria.nome);
        const temSubcategorias = categoria.nome !== "Todas" && subcategoriasDaPasta.length > 0;
        const temEstadoExpansao = Object.prototype.hasOwnProperty.call(pastasExpandidas, categoria.nome);
        const pastaAberta = temEstadoExpansao ? pastasExpandidas[categoria.nome] : categoriaSelecionada === categoria.nome;

        return (
          <div key={categoria.id || categoria.nome} className="mb-2">
            <div
              className={`flex items-center gap-2 rounded-2xl transition-all ${
                telaAtual === "notas" && !telaConfiguracoes && categoriaSelecionada === categoria.nome && !subcategoriaSelecionada
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 ring-2 ring-emerald-300/30"
                  : temaEscuro ? "bg-slate-900 hover:bg-slate-800 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-950"
              }`}
            >
              <button
                type="button"
                onClick={() => selecionarCategoria(categoria.nome)}
                className="flex-1 min-w-0 text-left p-3 rounded-2xl cursor-pointer transition-all font-black"
              >
                <span className="mr-2">{categoria.icone}</span>{categoria.nome}
                <span className="float-right opacity-70">{totalCategoria(categoria.nome)}</span>
              </button>

              {temSubcategorias && (
                <button
                  type="button"
                  title={pastaAberta ? "Recolher subcategorias" : "Mostrar subcategorias"}
                  onClick={(event) => {
                    event.stopPropagation();
                    alternarPasta(categoria.nome);
                  }}
                  className={`mr-2 h-10 w-10 rounded-xl flex items-center justify-center font-black transition-all ${
                    temaEscuro ? "bg-slate-800/80 hover:bg-slate-700" : "bg-white/80 hover:bg-white"
                  }`}
                >
                  {pastaAberta ? "⌃" : "⌄"}
                </button>
              )}
            </div>

            {temSubcategorias && pastaAberta && (
              <div className="mt-2 ml-4 space-y-2">
                {subcategoriasDaPasta.map((subcategoria) => (
                  <button
                    key={subcategoria.id}
                    onClick={() => selecionarCategoria(categoria.nome, subcategoria.nome)}
                    className={`w-full min-w-0 text-left px-3 py-2 rounded-xl text-sm transition-all ${
                      telaAtual === "notas" && !telaConfiguracoes && subcategoriaSelecionada === subcategoria.nome && categoriaSelecionada === categoria.nome
                        ? "bg-cyan-600 text-white ring-2 ring-cyan-300/30"
                        : temaEscuro ? "bg-slate-900/70 hover:bg-slate-800 text-slate-300" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    🧩 {subcategoria.nome}
                    <span className="float-right opacity-70">{totalCategoria(categoria.nome, subcategoria.nome)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

    </aside>
  );
}

export default Sidebar;
