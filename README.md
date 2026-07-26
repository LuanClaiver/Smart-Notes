# Smart Notes

Aplicativo de anotações pessoais e colaborativas com versões para **Windows**, **navegador local** e **Android**. O projeto organiza notas por categorias e subcategorias, separa conteúdo público e privado e mantém os dados em banco local.

> Versão atual: **1.4.3**

## Capturas de tela

### Tela inicial

![Tela inicial do Smart Notes](docs/screenshots/tela-inicial.png)

### Visualização e edição de nota

![Detalhes de uma nota](docs/screenshots/detalhes-nota.png)

## Funcionalidades

- Login com **nome de usuário ou e-mail**.
- Cadastro e edição de perfil.
- Administração de usuários.
- Notas privadas, visíveis ao autor e aos administradores.
- Notas públicas exibidas na área **Comunidade**.
- Proteção opcional de nota pública por senha.
- Categorias e subcategorias.
- Notas favoritas e fixadas por usuário.
- Inclusão de imagens e observações.
- Lixeira, restauração e exclusão definitiva.
- Tema claro e escuro.
- Backup manual e diário.
- Exportação e importação do banco.
- Menu lateral no computador.
- Navegação inferior no aplicativo Android.
- APK de teste ou assinado gerado pelo GitHub Actions.

## Tecnologias

| Área | Tecnologias |
|---|---|
| Interface | React, Vite e CSS |
| Servidor | Node.js e Express |
| Banco do computador | SQLite |
| Aplicativo Android | Capacitor |
| Automação | GitHub Actions |
| Build Android | Java 21 e Gradle |

## Estrutura do repositório

```text
.github/workflows/   geração da chave e do APK
backend/             API Node.js e banco SQLite local
frontend/            interface usada no computador
mobile-app/          interface e configuração do aplicativo Android
scripts/mobile/      ajustes aplicados durante o build Android
docs/screenshots/    imagens usadas neste README
```

## Executar no Windows

Requisitos:

- Node.js LTS instalado.
- Windows 10 ou 11.

Na raiz do projeto, execute:

```text
Iniciar Smart Notes.bat
```

Na primeira execução, as dependências são instaladas automaticamente. Depois, a interface abre em:

```text
http://localhost:5173
```

### Conta administrativa inicial

```text
Usuário: Admin
E-mail: admin@smartnotes.com
Senha: 1234
```

Altere a senha após o primeiro acesso.

## Banco, backup, exportação e importação

A versão de computador usa o banco:

```text
backend/notas.db
```

Esse arquivo não é enviado ao GitHub. O `.gitignore` também impede o envio de backups, chaves Android, dependências e arquivos temporários.

Pelas configurações do sistema é possível:

- criar um backup imediatamente;
- exportar uma cópia completa do banco;
- importar um banco anterior;
- manter backups diários automáticos.

## Notas públicas e privadas

- **Privada:** somente o autor e administradores podem visualizar.
- **Pública:** aparece na Comunidade para os usuários do mesmo banco.
- **Pública protegida:** aparece na Comunidade, mas exige senha para abrir.

A versão atual não sincroniza bancos automaticamente entre computadores ou celulares diferentes. Para compartilhamento em tempo real entre dispositivos será necessário hospedar o backend em um servidor central.

## Gerar o APK pelo GitHub

O workflow está em:

```text
.github/workflows/02-gerar-apk-android.yml
```

Para gerar um APK de teste:

1. Abra a guia **Actions** do repositório.
2. Selecione **02 - Gerar APK Android - Smart Notes 1.4.3**.
3. Clique em **Run workflow**.
4. Aguarde a execução ficar verde.
5. Baixe o artefato **Smart-Notes-APK-1.4.3**.

Sem segredos de assinatura, o workflow gera um APK `debug`, adequado para testes. Com os quatro segredos abaixo, ele gera um APK release assinado:

```text
ANDROID_KEYSTORE_BASE64
ANDROID_KEYSTORE_PASSWORD
ANDROID_KEY_ALIAS
ANDROID_KEY_PASSWORD
```

O workflow **01 - Gerar chave Android** auxilia na criação da chave de assinatura.

## Instalar no Android

1. Baixe o artefato gerado pelo GitHub Actions.
2. Extraia `Smart-Notes.apk`.
3. Envie o arquivo ao celular.
4. Autorize a instalação de aplicativos desconhecidos quando o Android solicitar.
5. Instale e abra o aplicativo.

## Segurança do repositório

Não devem ser publicados:

- `backend/notas.db`;
- backups pessoais;
- arquivos `.jks` ou `.keystore`;
- conteúdo de `keystore-base64.txt`;
- senhas e variáveis `.env`;
- diretórios `node_modules`, `dist`, `android` e `APK`.

Esses itens já estão protegidos pelo `.gitignore`.

## Autor

Desenvolvido por **Luan Claiver**.
