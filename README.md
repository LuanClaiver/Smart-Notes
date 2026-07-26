# Smart Notes 1.4.1

Aplicativo de notas com versão para computador e aplicativo Android.

## Principais funções

- Login usando **nome de usuário ou e-mail**.
- Cadastro de usuários e gerenciamento pelo administrador.
- Notas privadas, visíveis somente para o autor e para administradores.
- Notas públicas, exibidas na área **Comunidade** para outros usuários do mesmo banco.
- Nota pública opcionalmente protegida por senha.
- Categorias, subcategorias, imagens e observações em notas públicas.
- Favoritas e fixadas individuais por usuário.
- Lixeira, restauração e exclusão definitiva.
- Edição de perfil e recuperação local de senha.
- Backup diário automático no computador.
- Backup manual, exportação e importação do banco.
- Barra lateral fixa no computador.
- Navegação inferior no celular.

## Estrutura

```text
backend/       servidor Node.js e banco SQLite do computador
frontend/      interface React usada no computador
mobile-app/    aplicativo Android offline com banco local próprio
.github/       fluxos do GitHub Actions para gerar o APK
scripts/       ajustes usados durante a compilação Android
```

## Executar no computador

No Windows, execute:

```text
Iniciar Smart Notes.bat
```

Na primeira execução, o arquivo instala as dependências do backend e do frontend. Depois abre:

```text
http://localhost:5173
```

Conta administrativa inicial:

```text
Usuário: Admin
E-mail: admin@smartnotes.com
Senha: 1234
```

Troque a senha após o primeiro acesso.

## Bancos do computador e do celular

A versão do computador usa SQLite em `backend/notas.db`.

O APK usa um banco local próprio no armazenamento privado do aplicativo. A exportação do APK gera um arquivo JSON completo, que pode ser importado novamente no APK.

Os bancos do computador e do APK são independentes. Eles não sincronizam automaticamente.

## Notas públicas

No computador, todos os usuários cadastrados no mesmo servidor/banco conseguem visualizar as notas marcadas como públicas.

No APK offline, todos os usuários cadastrados dentro daquele mesmo aplicativo/banco local conseguem visualizar as notas públicas. Para compartilhar notas automaticamente entre celulares diferentes será necessário, em uma versão futura, hospedar um servidor central ou serviço em nuvem.

## Gerar o APK

Consulte:

```text
COMO ENVIAR AO GITHUB E GERAR O APK.txt
```
