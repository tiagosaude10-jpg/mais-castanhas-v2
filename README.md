# Mais Castanhas — Versão 2

Nova estrutura do aplicativo, criada do zero e separada do repositório antigo.

## Entrega atual

- Tela de entrada.
- Primeiro cadastro em três etapas.
- Cadastro do responsável inicial.
- Cadastro da empresa ou operação.
- Revisão antes da conclusão.
- Validação de CPF, CNPJ, telefone, e-mail e senha.
- Identidade visual do Mais Castanhas.
- Manifesto e ícones do aplicativo.
- Service worker com cache versionado.
- Layout responsivo para Android, iPhone e computador.

## Cadastro inicial

O fluxo cria visualmente:

1. responsável inicial;
2. empresa ou operação;
3. perfil de proprietário e administrador.

Nesta fase, a página valida os dados no navegador, mas ainda não envia informações. A persistência será conectada posteriormente a um serviço de autenticação e banco de dados.

## Estrutura

```text
├── index.html
├── styles.css
├── app.js
├── manifest.webmanifest
├── sw.js
├── README.md
├── .gitignore
├── .nojekyll
├── logo-mais-castanhas.png
├── botao-mais-castanhas.png
├── icon-192.png
└── icon-512.png
```

## GitHub Pages

Nas configurações do repositório:

1. abra **Pages**;
2. escolha **Deploy from a branch**;
3. selecione `main`;
4. selecione `/ (root)`;
5. salve.

## Próxima etapa

Após aprovação desta tela, a próxima página será a tela de comandos do sistema.
