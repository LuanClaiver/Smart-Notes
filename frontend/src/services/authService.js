import axios from "axios";

const API_URL = `http://${window.location.hostname}:3000`;

function config() {
  return {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("smartNotesToken")}`
    }
  };
}

export const loginService = (dados) => axios.post(`${API_URL}/auth/login`, dados);

export const cadastroService = (dados) => axios.post(`${API_URL}/auth/cadastro`, dados);

export const recuperarSenhaService = (dados) => axios.post(`${API_URL}/auth/recuperar-senha`, dados);

export const redefinirSenhaService = (dados) => axios.post(`${API_URL}/auth/redefinir-senha`, dados);

export const usuarioAtualService = (token) =>
  axios.get(`${API_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const atualizarPerfilService = (dados) => axios.put(`${API_URL}/usuarios/perfil`, dados, config());

export const listarUsuariosAdminService = () => axios.get(`${API_URL}/admin/usuarios`, config());

export const editarUsuarioAdminService = (id, dados) => axios.put(`${API_URL}/admin/usuarios/${id}`, dados, config());

export const alterarSenhaUsuarioAdminService = (id, dados) => axios.patch(`${API_URL}/admin/usuarios/${id}/senha`, dados, config());

export const excluirUsuarioAdminService = (id, dados) => axios.delete(`${API_URL}/admin/usuarios/${id}`, { ...config(), data: dados });

export const logoutService = (token) =>
  axios.post(
    `${API_URL}/auth/logout`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
