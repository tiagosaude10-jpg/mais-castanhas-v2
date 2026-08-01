# Mais Castanhas — Versão 2

Estrutura inicial da nova versão do aplicativo, criada do zero e sem vínculo com o repositório antigo.

## Conteúdo desta primeira entrega

- Tela de entrada.
- Primeiro cadastro.
- Validação de nome, CPF, telefone, e-mail e senha.
- Aviso de aprovação administrativa.
- Identidade visual verde, marrom, bege e creme.
- Logo do Mais Castanhas.
- Botão/ícone do aplicativo.
- Manifesto PWA.
- Service worker com atualização de cache organizada.
- Layout responsivo para Android, iPhone e computador.

## Importante

Esta entrega contém o front-end da tela de entrada e cadastro.

Ainda não estão conectados:

- banco de dados;
- autenticação real;
- envio do cadastro;
- aprovação de usuários;
- recuperação de senha;
- painel principal;
- módulos do sistema.

Os formulários validam os dados, mas não salvam nem enviam informações nesta fase.

## Estrutura

```text
mais-castanhas-v2-cadastro/
├── index.html
├── styles.css
├── app.js
├── manifest.webmanifest
├── sw.js
├── README.md
├── .gitignore
├── .nojekyll
└── assets/
    ├── logo-mais-castanhas.png
    ├── botao-mais-castanhas.png
    ├── icon-192.png
    └── icon-512.png
```

## Nome sugerido do novo repositório

```text
mais-castanhas-v2
```

## Descrição sugerida do repositório

```text
Versão 2 do aplicativo Mais Castanhas, iniciada pela área de entrada e cadastro de usuários.
```

## Como colocar no GitHub

1. Crie um novo repositório.
2. Use o nome `mais-castanhas-v2`.
3. Não marque a opção de criar README.
4. Envie todos os arquivos deste pacote, inclusive a pasta `assets`.
5. Faça o commit inicial.

## Ativar o GitHub Pages

1. Abra `Configurações`.
2. Entre em `Páginas`.
3. Em origem, escolha `Implantar a partir de uma ramificação`.
4. Escolha a ramificação `main`.
5. Selecione a pasta `/ raiz`.
6. Salve.

## Atualização do cache

O arquivo `sw.js` usa a identificação:

```js
const CACHE_NAME = "natural-castanhas-v2-cadastro-v1";
```

Se quiser, depois você pode renomear internamente para algo como:

```js
const CACHE_NAME = "mais-castanhas-v2-cadastro-v2";
```

Isso ajuda a impedir que o celular misture versões antigas e novas.
