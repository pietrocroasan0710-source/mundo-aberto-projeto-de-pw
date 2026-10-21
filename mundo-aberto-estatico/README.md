# Mundo Aberto — Guia turístico global

Versão estática em HTML, CSS e JavaScript. Os destinos e paisagens são carregados de `static/json/dados.json` (somente leitura). O visual responsivo original, slideshow, busca avançada por texto (incluindo termos como “lugares bonitos” e “históricos”), país, tipo de experiência e faixa de notas, detalhes, favoritos e roteiro foram mantidos.

## Executar localmente

Como o site carrega JSON usando `fetch`, abra-o por um servidor HTTP local, não diretamente como `file://`.

- **VS Code:** instale a extensão Live Server, abra `index.html` e escolha **Open with Live Server**.
- **Python, se já estiver instalado:** na pasta do projeto execute `python -m http.server 8000` e abra `http://localhost:8000`.
- **Hospedagem estática:** publique a pasta inteira em GitHub Pages, Netlify, Cloudflare Pages ou outro host que sirva arquivos estáticos. Não há etapa de build nem dependências para instalar.

## Dados e privacidade

Edite `static/json/dados.json` para alterar destinos e paisagens. O navegador apenas lê esse arquivo; JavaScript comum da página não consegue gravar alterações de volta no JSON do site.

As notas e tags do catálogo são demonstrativas e estão em `static/json/dados.json`; não representam avaliações reais. Favoritos e roteiro ficam no `localStorage` deste navegador e deste endereço. Eles não sincronizam entre dispositivos e podem ser apagados pelo usuário. Cadastro/login seguro, sessões, sincronização e gravação compartilhada exigem um backend; por isso as telas de conta informam que esses recursos estão desativados. Não digite senhas neste protótipo.

## Estrutura

- `index.html`, `destinos.html`, `destino.html`, `favoritos.html`, `roteiro.html`: páginas estáticas.
- `login.html`, `cadastro.html`: explicação da limitação de autenticação sem servidor.
- `static/css/style.css`: estilos responsivos originais.
- `static/js/`: slideshow, interações e efeitos sem jQuery.
- `static/json/dados.json`: catálogo de destinos e imagens.

As imagens são hospedadas externamente no Unsplash e requerem conexão com a internet.

## Como ler e editar o catálogo

O arquivo JSON não aceita comentários dentro dele, então esta seção explica o que cada campo significa:

- `paisagens`: imagens e legendas usadas no slideshow da página inicial.
- `destinos`: lista de lugares exibidos pelo site.
- `slug`: identificador usado no endereço da página de detalhes.
- `categoria`, `pais`, `cidade` e `continente`: informações usadas nos filtros e na busca.
- `atracoes`, `melhor_epoca` e `duracao`: conteúdo mostrado na página de detalhes.
- `nota`: nota demonstrativa de 0 a 5, usada no filtro por faixa.
- `tags`: temas usados pela busca semântica, como `bonito`, `historico`, `natureza`, `aventura` e `gastronomia`.

Ao adicionar um destino, mantenha os mesmos campos dos destinos existentes e use uma nota entre 0 e 5.


## Adicionar lugares pelo site

Abra `adicionar.html` ou escolha **Adicionar lugar** no menu. O formulário salva os novos destinos no armazenamento local deste navegador; eles aparecem na busca, nos detalhes, nos favoritos e no roteiro. A seção “Meus lugares” permite removê-los.

Esse cadastro não altera `static/json/dados.json`, não sincroniza com outros navegadores ou dispositivos e é apagado se os dados locais do site forem removidos.

## Proteções da versão estática

- Fotos enviadas pelo formulário aceitam apenas JPEG, PNG ou WebP, têm limites de tamanho e dimensão e são abertas e convertidas para JPEG no navegador antes de serem guardadas. O arquivo não é enviado a um servidor.
- O formulário limita o número de lugares e o espaço ocupado pelos dados neste navegador.
- Os textos cadastrados são escapados antes de serem apresentados nas páginas.
- As páginas usam uma Política de Segurança de Conteúdo que bloqueia scripts externos e limita a origem das imagens e estilos.

Essas medidas ajudam a reduzir riscos no navegador, mas não tornam o conteúdo local confiável para outras pessoas. Como não existe servidor, cada pessoa pode alterar seus próprios dados do navegador. Para receber cadastros compartilhados com garantias mais fortes, o projeto precisaria de backend e regras de validação no servidor. A hospedagem também deve enviar cabeçalhos de segurança próprios para reforçar a política configurada nas páginas.
