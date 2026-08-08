import axios from "axios";
const API_URL=`http://${window.location.hostname}:3000`;
const cfg=()=>({headers:{Authorization:`Bearer ${localStorage.getItem("smartNotesToken")}`}});
export const listarPendenciasService=()=>axios.get(`${API_URL}/pendencias`,cfg());
export const criarPendenciaService=d=>axios.post(`${API_URL}/pendencias`,d,cfg());
export const editarPendenciaService=(id,d)=>axios.put(`${API_URL}/pendencias/${id}`,d,cfg());
export const moverPendenciaService=(id,status)=>axios.patch(`${API_URL}/pendencias/${id}/status`,{status},cfg());
export const excluirPendenciaService=id=>axios.delete(`${API_URL}/pendencias/${id}`,cfg());
