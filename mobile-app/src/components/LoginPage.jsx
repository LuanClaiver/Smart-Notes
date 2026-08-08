import { useState } from "react";
import {
  cadastroService,
  loginService,
  recuperarSenhaService,
  redefinirSenhaService
} from "../services/authService";

function LoginPage({ temaEscuro, setTemaEscuro, onAutenticado }) {
  const [modo, setModo] = useState("login");
  const [nome, setNome] = useState("");
  const [usuario, setUsuario] = useState("");
  const [identificador, setIdentificador] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [codigo, setCodigo] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [codigoGerado, setCodigoGerado] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  function limparAvisos() {
    setErro("");
    setMensagem("");
  }

  async function enviarFormulario(event) {
    event.preventDefault();
    limparAvisos();
    setCarregando(true);

    try {
      if (modo === "cadastro") {
        const resposta = await cadastroService({ nome, usuario, email, senha });
        onAutenticado(resposta.data.token, resposta.data.usuario);
        return;
      }

      const resposta = await loginService({ identificador, senha });
      onAutenticado(resposta.data.token, resposta.data.usuario);
    } catch (error) {
      setErro(error.response?.data?.erro || "Não foi possível autenticar. Confira os dados e tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  async function recuperarSenha(event) {
    event.preventDefault();
    limparAvisos();
    setCarregando(true);

    try {
      const resposta = await recuperarSenhaService({ identificador });
      setCodigoGerado(resposta.data.codigoDesenvolvimento || "");
      setMensagem("Código gerado para demonstração. Copie e redefina a senha.");
      setModo("redefinir");
    } catch (error) {
      setErro(error.response?.data?.erro || "Não foi possível gerar o código.");
    } finally {
      setCarregando(false);
    }
  }

  async function redefinirSenha(event) {
    event.preventDefault();
    limparAvisos();
    setCarregando(true);

    try {
      await redefinirSenhaService({ identificador, codigo, novaSenha });
      setMensagem("Senha alterada com sucesso. Agora entre usando a nova senha.");
      setCodigo("");
      setNovaSenha("");
      setSenha("");
      setModo("login");
    } catch (error) {
      setErro(error.response?.data?.erro || "Não foi possível redefinir a senha.");
    } finally {
      setCarregando(false);
    }
  }

  const titulo = modo === "cadastro"
    ? "Criar conta"
    : modo === "recuperar"
    ? "Recuperar senha"
    : modo === "redefinir"
    ? "Nova senha"
    : "Entrar no sistema";

  return (
    <div
      className={`min-h-screen flex items-center justify-center px-4 py-8 ${
        temaEscuro ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-950"
      }`}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-emerald-600/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
      </div>

      <main
        className={`relative w-full max-w-6xl grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] rounded-[2rem] overflow-hidden shadow-2xl border ${
          temaEscuro ? "bg-slate-900/90 border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        <section className="order-2 lg:order-1 p-8 md:p-12 flex flex-col justify-between gap-10 bg-gradient-to-br from-emerald-700 via-slate-900 to-slate-950 text-white">
          <div>
            <div className="inline-flex items-center gap-3 bg-white/10 border border-white/20 rounded-full px-4 py-2 mb-8 backdrop-blur">
              <img src="/smart-notes-logo.svg" alt="" className="w-8 h-8 rounded-xl shadow-lg" />
              <span className="text-sm font-bold">Smart Notes <span className="text-emerald-300">1.5.4</span></span>
            </div>

            <h1 className="text-4xl md:text-6xl font-black leading-tight mb-5">
              Notas privadas, compartilhadas e organizadas.
            </h1>

            <p className="text-emerald-100 text-lg md:text-xl max-w-2xl leading-relaxed">
              Olá, tenha uma ótima sessão! Organize anotações, adicione imagens, compartilhe informações importantes e mantenha notas privadas protegidas por usuário.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/10 border border-white/20 rounded-2xl p-4 backdrop-blur">
              <strong className="block text-2xl mb-1">🔐</strong>
              <span className="text-sm text-emerald-100">Login seguro</span>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-2xl p-4 backdrop-blur">
              <strong className="block text-2xl mb-1">🧩</strong>
              <span className="text-sm text-emerald-100">Subcategorias</span>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-2xl p-4 backdrop-blur">
              <strong className="block text-2xl mb-1">🖼️</strong>
              <span className="text-sm text-emerald-100">Imagens e observações</span>
            </div>
          </div>
        </section>

        <section className="order-1 lg:order-2 p-6 md:p-10">
          <div className="flex items-center gap-3 mb-7">
            <img src="/smart-notes-logo.svg" alt="Logo Smart Notes" className="w-14 h-14 rounded-2xl shadow-xl" />
            <div><strong className="block text-xl">Smart Notes</strong><span className="text-xs text-emerald-500 font-bold">Versão 1.5.4</span></div>
          </div>
          <div className="flex justify-between items-center mb-8">
            <div>
              <p className="text-sm text-emerald-500 font-bold uppercase tracking-[0.25em]">
                Acesso
              </p>
              <h2 className="text-3xl font-black mt-2">{titulo}</h2>
            </div>

            <button
              type="button"
              onClick={() => setTemaEscuro(!temaEscuro)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-white hover:bg-slate-700 transition-all"
            >
              {temaEscuro ? "☀️" : "🌙"}
            </button>
          </div>

          {(modo === "login" || modo === "cadastro") && (
            <form onSubmit={enviarFormulario} autoComplete="off" className="space-y-5">
              {modo === "cadastro" && (
                <>
                  <div>
                    <label className="block text-sm font-bold mb-2">Nome de exibição</label>
                    <input
                      value={nome}
                      onChange={(event) => setNome(event.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border outline-none transition-all ${
                        temaEscuro ? "bg-slate-800 border-slate-700 focus:border-emerald-500" : "bg-white border-slate-300 focus:border-emerald-500"
                      }`}
                      placeholder="Ex.: João D’Ávila-Silva"
                      maxLength={80}
                      autoComplete="name"
                    />
                    <p className="mt-2 text-xs text-slate-400">Aceita espaços, acentos, apóstrofo e hífen.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">Nome de usuário</label>
                    <input
                      value={usuario}
                      onChange={(event) => setUsuario(event.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border outline-none transition-all ${
                        temaEscuro ? "bg-slate-800 border-slate-700 focus:border-emerald-500" : "bg-white border-slate-300 focus:border-emerald-500"
                      }`}
                      placeholder="Ex.: joao.silva"
                      minLength={3}
                      maxLength={30}
                      spellCheck="false"
                      autoComplete="username"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-bold mb-2">{modo === "cadastro" ? "E-mail" : "Usuário ou e-mail"}</label>
                <input
                  type={modo === "cadastro" ? "email" : "text"}
                  value={modo === "cadastro" ? email : identificador}
                  onChange={(event) => modo === "cadastro" ? setEmail(event.target.value) : setIdentificador(event.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border outline-none transition-all ${
                    temaEscuro ? "bg-slate-800 border-slate-700 focus:border-emerald-500" : "bg-white border-slate-300 focus:border-emerald-500"
                  }`}
                  placeholder={modo === "cadastro" ? "seuemail@exemplo.com" : "Usuário ou e-mail"}
                  autoComplete="username"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Senha</label>
                <input
                  type="password"
                  value={senha}
                  onChange={(event) => setSenha(event.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border outline-none transition-all ${
                    temaEscuro ? "bg-slate-800 border-slate-700 focus:border-emerald-500" : "bg-white border-slate-300 focus:border-emerald-500"
                  }`}
                  placeholder="Digite sua senha"
                  autoComplete="new-password"
                />
              </div>

              {erro && <div className="rounded-xl bg-red-500/10 border border-red-500/40 text-red-400 px-4 py-3 text-sm">{erro}</div>}
              {mensagem && <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 px-4 py-3 text-sm">{mensagem}</div>}

              <button disabled={carregando} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black rounded-xl px-5 py-3 transition-all shadow-lg shadow-emerald-600/20">
                {carregando ? "Aguarde..." : modo === "cadastro" ? "Criar conta" : "Entrar"}
              </button>
            </form>
          )}

          {modo === "recuperar" && (
            <form onSubmit={recuperarSenha} autoComplete="off" className="space-y-5">
              <p className="text-sm text-slate-400 leading-relaxed">
                Informe o nome de usuário ou e-mail cadastrado. O sistema vai gerar um código local de recuperação para demonstração.
              </p>
              <input
                type="text"
                value={identificador}
                onChange={(event) => setIdentificador(event.target.value)}
                className={`w-full px-4 py-3 rounded-xl border outline-none ${temaEscuro ? "bg-slate-800 border-slate-700" : "bg-white border-slate-300"}`}
                placeholder="Usuário ou e-mail"
              />
              {erro && <div className="rounded-xl bg-red-500/10 border border-red-500/40 text-red-400 px-4 py-3 text-sm">{erro}</div>}
              <button disabled={carregando} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black rounded-xl px-5 py-3">
                Gerar código
              </button>
            </form>
          )}

          {modo === "redefinir" && (
            <form onSubmit={redefinirSenha} autoComplete="off" className="space-y-5">
              {codigoGerado && (
                <div className="rounded-2xl p-4 bg-emerald-500/10 border border-emerald-500/40">
                  <span className="block text-sm text-emerald-300 mb-1">Código de recuperação</span>
                  <strong className="text-3xl tracking-[0.35em]">{codigoGerado}</strong>
                </div>
              )}
              <input
                type="text"
                value={identificador}
                onChange={(event) => setIdentificador(event.target.value)}
                className={`w-full px-4 py-3 rounded-xl border outline-none ${temaEscuro ? "bg-slate-800 border-slate-700" : "bg-white border-slate-300"}`}
                placeholder="Usuário ou e-mail"
              />
              <input
                value={codigo}
                onChange={(event) => setCodigo(event.target.value)}
                className={`w-full px-4 py-3 rounded-xl border outline-none ${temaEscuro ? "bg-slate-800 border-slate-700" : "bg-white border-slate-300"}`}
                placeholder="Código"
              />
              <input
                type="password"
                value={novaSenha}
                onChange={(event) => setNovaSenha(event.target.value)}
                className={`w-full px-4 py-3 rounded-xl border outline-none ${temaEscuro ? "bg-slate-800 border-slate-700" : "bg-white border-slate-300"}`}
                placeholder="Nova senha"
              />
              {erro && <div className="rounded-xl bg-red-500/10 border border-red-500/40 text-red-400 px-4 py-3 text-sm">{erro}</div>}
              {mensagem && <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 px-4 py-3 text-sm">{mensagem}</div>}
              <button disabled={carregando} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black rounded-xl px-5 py-3">
                Redefinir senha
              </button>
            </form>
          )}

          <div className="mt-6 flex flex-col gap-3 text-center">
            <button
              onClick={() => {
                setModo(modo === "cadastro" ? "login" : "cadastro");
                limparAvisos();
              }}
              className="text-emerald-500 font-bold hover:underline"
            >
              {modo === "cadastro" ? "Já tenho conta, quero entrar" : "Criar uma nova conta"}
            </button>

            <button
              onClick={() => {
                setModo(modo === "login" ? "recuperar" : "login");
                limparAvisos();
              }}
              className="text-slate-400 font-bold hover:underline"
            >
              {modo === "login" ? "Esqueci minha senha" : "Voltar para login"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default LoginPage;
