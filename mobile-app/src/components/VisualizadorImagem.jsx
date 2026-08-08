import { useEffect, useState } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";

const Downloads = registerPlugin("Downloads");

function blobParaBase64(blob) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result || "").split(",")[1] || "");
    leitor.onerror = () => reject(leitor.error);
    leitor.readAsDataURL(blob);
  });
}

function VisualizadorImagem({ imagem, temaEscuro, onFechar }) {
  const [baixando, setBaixando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    setMensagem("");
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
    setMensagem("");

    try {
      const resposta = await fetch(imagem.src);
      if (!resposta.ok) throw new Error("Falha ao carregar a imagem para download.");

      const blob = await resposta.blob();
      const extensao = blob.type?.split("/")[1]?.replace("jpeg", "jpg") || "png";
      const nomeArquivo = `${imagem.nome || "smart-notes-imagem"}.${extensao}`;

      if (Capacitor.isNativePlatform()) {
        const base64 = await blobParaBase64(blob);
        const resultado = await Downloads.saveBase64({
          fileName: nomeArquivo,
          mimeType: blob.type || `image/${extensao === "jpg" ? "jpeg" : extensao}`,
          base64
        });
        setMensagem(`Imagem salva em ${resultado?.path || `Downloads/${nomeArquivo}`}`);
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = nomeArquivo;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
        setMensagem("Download iniciado.");
      }
    } catch (error) {
      console.error("Falha ao baixar imagem:", error);
      setMensagem("Não foi possível salvar a imagem em Downloads.");
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
              {baixando ? "Salvando..." : "⬇ Baixar"}
            </button>
            <button type="button" onClick={onFechar} className="w-12 h-12 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xl font-black">✕</button>
          </div>
        </header>
        {mensagem && <p className="px-4 py-2 text-sm text-center bg-emerald-600/15 text-emerald-400 font-bold">{mensagem}</p>}
        <div className={`flex-1 min-h-0 p-3 md:p-5 flex items-center justify-center ${temaEscuro ? "bg-black/30" : "bg-slate-100"}`}>
          <img src={imagem.src} alt={imagem.alt || "Imagem anexada"} className="max-w-full max-h-full object-contain rounded-2xl" />
        </div>
      </section>
    </div>
  );
}

export default VisualizadorImagem;
