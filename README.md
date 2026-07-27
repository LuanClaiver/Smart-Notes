# Smart Notes 1.4.4

Smart Notes é um aplicativo de notas privadas e compartilhadas, com interface React para computador e aplicativo Android offline criado com Capacitor.

## Capturas de tela

### Tela inicial

![Tela inicial do Smart Notes](docs/screenshots/tela-inicial.png)

### Detalhes e edição de nota

![Detalhes de uma nota](docs/screenshots/detalhes-nota.png)

## Novidades da versão 1.4.4

- Formulário de login e cadastro exibido antes do painel promocional no celular.
- Nome de exibição separado do nome de usuário.
- Nome de exibição aceita espaços, acentos, apóstrofo e hífen.
- Cadastro, perfil, administração, backend SQLite e armazenamento mobile usam a mesma validação.
- Interface de banco mantém somente **Exportar banco** e **Importar banco**; o backup automático interno permanece ativo.
- Nova identidade visual com bloco de notas branco, cadeado verde e fundo azul-esverdeado escuro.
- Favicon, interface e ícones Android legados/adaptativos atualizados.
- Workflow revisado para compilar e publicar APK Debug no GitHub Actions.

## Funcionalidades

- Login por nome de usuário ou e-mail.
- Cadastro e edição de perfil.
- Administração de usuários.
- Notas privadas, públicas e públicas protegidas por senha.
- Categorias, subcategorias, favoritos, fixadas, imagens, observações e lixeira.
- Tema claro e escuro.
- Exportação e importação do banco.
- Backup automático interno.

## Estrutura

```text
.github/workflows/   workflow do APK Debug
backend/             API Node.js e banco SQLite local
frontend/            interface para computador
mobile-app/          aplicativo Android offline
scripts/mobile/      versão, segurança e ícones Android
docs/screenshots/    capturas exibidas neste README
```

## Executar no computador

Requisitos: Node.js LTS e Windows 10/11.

Na versão completa distribuída fora do GitHub, execute `Iniciar Smart Notes.bat`. No repositório, inicie backend e frontend diretamente com `npm install` e `npm start`/`npm run dev` em seus respectivos diretórios.

Conta administrativa inicial:

```text
Usuário: Admin
E-mail: admin@smartnotes.com
Senha: 1234
```

Troque a senha após o primeiro acesso.

## Gerar o APK Debug

1. Abra **Actions** no GitHub.
2. Execute **Gerar APK Debug - Smart Notes 1.4.4**.
3. Baixe o artefato **Smart-Notes-APK-Debug-1.4.4**.
4. Extraia e instale `Smart-Notes-v1.4.4-Debug.apk`.

O workflow valida JSON, instala dependências com `npm install`, compila React/JSX com Vite, confirma TypeScript, cria o projeto Capacitor Android, aplica versão e ícones e executa `assembleDebug`.

## Arquivos que não pertencem ao GitHub

O `.gitignore` bloqueia bancos pessoais, backups, `node_modules`, builds, chaves, arquivos temporários, TXT e BAT.

## Autor

Desenvolvido por **Luan Claiver**.
