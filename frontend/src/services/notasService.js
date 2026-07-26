import axios from "axios";

const API_URL = `http://${window.location.hostname}:3000`;

function getToken() {
  return localStorage.getItem("smartNotesToken");
}

function config() {
  return {
    headers: {
      Authorization: `Bearer ${getToken()}`
    }
  };
}

export function carregarNotasService(escopo = "todas") {
  return axios.get(`${API_URL}/notas?escopo=${escopo}`, config());
}

export function criarNotaService(dados) {
  return axios.post(`${API_URL}/notas`, dados, config());
}

export function editarNotaService(id, dados) {
  return axios.put(`${API_URL}/notas/${id}`, dados, config());
}

export function excluirNotaService(id) {
  return axios.delete(`${API_URL}/notas/${id}`, config());
}

export function restaurarNotaService(id) {
  return axios.patch(`${API_URL}/notas/${id}/restaurar`, {}, config());
}

export function excluirDefinitivamenteService(id) {
  return axios.delete(`${API_URL}/notas/${id}/permanente`, config());
}

export function alternarFavoritaService(id) {
  return axios.patch(`${API_URL}/notas/${id}/favorita`, {}, config());
}

export function alternarFixadaService(id) {
  return axios.patch(`${API_URL}/notas/${id}/fixada`, {}, config());
}

export function desbloquearNotaService(id, senha) {
  return axios.post(`${API_URL}/notas/${id}/desbloquear`, { senha }, config());
}

export function carregarObservacoesService(id) {
  return axios.get(`${API_URL}/notas/${id}/observacoes`, config());
}

export function criarObservacaoService(id, dados) {
  return axios.post(`${API_URL}/notas/${id}/observacoes`, dados, config());
}

export function excluirObservacaoService(id, observacaoId) {
  return axios.delete(`${API_URL}/notas/${id}/observacoes/${observacaoId}`, config());
}

export function carregarCategoriasService() {
  return axios.get(`${API_URL}/categorias`, config());
}

export function criarCategoriaService(dados) {
  return axios.post(`${API_URL}/categorias`, dados, config());
}

export function criarSubcategoriaService(dados) {
  return axios.post(`${API_URL}/categorias/subcategorias`, dados, config());
}

export async function excluirSubcategoriaService(subcategoria) {
  const dados = typeof subcategoria === 'object' ? subcategoria : { id: subcategoria };

  if (dados.id) {
    return axios.delete(`${API_URL}/categorias/subcategorias/${dados.id}`, config());
  }

  return axios.post(`${API_URL}/categorias/subcategorias/excluir`, dados, config());
}
