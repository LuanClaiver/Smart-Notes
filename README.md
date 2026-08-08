# Smart Notes 1.5.4

## Novidades da versão 1.5.4

- ao concluir 100% dos itens de um checklist, a pendência passa automaticamente para **Concluído** e é movida para a coluna **Concluído**, no computador e no APK;
- no computador, o botão **Baixar** do visualizador de imagens usa o download padrão do navegador, que grava na pasta **Downloads** configurada no Windows/navegador;
- no APK Android, as imagens baixadas agora são gravadas diretamente na pasta pública **Downloads**, em vez de Documentos;
- Android 10 ou superior usa o **MediaStore** do sistema para salvar em Downloads sem acesso amplo ao armazenamento; Android 9 ou anterior solicita a permissão de armazenamento somente quando necessário;
- o workflow do GitHub injeta e registra automaticamente o plugin nativo de Downloads ao gerar o projeto Android;
- alertas de validação ao criar/editar notas e pendências aparecem no canto superior direito, sempre acima das janelas abertas;
- pendências agora aceitam até 6 imagens anexadas, preservadas no SQLite, no armazenamento local do APK e nos backups;
- a janela de pendências continua compacta no quadro e possui rolagem própria quando o conteúdo crescer;
- `Esc` fecha as janelas de nova nota e edição de pendência; `Enter` salva quando o foco está em campos simples e adiciona o próximo item quando usado no checklist;
- **Gerenciar usuários** e **Subcategorias** foram movidos para dentro de **Configurações > Administração**, reduzindo os itens do menu lateral;
- o ícone de casa ao lado de **Smart Notes** agora usa o mesmo tamanho do ícone principal e fica alinhado ao cabeçalho para facilitar o retorno à tela inicial.

Aplicativo de notas privadas e compartilhadas, com backend Node.js/SQLite, frontend React para computador e aplicativo Android offline com Capacitor.

## Estrutura

```text
.github/workflows/   geração do APK Debug
backend/             API Node.js e SQLite
frontend/            interface para computador
mobile-app/          aplicativo Android offline
scripts/mobile/      versão, segurança e ícones Android
docs/screenshots/    imagens deste README
```

## Funcionalidades

- Login por usuário ou e-mail;
- nome de exibição separado do nome de usuário;
- cadastro, perfil e administração de usuários;
- notas privadas, públicas e protegidas por senha;
- categorias, subcategorias, favoritas, fixadas, imagens, observações e lixeira;
- temas claro e escuro;
- exportação e importação do banco;
- backup automático interno;
- identidade visual e ícones Android do Smart Notes 1.5.4.

## Experiência de uso

- Listagem de notas sem os cartões de categorias no topo;
- filtro de categorias e subcategorias aberto pelo botão **Filtrar**;
- visualizador de imagens com download;
- criação, edição e exclusão de subcategorias restritas ao administrador e concentradas em **Configurações > Administração**;
- tratamento do botão físico **Voltar** no Android para fechar a interface aberta antes de minimizar o aplicativo.

## Executar o Smart Notes

Dê dois cliques em **Iniciar Smart Notes.bat**. O inicializador verifica Node.js e npm, instala dependências somente quando necessário e mantém backend e frontend na mesma janela do CMD. A interface é aberta automaticamente em `http://localhost:5173`.

Para encerrar os dois serviços, pressione **Ctrl+C** ou feche essa única janela.

### Execução manual para desenvolvimento

```bash
cd backend
npm install
npm start
```

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

O backend utiliza `http://localhost:3000`.

## Gerar APK Debug

No GitHub, abra **Actions** e execute o workflow **Gerar APK Debug - Smart Notes 1.5.4**. O artefato gerado contém o APK para instalação.

## Capturas

### Tela inicial

![Tela inicial do Smart Notes](docs/screenshots/tela-inicial.png)

### Detalhes de uma nota

![Detalhes de uma nota](docs/screenshots/detalhes-nota.png)

## Segurança do repositório

O `.gitignore` exclui bancos pessoais, backups, `node_modules`, builds, chaves e arquivos temporários.

## Autor

Desenvolvido por **Luan Claiver**.

## Enviar ao GitHub e gerar o APK

Envie o projeto para a branch `main` ou `principal`. Alterações em `mobile-app`, `scripts/mobile` ou no workflow Android iniciam a geração automaticamente. Também é possível executar manualmente o workflow **Gerar APK Debug - Smart Notes 1.5.4** na aba **Actions**.

Quando o workflow terminar, baixe o artefato `Smart-Notes-APK-Debug-1.5.4` na página da execução.

## Administração de responsáveis e usuários

- Administradores podem alterar o responsável de qualquer nota pela janela de edição.
- Ao excluir um usuário, é obrigatório escolher outra conta ativa para receber as notas dele; o conteúdo não é apagado.
- O aplicativo móvel aplica as mesmas regras no banco local do aparelho.

## Compartilhamento no aplicativo móvel

O APK atual funciona de modo local/offline: cada aparelho possui seu próprio banco. Assim, uma nota marcada como compartilhada é visível apenas para outras contas cadastradas no mesmo banco daquele aparelho. Para compartilhamento entre computadores e celulares diferentes, o APK precisa operar em modo servidor, conectado à API central do Smart Notes pela rede.



## Pendências

- quadro próprio com **A fazer**, **Em andamento** e **Concluído**;
- checklist, progresso, responsável, autor, imagens anexadas e atualização automática;
- área **Individuais**, limitada às pendências que o usuário pode administrar;
- área **Equipe**, visível e editável por todos os usuários do mesmo banco;
- somente o criador ou um administrador pode excluir uma pendência da equipe.


## Enviar para o GitHub

Execute `Enviar para GitHub.bat` na raiz deste repositório. Na primeira execução, informe a URL HTTPS do repositório do GitHub. O script inicializa o Git quando necessário, cria o commit e envia a branch `main`.
