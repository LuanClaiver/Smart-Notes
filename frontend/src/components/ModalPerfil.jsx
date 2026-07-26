import { useEffect, useState } from "react";

function ModalPerfil({ aberto, usuario, temaEscuro, onFechar, onSalvar }) {
  const [nome, setNome] = useState("");
  const [usuarioLogin, setUsuarioLogin] = useState("");
  const [fotoPerfil, setFotoPerfil] = useState("");

  useEffect(() => {
    if (usuario) {
      setNome(usuario.nome || "");
      setUsuarioLogin(usuario.usuario || "");
      setFotoPerfil(usuario.fotoPerfil || "");
    }
  }, [usuario]);

  if (!aberto) {
    return null;
  }

  function arquivoParaBase64(arquivo) {
    return new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = () => resolve(String(leitor.result || ""));
      leitor.onerror = () => reject(new Error("Não foi possível carregar a imagem"));
      leitor.readAsDataURL(arquivo);
    });
  }

  async function escolherImagem(event) {
    const arquivo = event.target.files?.[0];

    if (!arquivo) {
      return;
    }

    if (!arquivo.type.startsWith("image/")) {
      alert("Escolha uma imagem válida.");
      return;
    }

    const imagem = await arquivoParaBase64(arquivo);
    setFotoPerfil(imagem);
  }

  return (
    <div onClick={onFechar} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 md:p-4">
      <div onClick={(event) => event.stopPropagation()} className={`w-full max-w-xl rounded-[2rem] p-5 md:p-7 border shadow-2xl animate-modal-in ${temaEscuro ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-950"}`}>
        <div className="flex justify-between items-start gap-4 mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-500 font-black">Perfil</p>
            <h2 className="text-2xl md:text-3xl font-black mt-1">Personalização</h2>
          </div>
          <button onClick={onFechar} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-2xl font-black">✕</button>
        </div>

        <div className="flex flex-col items-center gap-4 mb-5">
          {fotoPerfil ? <img src={fotoPerfil} alt="Foto de perfil" className="w-28 h-28 rounded-3xl object-cover border border-emerald-500/40" /> : <div className="w-28 h-28 rounded-3xl bg-emerald-600 flex items-center justify-center text-white text-5xl font-black">{nome.charAt(0) || "U"}</div>}
          <label className="px-4 py-3 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-black cursor-pointer">
            Alterar foto
            <input type="file" accept="image/*" onChange={escolherImagem} className="hidden" />
          </label>
          {fotoPerfil && <button onClick={() => setFotoPerfil("")} className="text-red-400 font-bold">Remover foto</button>}
        </div>

        <label className="block text-sm font-bold mb-2">Nome de exibição</label>
        <input value={nome} onChange={(event) => setNome(event.target.value)} className={`w-full p-4 rounded-2xl border outline-none mb-5 ${temaEscuro ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"}`} />

        <label className="block text-sm font-bold mb-2">Nome de usuário</label>
        <input value={usuarioLogin} onChange={(event) => setUsuarioLogin(event.target.value)} className={`w-full p-4 rounded-2xl border outline-none mb-5 ${temaEscuro ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"}`} />

        <button onClick={() => onSalvar({ nome, usuario: usuarioLogin, fotoPerfil })} className="w-full px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black">
          Salvar perfil
        </button>
      </div>
    </div>
  );
}

export default ModalPerfil;
