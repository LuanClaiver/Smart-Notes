import { useEffect, useState } from "react";

function VisualizadorImagem({ imagem, temaEscuro, onFechar }) {
  const [baixando, setBaixando] = useState(false);

  useEffect(() => {
    if (!imagem) return;

    function fecharComEsc(event) {
      if (event.key === "Escape") onFechar();
    }

    document.addEventListener("keydown", fecharComEsc);
    return () => document.removeEventListener("keydown", fecharComEsc);
  }, [imagem, onFechar]);

  if (!imagem) return null;

  async function baixarImagem() {
    setBaixando(true);
    try {
      const resposta = await fetch(imagem.src);
      const blob = await resposta.blob();
      const extensao = blob.type?.split("/")[1]?.replace("jpeg", "jpg") || "png";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${imagem.nome || "smart-notes-imagem"}.${extensao}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } finally {
      setBaixando(false);
    }
  }

  return (
    <div onClick={onFechar} className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 md:p-6">
      <section onClick={(event) => event.stopPropagation()} className={`w-full h-full max-w-7xl max-h-[96dvh] rounded-[2rem] border shadow-2xl flex flex-col overflow-hidden ${temaEscuro ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200"}`}>
        <header className="flex items-center justify-between gap-3 p-4 border-b border-slate-700/40">
          <div className="min-w-0">
            <span className="text-xs uppercase tracking-[0.2em] text-emerald-500 font-black">Imagem anexada</span>
            <p className={`truncate text-sm mt-1 ${temaEscuro ? "text-slate-400" : "text-slate-600"}`}>{imagem.alt || "Visualização da imagem"}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button type="button" onClick={baixarImagem} disabled={baixando} className="px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black">
              {baixando ? "Baixando..." : "⬇ Baixar"}
            </button>
            <button type="button" onClick={onFechar} className="w-12 h-12 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xl font-black">✕</button>
          </div>
        </header>
        <div className={`flex-1 min-h-0 p-3 md:p-5 flex items-center justify-center ${temaEscuro ? "bg-black/30" : "bg-slate-100"}`}>
          <img src={imagem.src} alt={imagem.alt || "Imagem anexada"} className="max-w-full max-h-full object-contain rounded-2xl" />
        </div>
      </section>
    </div>
  );
}

export default VisualizadorImagem;
