import {
  criarBackupLocal,
  exportarBancoLocal,
  importarBancoLocal,
  listarBackupsLocal
} from "./mobileStore";

export const listarBackupsService = listarBackupsLocal;
export const criarBackupService = criarBackupLocal;
export const exportarBancoService = exportarBancoLocal;
export const importarBancoService = importarBancoLocal;
