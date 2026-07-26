import {
  alternarFavoritaLocal,
  alternarFixadaLocal,
  carregarCategoriasLocal,
  carregarNotasLocal,
  carregarObservacoesLocal,
  criarCategoriaLocal,
  criarNotaLocal,
  criarObservacaoLocal,
  criarSubcategoriaLocal,
  desbloquearNotaLocal,
  editarNotaLocal,
  excluirDefinitivamenteLocal,
  excluirNotaLocal,
  excluirObservacaoLocal,
  excluirSubcategoriaLocal,
  restaurarNotaLocal
} from "./mobileStore";

export const carregarNotasService = carregarNotasLocal;
export const criarNotaService = criarNotaLocal;
export const editarNotaService = editarNotaLocal;
export const excluirNotaService = excluirNotaLocal;
export const restaurarNotaService = restaurarNotaLocal;
export const excluirDefinitivamenteService = excluirDefinitivamenteLocal;
export const alternarFavoritaService = alternarFavoritaLocal;
export const alternarFixadaService = alternarFixadaLocal;
export const desbloquearNotaService = desbloquearNotaLocal;
export const carregarObservacoesService = carregarObservacoesLocal;
export const criarObservacaoService = criarObservacaoLocal;
export const excluirObservacaoService = excluirObservacaoLocal;
export const carregarCategoriasService = carregarCategoriasLocal;
export const criarCategoriaService = criarCategoriaLocal;
export const criarSubcategoriaService = criarSubcategoriaLocal;
export const excluirSubcategoriaService = excluirSubcategoriaLocal;
