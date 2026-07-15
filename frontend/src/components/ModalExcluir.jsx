function ModalExcluir({
  modalExcluir,
  notaParaExcluir,
  temaEscuro,
  setModalExcluir,
  excluirNota
}) {
  if (!modalExcluir) return null;

  return (
    <div
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
        className={`
          p-5
          rounded-2xl
          shadow-lg
          ${
            temaEscuro
              ? "bg-gray-800"
              : "bg-white text-black"
          }
        `}
      >
        <h2 className="text-xl font-bold mb-4">
          🗑️ Excluir Nota?
        </h2>

        <p className="mb-6">
          Deseja realmente excluir:
          <br />
          <strong>
            {notaParaExcluir?.titulo}
          </strong>
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={() =>
              setModalExcluir(false)
            }
            className="
              bg-gray-600
              px-4
              py-2
              rounded-lg
            "
          >
            Cancelar
          </button>

          <button
            onClick={excluirNota}
            className="
              bg-red-600
              px-4
              py-2
              rounded-lg
            "
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalExcluir;