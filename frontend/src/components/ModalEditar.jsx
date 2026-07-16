import { useState, useEffect } from "react";

function ModalEditar({
  nota,
  temaEscuro,
  setModalEditar,
  editarNota
}) {

  const [titulo, setTitulo] =
    useState("");

  const [conteudo, setConteudo] =
    useState("");

  const [categoria, setCategoria] =
    useState("Atendimentos");

  // PREENCHE OS CAMPOS COM A NOTA SELECIONADA
  useEffect(() => {

    if (!nota) return;

    setTitulo(nota.titulo);
    setConteudo(nota.conteudo);
    setCategoria(nota.categoria);

  }, [nota]);

  // FECHAR COM ESC
  useEffect(() => {

    function fecharComEsc(event) {

      if (event.key === "Escape") {
        setModalEditar(false);
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

  }, [setModalEditar]);

  if (!nota) return null;

  return (

    <div
      onClick={() =>
        setModalEditar(false)
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
        onClick={(e) =>
          e.stopPropagation()
        }
        className={`
        w-full
        max-w-3xl
        mx-4
        p-8 md:p-10
        rounded-3xl
        shadow-2xl
          ${
            temaEscuro
              ? "bg-gray-800 text-white"
              : "bg-slate-50 text-black"
          }
        `}
      >

        {/* TÍTULO */}

        <div className="flex items-center justify-between mb-6">

        <h2 className="text-3xl md:text-4xl font-bold">
            ✏️ Editar Nota
        </h2>

        <button
            onClick={() => setModalEditar(false)}
            className={`
                w-11
                h-11
                rounded-lg
                cursor-pointer
                transition-all
                ${
                    temaEscuro
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-red-500 hover:bg-red-600 text-white shadow-md"
                }
            `}
        >
            ✖
        </button>

        </div>

        {/* TÍTULO DA NOTA */}
          <label className="block mb-2 font-medium">
        📝 Título
        </label>
        <input
          value={titulo}
          onChange={(e) =>
            setTitulo(e.target.value)
          }
          placeholder="Título"
          className={`
            w-full
            p-3
            rounded-xl
            border
            outline-none
            ${
                temaEscuro
                ? "bg-gray-700 border-gray-600 text-white"
                : "bg-gray-100 border-gray-300 text-black"
            }
            `}
        />

        {/* CATEGORIA */}

          <label className="block mb-2 font-medium mt-4">
        📂 Categoria
        </label>
        <select
            value={categoria}
            onChange={(e) =>
                setCategoria(e.target.value)
            }
            className={`
            w-full
            p-3
            rounded-xl
            border
            outline-none
            ${
                temaEscuro
                ? "bg-gray-700 border-gray-600 text-white"
                : "bg-gray-100 border-gray-300 text-black"
            }
            `}
            >

          <option value="Atendimentos">
            Atendimentos
            </option>

            <option value="Trabalho">
            Trabalho
            </option>

            <option value="Projetos">
            Projetos
            </option>

            <option value="Documentação">
            Documentação
            </option>

        </select>

        {/* CONTEÚDO */}
          <label className="block mb-2 font-medium mt-4">
        📄 Conteúdo
        </label>
        <textarea
          value={conteudo}
          onChange={(e) =>
            setConteudo(e.target.value)
          }
          rows={14}
          className={`
            w-full
            p-3
            rounded-xl
            border
            outline-none
            ${
                temaEscuro
                ? "bg-gray-700 border-gray-600 text-white"
                : "bg-gray-100 border-gray-300 text-black"
            }
            `}
        />

        {/* BOTÕES */}

        <div className="flex justify-end gap-3 mt-6">

          <button
            onClick={() =>
                setModalEditar(false)
            }
            className={`
                px-5
                py-2
                rounded-xl
                cursor-pointer
                transition-all
                ${
                temaEscuro
                    ? "bg-gray-600 hover:bg-gray-700 text-white"
                    : "bg-gray-300 hover:bg-gray-400 text-gray-900 shadow-md"
                }
            `}
            >
            Cancelar
            </button>

          <button
            onClick={() => {

              editarNota(
                nota.id,
                titulo,
                conteudo,
                categoria
              );

              setModalEditar(false);

            }}
            className={`
                px-5
                py-2
                rounded-xl
                font-semibold
                cursor-pointer
                transition-all
                shadow-lg
                ${
                    temaEscuro
                    ? "bg-blue-600 hover:bg-blue-700 text-white hover:shadow-blue-500/40"
                    : "bg-blue-500 hover:bg-blue-600 text-white shadow-md"
                }
            `}
          >
            Salvar
          </button>

        </div>

      </div>

    </div>

  );

}

export default ModalEditar;