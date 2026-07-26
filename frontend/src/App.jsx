import { useEffect, useMemo, useState } from "react";
import {
  alternarFavoritaService,
  alternarFixadaService,
  carregarCategoriasService,
  carregarNotasService,
  criarNotaService,
  criarSubcategoriaService,
  excluirSubcategoriaService,
  editarNotaService,
  excluirDefinitivamenteService,
  excluirNotaService,
  restaurarNotaService
} from "./services/notasService";
import { atualizarPerfilService, logoutService, usuarioAtualService } from "./services/authService";
import AdminUsuarios from "./components/AdminUsuarios";
import TelaInicial from "./components/TelaInicial";
import FormularioNota from "./components/FormularioNota";
import LoginPage from "./components/LoginPage";
import ModalEditar from "./components/ModalEditar";
import ModalExcluir from "./components/ModalExcluir";
import ModalNota from "./components/ModalNota";
import ModalPerfil from "./components/ModalPerfil";
import NotaCard from "./components/NotaCard";
import Sidebar from "./components/Sidebar";
import Configuracoes from "./components/Configuracoes";
import BottomNav from "./components/BottomNav";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [categoria, setCategoria] = useState("Atendimentos");
  const [subcategoria, setSubcategoria] = useState("");
  const [compartilhada, setCompartilhada] = useState(false);
  const [compartilhamentoPrivado, setCompartilhamentoPrivado] = useState(false);
  const [senhaCompartilhamento, setSenhaCompartilhamento] = useState("");
  const [imagens, setImagens] = useState([]);
  const [notas, setNotas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [subcategorias, setSubcategorias] = useState([]);
  const [pesquisa, setPesquisa] = useState("");
  const [abaAtiva, setAbaAtiva] = useState("minhas");
  const [telaAtual, setTelaAtual] = useState("inicio");
  const [categoriaSelecionada, setCategoriaSelecionada] = useState("Todas");
  const [subcategoriaSelecionada, setSubcategoriaSelecionada] = useState("");
  const [mostrarFavoritas, setMostrarFavoritas] = useState(false);
  const [mostrarFixadas, setMostrarFixadas] = useState(false);
  const [mostrarLixeira, setMostrarLixeira] = useState(false);
  const [mostrarCompartilhadas, setMostrarCompartilhadas] = useState(false);
  const [telaAdminUsuarios, setTelaAdminUsuarios] = useState(false);
  const [telaConfiguracoes, setTelaConfiguracoes] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [notaSelecionada, setNotaSelecionada] = useState(null);
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [notaEditando, setNotaEditando] = useState(null);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalExcluir, setModalExcluir] = useState(false);
  const [modalPerfil, setModalPerfil] = useState(false);
  const [notaParaExcluir, setNotaParaExcluir] = useState(null);
  const [carregandoAuth, setCarregandoAuth] = useState(true);
  const [carregandoNotas, setCarregandoNotas] = useState(false);

  const [temaEscuro, setTemaEscuro] = useState(() => {
    const temaSalvo = localStorage.getItem("temaEscuro");
    return temaSalvo ? JSON.parse(temaSalvo) : true;
  });

  const [token, setToken] = useState(() => localStorage.getItem("smartNotesToken"));

  const [usuario, setUsuario] = useState(() => {
    const usuarioSalvo = localStorage.getItem("smartNotesUsuario");
    return usuarioSalvo ? JSON.parse(usuarioSalvo) : null;
  });

  function salvarSessao(novoToken, novoUsuario) {
    localStorage.setItem("smartNotesToken", novoToken);
    localStorage.setItem("smartNotesUsuario", JSON.stringify(novoUsuario));
    setToken(novoToken);
    setUsuario(novoUsuario);
    toast.success(`Bem-vindo, ${novoUsuario.nome}!`);
  }

  function atualizarUsuarioLocal(novoUsuario) {
    localStorage.setItem("smartNotesUsuario", JSON.stringify(novoUsuario));
    setUsuario(novoUsuario);
  }

  function limparSessao() {
    localStorage.removeItem("smartNotesToken");
    localStorage.removeItem("smartNotesUsuario");
    setToken(null);
    setUsuario(null);
    setNotas([]);
    setNotaSelecionada(null);
    setModalEditar(false);
    setModalExcluir(false);
    setTelaConfiguracoes(false);
  }

  async function sair() {
    try {
      if (token) {
        await logoutService(token);
      }
    } catch (error) {
      console.log(error);
    } finally {
      limparSessao();
      toast.info("Sessão encerrada");
    }
  }

  async function validarSessao() {
    if (!token) {
      setCarregandoAuth(false);
      return;
    }

    try {
      const resposta = await usuarioAtualService(token);
      atualizarUsuarioLocal(resposta.data.usuario);
    } catch (error) {
      limparSessao();
    } finally {
      setCarregandoAuth(false);
    }
  }

  async function carregarNotas() {
    if (!token) return;
    setCarregandoNotas(true);

    try {
      const resposta = await carregarNotasService("todas");
      setNotas(resposta.data);
    } catch (error) {
      if (error.response?.status === 401) {
        limparSessao();
        toast.error("Sessão expirada. Entre novamente.");
        return;
      }
      toast.error("Não foi possível carregar as notas.");
    } finally {
      setCarregandoNotas(false);
    }
  }

  async function carregarCategorias() {
    if (!token) return;

    try {
      const resposta = await carregarCategoriasService();
      setCategorias(resposta.data.categorias || []);
      setSubcategorias(resposta.data.subcategorias || []);

      if (!categoria && resposta.data.categorias?.[0]) {
        setCategoria(resposta.data.categorias[0].nome);
      }
    } catch (error) {
      toast.error("Não foi possível carregar categorias.");
    }
  }

  async function criarSubcategoria(categoriaNome, nome) {
    try {
      await criarSubcategoriaService({ categoria: categoriaNome, nome });
      await carregarCategorias();
      toast.success("Subcategoria criada para todos os usuários.");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.erro || "Erro ao criar subcategoria.");
      return false;
    }
  }

  async function excluirSubcategoria(subcategoriaItem) {
    if (!subcategoriaItem?.id) {
      return;
    }

    const confirmar = window.confirm(
      `Excluir a subcategoria "${subcategoriaItem.nome}"? As notas não serão apagadas, só vão ficar sem essa subcategoria.`
    );

    if (!confirmar) {
      return;
    }

    try {
      await excluirSubcategoriaService(subcategoriaItem);

      if (
        categoriaSelecionada === subcategoriaItem.categoria &&
        subcategoriaSelecionada === subcategoriaItem.nome
      ) {
        setSubcategoriaSelecionada("");
      }

      if (categoria === subcategoriaItem.categoria && subcategoria === subcategoriaItem.nome) {
        setSubcategoria("");
      }

      await carregarCategorias();
      await carregarNotas();
      toast.success("Subcategoria excluída sem apagar as notas.");
    } catch (error) {
      toast.error(error.response?.data?.erro || "Erro ao excluir subcategoria.");
    }
  }

  async function criarNota() {
    if (!titulo.trim() || !conteudo.trim()) {
      toast.warning("Preencha título e conteúdo.");
      return;
    }

    try {
      await criarNotaService({
        titulo,
        conteudo,
        categoria,
        subcategoria,
        compartilhada,
        compartilhamentoPrivado,
        senhaCompartilhamento,
        imagens
      });

      setTitulo("");
      setConteudo("");
      setCategoria("Atendimentos");
      setSubcategoria("");
      setCompartilhada(false);
      setCompartilhamentoPrivado(false);
      setSenhaCompartilhamento("");
      setImagens([]);
      setFormularioAberto(false);

      await carregarNotas();
      toast.success(compartilhada ? "Nota compartilhada criada!" : "Nota privada criada!");
    } catch (error) {
      toast.error(error.response?.data?.erro || "Erro ao criar nota.");
    }
  }

  async function editarNota(id, dados) {
    if (!dados.titulo?.trim() || !dados.conteudo?.trim()) {
      toast.warning("Preencha título e conteúdo.");
      return;
    }

    try {
      await editarNotaService(id, dados);
      setModalEditar(false);
      setNotaEditando(null);
      await carregarNotas();
      toast.info("Nota atualizada!");
    } catch (error) {
      toast.error(error.response?.data?.erro || "Erro ao editar nota.");
    }
  }

  function abrirModalEditar(nota) {
    if (!nota.podeEditar) {
      toast.info("Essa nota é somente leitura para você.");
      return;
    }

    setNotaEditando(nota);
    setModalEditar(true);
  }

  function solicitarExclusao(nota) {
    if (!nota.podeExcluir) {
      toast.info("Você não pode excluir nota de outro usuário.");
      return;
    }

    setNotaParaExcluir(nota);
    setModalExcluir(true);
  }

  async function excluirNota() {
    try {
      await excluirNotaService(notaParaExcluir.id);
      setModalExcluir(false);
      setNotaParaExcluir(null);
      await carregarNotas();
      toast.warning("Nota enviada para a lixeira!");
    } catch (error) {
      toast.error(error.response?.data?.erro || "Erro ao enviar nota para a lixeira.");
    }
  }

  async function alternarFavorita(id) {
    const nota = notas.find((item) => item.id === id);

    if (!nota?.podeFavoritar) {
      toast.info("Desbloqueie a nota antes de favoritar.");
      return;
    }

    try {
      await alternarFavoritaService(id);
      await carregarNotas();
      toast[nota?.favorita ? "info" : "success"](nota?.favorita ? "Removida dos favoritos" : "Adicionada aos favoritos");
    } catch (error) {
      toast.error(error.response?.data?.erro || "Erro ao alterar favorita.");
    }
  }

  async function alternarFixada(id) {
    const nota = notas.find((item) => item.id === id);

    if (!nota?.podeFixar) {
      toast.info("Desbloqueie a nota antes de fixar.");
      return;
    }

    try {
      await alternarFixadaService(id);
      await carregarNotas();
      toast[nota?.fixada ? "info" : "success"](nota?.fixada ? "Nota desafixada" : "Nota fixada");
    } catch (error) {
      toast.error(error.response?.data?.erro || "Erro ao fixar nota.");
    }
  }

  async function restaurarNota(id) {
    try {
      await restaurarNotaService(id);
      await carregarNotas();
      toast.success("Nota restaurada!");
    } catch (error) {
      toast.error(error.response?.data?.erro || "Erro ao restaurar nota.");
    }
  }

  async function excluirDefinitivamente(id) {
    try {
      await excluirDefinitivamenteService(id);
      await carregarNotas();
      toast.error("Nota excluída definitivamente!");
    } catch (error) {
      toast.error(error.response?.data?.erro || "Erro ao excluir nota.");
    }
  }

  async function salvarPerfil(dados) {
    try {
      const resposta = await atualizarPerfilService(dados);
      atualizarUsuarioLocal(resposta.data.usuario);
      setModalPerfil(false);
      toast.success("Perfil atualizado!");
    } catch (error) {
      toast.error(error.response?.data?.erro || "Erro ao atualizar perfil.");
    }
  }

  function abrirFormularioNovaNota() {
    if (categoriaSelecionada && categoriaSelecionada !== 'Todas') {
      setCategoria(categoriaSelecionada);
    }

    if (subcategoriaSelecionada) {
      setSubcategoria(subcategoriaSelecionada);
    }

    setFormularioAberto(true);
  }

  function fecharFormularioNovaNota() {
    setFormularioAberto(false);
  }

  function limparPesquisa() {
    setPesquisa("");
  }

  function selecionarAba(novaAba) {
    setTelaAtual("notas");
    setAbaAtiva(novaAba);
    setMostrarFavoritas(novaAba === "favoritas");
    setMostrarCompartilhadas(novaAba === "compartilhadas");
    setMostrarLixeira(novaAba === "lixeira");
    setMostrarFixadas(false);
    setTelaAdminUsuarios(false);
    setTelaConfiguracoes(false);
    setCategoriaSelecionada("Todas");
    setSubcategoriaSelecionada("");
    setFormularioAberto(false);
    limparPesquisa();
  }

  function limparFiltrosDaTela() {
    setPesquisa("");
    setCategoriaSelecionada("Todas");
    setSubcategoriaSelecionada("");
    setTelaAdminUsuarios(false);
    setTelaConfiguracoes(false);
  }

  function voltarParaInicio() {
    setTelaAtual("inicio");
    setTelaAdminUsuarios(false);
    setTelaConfiguracoes(false);
    setFormularioAberto(false);
    setPesquisa("");
    setCategoriaSelecionada("Todas");
    setSubcategoriaSelecionada("");
  }

  function abrirConfiguracoes() {
    setTelaAtual("configuracoes");
    setTelaAdminUsuarios(false);
    setTelaConfiguracoes(true);
    setFormularioAberto(false);
    setMenuAberto(false);
  }

  function concluirImportacaoBanco() {
    limparSessao();
    toast.info("Banco importado. Aguarde o servidor reiniciar e entre novamente.");
    setTimeout(() => window.location.reload(), 2200);
  }

  function abrirAbaComPasta(aba, categoriaNome) {
    selecionarAba(aba);
    setCategoriaSelecionada(categoriaNome || "Todas");
    setSubcategoriaSelecionada("");
  }

  function atualizarNotaSelecionada(novaNota) {
    setNotas((atuais) => atuais.map((item) => item.id === novaNota.id ? novaNota : item));
  }

  function tempoDecorrido(data) {
    const agora = new Date();
    const criada = new Date(data);
    const segundos = Math.floor((agora - criada) / 1000);
    const minutos = Math.floor(segundos / 60);
    const horas = Math.floor(minutos / 60);
    const dias = Math.floor(horas / 24);

    if (segundos < 60) return "Agora mesmo";
    if (minutos < 60) return `Há ${minutos} minuto${minutos > 1 ? "s" : ""}`;
    if (horas < 24) return `Há ${horas} hora${horas > 1 ? "s" : ""}`;
    return `Há ${dias} dia${dias > 1 ? "s" : ""}`;
  }

  useEffect(() => {
    validarSessao();
  }, []);

  useEffect(() => {
    if (token) {
      carregarNotas();
      carregarCategorias();
    }
  }, [token]);

  useEffect(() => {
    localStorage.setItem("temaEscuro", JSON.stringify(temaEscuro));
  }, [temaEscuro]);

  const notasDaAba = useMemo(() => {
    return notas.filter((nota) => {
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
    });
  }, [notas, abaAtiva]);

  const notasFiltradas = useMemo(() => {
    return notasDaAba
      .filter((nota) => {
        const textoPesquisa = pesquisa.toLowerCase();
        const atendePesquisa =
          nota.titulo.toLowerCase().includes(textoPesquisa) ||
          nota.conteudo.toLowerCase().includes(textoPesquisa) ||
          nota.autorNome.toLowerCase().includes(textoPesquisa) ||
          String(nota.categoria || "").toLowerCase().includes(textoPesquisa) ||
          String(nota.subcategoria || "").toLowerCase().includes(textoPesquisa);
        const atendeCategoria = categoriaSelecionada === "Todas" || nota.categoria === categoriaSelecionada;
        const atendeSubcategoria = !subcategoriaSelecionada || nota.subcategoria === subcategoriaSelecionada;

        return atendePesquisa && atendeCategoria && atendeSubcategoria;
      })
      .sort((a, b) => {
        if (a.fixada && !b.fixada) return -1;
        if (!a.fixada && b.fixada) return 1;
        return new Date(b.criadoEm) - new Date(a.criadoEm);
      });
  }, [notasDaAba, pesquisa, categoriaSelecionada, subcategoriaSelecionada]);

  const nomeAba = {
    minhas: "Minhas notas",
    compartilhadas: "Comunidade",
    favoritas: "Favoritas",
    lixeira: "Lixeira"
  }[abaAtiva] || "Minhas notas";

  const tituloPagina = telaConfiguracoes
    ? "Configurações"
    : telaAdminUsuarios
    ? "Gerenciar usuários"
    : telaAtual === "inicio"
    ? "Início"
    : subcategoriaSelecionada
    ? `${nomeAba} / ${categoriaSelecionada} / ${subcategoriaSelecionada}`
    : categoriaSelecionada !== "Todas"
    ? `${nomeAba} / ${categoriaSelecionada}`
    : `${nomeAba} (${notasDaAba.length})`;

  const descricoesAba = {
    minhas: {
      titulo: 'Minhas notas',
      subtitulo: 'Aqui ficam suas notas privadas, de uso único e também as compartilhadas que foram criadas por você.',
      placeholder: 'Pesquisar nas suas notas...'
    },
    compartilhadas: {
      titulo: 'Comunidade',
      subtitulo: 'Tela somente para notas compartilhadas entre usuários. As privadas continuam protegidas.',
      placeholder: 'Pesquisar na comunidade...'
    },
    favoritas: {
      titulo: 'Favoritas',
      subtitulo: 'Suas favoritas ficam separadas por usuário. Favoritar aqui não altera para os outros.',
      placeholder: 'Pesquisar nas favoritas...'
    },
    lixeira: {
      titulo: 'Lixeira',
      subtitulo: 'Notas removidas ficam separadas aqui para não misturar com o resto.',
      placeholder: 'Pesquisar na lixeira...'
    }
  };

  const pastasPadrao = [
    { id: 'Atendimentos', nome: 'Atendimentos', icone: '🧾' },
    { id: 'Trabalho', nome: 'Trabalho', icone: '💼' },
    { id: 'Projetos', nome: 'Projetos', icone: '🚀' },
    { id: 'Documentação', nome: 'Documentação', icone: '📚' },
    { id: 'Ideias', nome: 'Ideias', icone: '💡' }
  ];

  const pastasOrdenadas = categorias.length > 0 ? categorias : pastasPadrao;
  const dadosTelaAtual = descricoesAba[abaAtiva] || descricoesAba.minhas;

  function selecionarPastaDaTela(nome) {
    setPesquisa('');
    setCategoriaSelecionada(nome);
    setSubcategoriaSelecionada('');
    setTelaAdminUsuarios(false);
  }

  function totalDaPasta(nome) {
    return notasDaAba.filter((nota) => nota.categoria === nome).length;
  }

  if (carregandoAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="text-center animate-fade-in">
          <div className="w-14 h-14 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-bold">Carregando Smart Notes...</p>
        </div>
      </div>
    );
  }

  if (!token || !usuario) {
    return (
      <>
        <LoginPage temaEscuro={temaEscuro} setTemaEscuro={setTemaEscuro} onAutenticado={salvarSessao} />
        <ToastContainer position="top-right" autoClose={3000} theme={temaEscuro ? "dark" : "light"} />
      </>
    );
  }

  return (
    <div className={`min-h-screen p-3 pb-24 md:p-6 md:pb-6 xl:p-8 transition-colors ${temaEscuro ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-950"}`}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-24 w-96 h-96 rounded-full bg-emerald-600/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[32rem] h-[32rem] rounded-full bg-cyan-600/10 blur-3xl" />
      </div>

      <div className="relative max-w-[1500px] mx-auto flex flex-col md:flex-row gap-6">
        {menuAberto && <div onClick={() => setMenuAberto(false)} className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />}

        <Sidebar
          limparPesquisa={limparPesquisa}
          menuAberto={menuAberto}
          setMenuAberto={setMenuAberto}
          temaEscuro={temaEscuro}
          setTemaEscuro={setTemaEscuro}
          abaAtiva={abaAtiva}
          telaAtual={telaAtual}
          telaAdminUsuarios={telaAdminUsuarios}
          telaConfiguracoes={telaConfiguracoes}
          selecionarAba={selecionarAba}
          voltarParaInicio={voltarParaInicio}
          categoriaSelecionada={categoriaSelecionada}
          setCategoriaSelecionada={setCategoriaSelecionada}
          subcategoriaSelecionada={subcategoriaSelecionada}
          setSubcategoriaSelecionada={setSubcategoriaSelecionada}
          setMostrarFavoritas={setMostrarFavoritas}
          setMostrarFixadas={setMostrarFixadas}
          setMostrarLixeira={setMostrarLixeira}
          setMostrarCompartilhadas={setMostrarCompartilhadas}
          setTelaAdminUsuarios={setTelaAdminUsuarios}
          setTelaConfiguracoes={setTelaConfiguracoes}
          categorias={categorias}
          subcategorias={subcategorias}
          excluirSubcategoria={excluirSubcategoria}
          notas={notas}
          usuario={usuario}
          abrirPerfil={() => setModalPerfil(true)}
          sair={sair}
        />

        <main className="flex-1 min-w-0">
          <header className={`mb-6 rounded-[2rem] p-5 md:p-7 border shadow-2xl animate-fade-in ${temaEscuro ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200"}`}>
            <div className="flex items-center gap-4">
              <button onClick={() => setMenuAberto(!menuAberto)} className="md:hidden bg-emerald-600 hover:bg-emerald-700 px-4 py-3 rounded-2xl text-xl cursor-pointer transition-all text-white shadow-lg shadow-emerald-600/20">☰</button>
              <div className="min-w-0">
                <span className="text-xs uppercase tracking-[0.25em] text-emerald-500 font-black">Smart Notes</span>
                <h1 className="text-2xl md:text-4xl font-black mt-1 truncate">{tituloPagina}</h1>
              </div>
            </div>
          </header>

          {telaConfiguracoes ? (
            <Configuracoes temaEscuro={temaEscuro} usuario={usuario} onBancoImportado={concluirImportacaoBanco} />
          ) : telaAdminUsuarios ? (
            <AdminUsuarios temaEscuro={temaEscuro} usuarioAtual={usuario} />
          ) : telaAtual === "inicio" ? (
            <TelaInicial
              notas={notas}
              temaEscuro={temaEscuro}
              usuario={usuario}
              categorias={categorias}
              abrirAba={selecionarAba}
              abrirAbaComPasta={abrirAbaComPasta}
              abrirNovaNota={abrirFormularioNovaNota}
            />
          ) : (
            <>
              <section className={`rounded-[2rem] border p-5 md:p-6 mb-6 animate-fade-in ${temaEscuro ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200"}`}>
                <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 mb-5">
                  <div className="min-w-0">
                    <button onClick={voltarParaInicio} className={`mb-4 px-4 py-2 rounded-2xl text-sm font-black transition-all ${temaEscuro ? "bg-slate-800 hover:bg-slate-700 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-950"}`}>← Voltar para início</button>
                    <span className="block text-xs uppercase tracking-[0.24em] text-emerald-500 font-black">Tela dedicada</span>
                    <h2 className="text-2xl md:text-4xl font-black mt-2">{dadosTelaAtual.titulo}</h2>
                    <p className="text-sm text-slate-400 mt-2 max-w-4xl leading-relaxed">{dadosTelaAtual.subtitulo}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto] gap-3 items-center">
                  <input
                    type="text"
                    placeholder={dadosTelaAtual.placeholder}
                    value={pesquisa}
                    onChange={(event) => {
                      const valor = event.target.value;
                      setPesquisa(valor);
                      if (valor.trim() !== '') {
                        setCategoriaSelecionada('Todas');
                        setSubcategoriaSelecionada('');
                        setTelaAdminUsuarios(false);
                      }
                    }}
                    className={`w-full p-4 rounded-2xl border outline-none transition-all ${temaEscuro ? "bg-slate-950 border-slate-800 focus:border-emerald-500" : "bg-slate-50 border-slate-200 focus:border-emerald-500"}`}
                  />
                  <button onClick={limparFiltrosDaTela} className="px-5 py-3 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-black transition-all">Limpar</button>
                  {abaAtiva !== 'lixeira' && (
                    <button onClick={abrirFormularioNovaNota} className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg shadow-emerald-600/20 transition-all hover:-translate-y-0.5">Nova nota</button>
                  )}
                </div>
              </section>

              {abaAtiva !== 'lixeira' && (
                <section className={`rounded-[2rem] border p-5 mb-6 animate-fade-in ${temaEscuro ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200"}`}>
                  <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-5">
                    <div>
                      <span className="text-xs uppercase tracking-[0.22em] text-emerald-500 font-black">Pastas desta tela</span>
                      <h3 className="text-2xl font-black mt-1">Organizar por pasta</h3>
                      <p className="text-sm text-slate-400 mt-2">Escolha uma pasta para filtrar só dentro da aba aberta.</p>
                    </div>
                    <button
                      onClick={() => selecionarPastaDaTela('Todas')}
                      className={`px-5 py-3 rounded-2xl font-black transition-all ${categoriaSelecionada === 'Todas' ? "bg-emerald-600 text-white" : temaEscuro ? "bg-slate-800 hover:bg-slate-700 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-950"}`}
                    >
                      Todas ({notasDaAba.length})
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
                    {pastasOrdenadas.map((pasta) => (
                      <button
                        key={pasta.id || pasta.nome}
                        onClick={() => selecionarPastaDaTela(pasta.nome)}
                        className={`text-left rounded-3xl p-4 border transition-all hover:-translate-y-1 ${categoriaSelecionada === pasta.nome ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/20" : temaEscuro ? "bg-slate-950/80 border-slate-800 hover:border-emerald-500/50" : "bg-slate-50 border-slate-200 hover:border-emerald-500/50"}`}
                      >
                        <div className="flex items-center justify-between mb-5">
                          <span className="text-3xl">{pasta.icone || '📁'}</span>
                          <span className={`rounded-full px-3 py-1 text-sm font-black ${categoriaSelecionada === pasta.nome ? "bg-white/20 text-white" : "bg-emerald-600/15 text-emerald-400"}`}>{totalDaPasta(pasta.nome)}</span>
                        </div>
                        <h3 className="font-black text-lg">{pasta.nome}</h3>
                        <p className="text-xs opacity-70 mt-1">Abrir pasta</p>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {carregandoNotas ? (
                <div className={`rounded-[2rem] p-10 text-center border ${temaEscuro ? "bg-slate-900 border-slate-800 text-slate-400" : "bg-white border-slate-200 text-slate-600"}`}>
                  <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p>Carregando notas...</p>
                </div>
              ) : notasFiltradas.length === 0 ? (
                <div className={`rounded-[2rem] p-10 text-center border animate-fade-in ${temaEscuro ? "bg-slate-900 border-slate-800 text-slate-400" : "bg-white border-slate-200 text-slate-600"}`}>
                  <strong className="block text-2xl mb-2">Nenhuma nota encontrada</strong>
                  <p>Crie uma nova nota ou ajuste os filtros de busca.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                  {notasFiltradas.map((nota) => (
                    <NotaCard key={nota.id} nota={nota} temaEscuro={temaEscuro} tempoDecorrido={tempoDecorrido} alternarFavorita={alternarFavorita} setNotaSelecionada={setNotaSelecionada} />
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <BottomNav
        abaAtiva={abaAtiva}
        telaAtual={telaAtual}
        telaAdminUsuarios={telaAdminUsuarios}
        telaConfiguracoes={telaConfiguracoes}
        menuAberto={menuAberto}
        onInicio={voltarParaInicio}
        onAba={selecionarAba}
        onConfiguracoes={abrirConfiguracoes}
        onMenu={() => setMenuAberto(true)}
      />

      <FormularioNota
        formularioAberto={formularioAberto}
        temaEscuro={temaEscuro}
        titulo={titulo}
        setTitulo={setTitulo}
        categoria={categoria}
        setCategoria={setCategoria}
        subcategoria={subcategoria}
        setSubcategoria={setSubcategoria}
        conteudo={conteudo}
        setConteudo={setConteudo}
        compartilhada={compartilhada}
        setCompartilhada={setCompartilhada}
        compartilhamentoPrivado={compartilhamentoPrivado}
        setCompartilhamentoPrivado={setCompartilhamentoPrivado}
        senhaCompartilhamento={senhaCompartilhamento}
        setSenhaCompartilhamento={setSenhaCompartilhamento}
        imagens={imagens}
        setImagens={setImagens}
        categorias={categorias}
        subcategorias={subcategorias}
        criarSubcategoria={criarSubcategoria}
        usuario={usuario}
        criarNota={criarNota}
        onFechar={fecharFormularioNovaNota}
      />

      <ModalNota
        notaSelecionada={notaSelecionada}
        setNotaSelecionada={setNotaSelecionada}
        temaEscuro={temaEscuro}
        tempoDecorrido={tempoDecorrido}
        alternarFavorita={alternarFavorita}
        alternarFixada={alternarFixada}
        abrirModalEditar={abrirModalEditar}
        solicitarExclusao={solicitarExclusao}
        restaurarNota={restaurarNota}
        excluirDefinitivamente={excluirDefinitivamente}
        atualizarNotaSelecionada={atualizarNotaSelecionada}
      />

      <ModalEditar
        aberto={modalEditar}
        nota={notaEditando}
        temaEscuro={temaEscuro}
        categorias={categorias}
        subcategorias={subcategorias}
        criarSubcategoria={criarSubcategoria}
        usuario={usuario}
        onFechar={() => {
          setModalEditar(false);
          setNotaEditando(null);
        }}
        onSalvar={editarNota}
      />

      <ModalPerfil aberto={modalPerfil} usuario={usuario} temaEscuro={temaEscuro} onFechar={() => setModalPerfil(false)} onSalvar={salvarPerfil} />

      <ModalExcluir modalExcluir={modalExcluir} notaParaExcluir={notaParaExcluir} temaEscuro={temaEscuro} setModalExcluir={setModalExcluir} excluirNota={excluirNota} />

      <ToastContainer position="top-right" autoClose={3000} theme={temaEscuro ? "dark" : "light"} />
    </div>
  );
}

export default App;
