function EditorImagens({
  imagens = [],
  setImagens,
  temaEscuro,
  titulo = "Imagens dentro da nota",
  descricao = "Adicione até 6 imagens para complementar o conteúdo da anotação.",
  textoVazio = "Nenhuma imagem adicionada nesta nota.",
  maxImagens = 6,
  onAbrirImagem
}) {
  async function arquivoParaBase64(arquivo) {
    return new Promise((resolve, reject) => {
      const leitor = new FileReader();

      leitor.onload = () => resolve(String(leitor.result || ""));
      leitor.onerror = () => reject(new Error("Não foi possível carregar a imagem"));
      leitor.readAsDataURL(arquivo);
    });
  }

  async function escolherImagens(event) {
    const arquivos = Array.from(event.target.files || []);

    if (arquivos.length === 0) {
      return;
    }

    const imagensValidas = arquivos.filter((arquivo) => arquivo.type.startsWith("image/"));

    if (imagensValidas.length !== arquivos.length) {
      alert("Alguns arquivos foram ignorados porque não são imagens.");
    }

    try {
      const novasImagens = await Promise.all(imagensValidas.map(arquivoParaBase64));
      const total = [...imagens, ...novasImagens].slice(0, maxImagens);
      setImagens(total);
      event.target.value = "";
    } catch (error) {
      alert("Erro ao carregar imagem.");
    }
  }

  function removerImagem(indice) {
    setImagens(imagens.filter((_, posicao) => posicao !== indice));
  }

  return (
    <div
      className={`rounded-2xl border p-4 ${
        temaEscuro
          ? "bg-slate-950 border-slate-800"
          : "bg-slate-50 border-slate-200"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <label className="block text-sm font-black">{titulo}</label>
          <p className="text-xs text-slate-400 mt-1">{descricao}</p>
        </div>

        <label className="inline-flex justify-center items-center px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black cursor-pointer transition-all shadow-lg shadow-emerald-600/20">
          + Imagens
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={escolherImagens}
            className="hidden"
          />
        </label>
      </div>

      {imagens.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {imagens.map((imagem, indice) => (
            <div key={`${imagem.slice(0, 30)}-${indice}`} className="relative group">
              <button
                type="button"
                onClick={() => onAbrirImagem?.({
                  src: imagem,
                  nome: `smart-notes-imagem-${indice + 1}`,
                  alt: `${titulo} ${indice + 1}`
                })}
                className="block w-full text-left"
                title={onAbrirImagem ? "Abrir imagem" : undefined}
              >
                <img
                  src={imagem}
                  alt={`${titulo} ${indice + 1}`}
                  className={`w-full h-32 object-cover rounded-2xl border border-emerald-500/30 ${onAbrirImagem ? "cursor-zoom-in" : ""}`}
                />
              </button>

              <button
                type="button"
                onClick={() => removerImagem(indice)}
                className="absolute top-2 right-2 px-3 py-1 rounded-xl bg-red-600 text-white text-xs font-black opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div
          className={`rounded-2xl border border-dashed p-5 text-center ${
            temaEscuro
              ? "border-slate-700 text-slate-500"
              : "border-slate-300 text-slate-500"
          }`}
        >
          {textoVazio}
        </div>
      )}
    </div>
  );
}

export default EditorImagens;
