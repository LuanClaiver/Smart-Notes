import {
  alterarSenhaUsuarioLocal,
  atualizarPerfilLocal,
  cadastroLocal,
  editarUsuarioLocal,
  excluirUsuarioLocal,
  listarUsuariosLocal,
  loginLocal,
  logoutLocal,
  recuperarSenhaLocal,
  redefinirSenhaLocal,
  usuarioAtualLocal
} from "./mobileStore";

export const loginService = loginLocal;
export const cadastroService = cadastroLocal;
export const recuperarSenhaService = recuperarSenhaLocal;
export const redefinirSenhaService = redefinirSenhaLocal;
export const usuarioAtualService = usuarioAtualLocal;
export const atualizarPerfilService = atualizarPerfilLocal;
export const listarUsuariosAdminService = listarUsuariosLocal;
export const editarUsuarioAdminService = editarUsuarioLocal;
export const alterarSenhaUsuarioAdminService = alterarSenhaUsuarioLocal;
export const excluirUsuarioAdminService = excluirUsuarioLocal;
export const logoutService = logoutLocal;

export const listarUsuariosService = listarUsuariosLocal;
