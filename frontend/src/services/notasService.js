import axios from "axios";

const API_URL =
  `http://${window.location.hostname}:3000`;

export const carregarNotasService = () =>
  axios.get(`${API_URL}/notas`);

export const criarNotaService = (dados) =>
  axios.post(`${API_URL}/notas`, dados);

export const editarNotaService = (id, dados) =>
  axios.put(
    `${API_URL}/notas/${id}`,
    dados
  );

export const excluirNotaService = (id) =>
  axios.delete(
    `${API_URL}/notas/${id}`
  );

export const alternarFavoritaService = (id) =>
  axios.patch(
    `${API_URL}/notas/${id}/favorita`
  );

export const alternarFixadaService = (id) =>
  axios.patch(
    `${API_URL}/notas/${id}/fixada`
  );

export const restaurarNotaService = (id) =>
  axios.patch(
    `${API_URL}/notas/${id}/restaurar`
  );

export const excluirDefinitivamenteService = (id) =>
  axios.delete(
    `${API_URL}/notas/${id}/permanente`
  );