# Mundo Aberto — Guia turístico global

Versão estática em HTML, CSS e JavaScript. Os destinos e paisagens são carregados de `static/json/dados.json` (somente leitura). O visual responsivo original, slideshow, busca, filtros, detalhes, favoritos e roteiro foram mantidos.

## Executar localmente

Como o site carrega JSON usando `fetch`, abra-o por um servidor HTTP local, não diretamente como `file://`.

- **VS Code:** instale a extensão Live Server, abra `index.html` e escolha **Open with Live Server**.
- **Python, se já estiver instalado:** na pasta do projeto execute `python -m http.server 8000` e abra `http://localhost:8000`.
- **Hospedagem estática:** publique a pasta inteira em GitHub Pages, Netlify, Cloudflare Pages ou outro host que sirva arquivos estáticos. Não há etapa de build nem dependências para instalar.

## Dados e privacidade

Edite `static/json/dados.json` para alterar destinos e paisagens. O navegador apenas lê esse arquivo; JavaScript comum da página não consegue gravar alterações de volta no JSON do site.

Favoritos e roteiro ficam no `localStorage` deste navegador e deste endereço. Eles não sincronizam entre dispositivos e podem ser apagados pelo usuário. Cadastro/login seguro, sessões, sincronização e gravação compartilhada exigem um backend; por isso as telas de conta informam que esses recursos estão desativados. Não digite senhas neste protótipo.

## Estrutura

- `index.html`, `destinos.html`, `destino.html`, `favoritos.html`, `roteiro.html`: páginas estáticas.
- `login.html`, `cadastro.html`: explicação da limitação de autenticação sem servidor.
- `static/css/style.css`: estilos responsivos originais.
- `static/js/`: slideshow, interações e efeitos sem jQuery.
- `static/json/dados.json`: catálogo de destinos e imagens.

As imagens são hospedadas externamente no Unsplash e requerem conexão com a internet.
