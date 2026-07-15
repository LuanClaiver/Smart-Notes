import { useEffect } from "react";

function ModalNota({
  notaSelecionada,
  setNotaSelecionada,
  temaEscuro,
  tempoDecorrido,
  alternarFavorita,
  alternarFixada,
  iniciarEdicao,
  solicitarExclusao,
  restaurarNota,
  excluirDefinitivamente
}) {
  useEffect(() => {

  function fecharComEsc(event) {

    if (event.key === "Escape") {
      setNotaSelecionada(null);
    }

  }

  document.addEventListener(
    "keydown",
    fecharComEsc
  );

  return () => {

    document.removeEventListener(
      "keydown",
      fecharComEsc
    );

  };

}, [setNotaSelecionada]);

  if (!notaSelecionada) return null;

  return (
    <div
      onClick={() =>
        setNotaSelecionada(null)
      }
      className="
        fixed
        inset-0
        bg-black/60
        flex
        items-center
        justify-center
        z-50
      "
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`
          w-full
          max-w-3xl
          p-6
          rounded-2xl
          shadow-lg
          ${
            temaEscuro
              ? "bg-gray-800"
              : "bg-white text-black"
          }
        `}
      >

        {/* CABEÇALHO DO MODAL */}
        <div className="flex justify-between items-center mb-4">

          <h2 className="text-2xl font-bold">
            {notaSelecionada.titulo}
          </h2>

          <button
            onClick={() =>
              setNotaSelecionada(null)
            }
            className="
              bg-red-600
              hover:bg-red-700
              px-3
              py-2
              rounded-lg
              cursor-pointer
            "
          >
            ✖
          </button>

        </div>

        {/* CATEGORIA */}
        <p className="text-blue-400 mb-2">
          📂 {notaSelecionada.categoria}
        </p>

        {/* DATA */}
        <p className="text-gray-400 mb-4">
          {tempoDecorrido(
            notaSelecionada.criadoEm
          )}
        </p>

        {/* CONTEÚDO COMPLETO */}
        <div
          className="
            max-h-[500px]
            overflow-y-auto
            whitespace-pre-wrap
            break-words
          "
        >
          {notaSelecionada.conteudo}
        </div>
        {/* AÇÕES DA NOTA */}
<div className="flex gap-2 mt-6 flex-wrap">

  {notaSelecionada.naLixeira ? (
    <>
      <button
        onClick={() => {
          restaurarNota(
            notaSelecionada.id
          );

          setNotaSelecionada(null);
        }}
        className="
          bg-green-600
          hover:bg-green-700
          px-3
          py-2
          rounded-lg
          cursor-pointer
        "
      >
        ♻ Restaurar
      </button>

      <button
        onClick={() => {
          excluirDefinitivamente(
            notaSelecionada.id
          );

          setNotaSelecionada(null);
        }}
        className="
          bg-red-700
          hover:bg-red-800
          px-3
          py-2
          rounded-lg
          cursor-pointer
        "
      >
        ❌ Excluir Definitivamente
      </button>
    </>
  ) : (
    <>
      <button
        onClick={() => {
          alternarFavorita(
            notaSelecionada.id
          );
        }}
        className="
          bg-pink-600
          hover:bg-pink-700
          px-3
          py-2
          rounded-lg
          cursor-pointer
        "
      >
        ❤️ Favoritar
      </button>

      <button
        onClick={() => {
          alternarFixada(
            notaSelecionada.id
          );
        }}
        className="
          bg-blue-600
          hover:bg-blue-700
          px-3
          py-2
          rounded-lg
          cursor-pointer
        "
      >
        📌 Fixar
      </button>

      <button
        onClick={() => {
          iniciarEdicao(
            notaSelecionada
          );

          setNotaSelecionada(null);
        }}
        className="
          bg-yellow-500
          hover:bg-yellow-600
          px-3
          py-2
          rounded-lg
          cursor-pointer
        "
      >
        ✏️ Editar
      </button>

      <button
        onClick={() => {
          solicitarExclusao(
            notaSelecionada
          );

          setNotaSelecionada(null);
        }}
        className="
          bg-red-600
          hover:bg-red-700
          px-3
          py-2
          rounded-lg
          cursor-pointer
        "
      >
        🗑️ Excluir
      </button>
    </>
  )}

</div>

      </div>
    </div>
  );
}

export default ModalNota;