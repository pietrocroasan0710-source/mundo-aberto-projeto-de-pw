# Mundo Aberto — Versão pública melhorada

Projeto acadêmico de Programação Web (HTML, CSS e JavaScript) — 2026.

## Como abrir no VS Code

1. Extraia o ZIP.
2. Abra a pasta `Mundo_Aberto_Melhorado` no Visual Studio Code.
3. Instale a extensão **Live Server** caso ainda não esteja instalada.
4. Abra `index.html` com **Open with Live Server**.

Não é necessário instalar bibliotecas JavaScript. Login e cadastro usam o projeto Supabase configurado em `static/js/supabase.js`, e o cliente Supabase é carregado do jsDelivr; por isso, as páginas de conta precisam de internet. O URL de retorno do site deve estar permitido nas configurações de autenticação do Supabase. O botão Google também depende de o provedor Google estar habilitado no Supabase. O mapa OpenStreetMap e as fotos originais do Unsplash também precisam de internet.

**Importante:** não abra `index.html` diretamente via `file://`, porque os dados JSON usam `fetch`. Se preferir Python, execute `python -m http.server 8000` dentro da pasta do site e abra `http://localhost:8000`.

## O que foi melhorado

- **Catálogo de turismo:** 24 destinos e 120 atrações no Brasil e no exterior. A página inicial mostra nove destaques, e a página de exploração lista todo o catálogo. Os destinos publicados vêm de `static/json/dados.json`.
- **Catálogo fechado:** destinos e pacotes são mantidos no projeto; não há fluxo de edição pública nem backend administrativo.
- **Conta de viajante:** as páginas `login.html` e `cadastro.html` estão conectadas ao Supabase. Entrar, criar conta, confirmação por e-mail (se habilitada no projeto) e Google (se configurado) usam o provedor de autenticação; não guardamos a senha no site.
- **Mais estabilidade:** dados JSON carregados uma vez; favorito/roteiro atualizam a interface sem reiniciar o slideshow. Temporizador único de slides.
- **Animações:** cartões criados depois do carregamento também aparecem com transição; opção de movimento reduzido respeitada.
- **Roteiro aprimorado:** organiza por dia (1–14), horário, observação e ordem das paradas. Pode exportar o planejamento para TXT.
- **Passagens:** em **Meu roteiro → Simular passagem**, escolha país e cidade de saída, destino, ida ou ida e volta e número de viajantes. O planejador sugere ônibus entre cidades do mesmo país e avião para viagens internacionais. O atalho **Como chegar** já seleciona o destino visitado.
- **Calculadora de orçamento:** informe dias, custo por noite, alimentação, transporte, ingressos e gastos extras. O cálculo é feito localmente e salvo neste navegador. Não realiza cotação/conversão de moedas.
- **Mapa de destinos (`mapa.html`):** mapa interativo embutido do OpenStreetMap com marcadores aproximados da cidade ou região e links individuais de cada destino.
- **Acessibilidade e responsividade:** estados do menu, feedback, botões com descrições, foco visível e layout adequado ao celular.
- **Preços:** o catálogo de passeios usa valores fictícios na moeda local. As passagens são simuladas em reais (BRL). Use **Pesquisar passagens** para consultar opções disponíveis e **Usar no orçamento** para preencher o campo de transporte de um orçamento em BRL.

## Estrutura

## Buscar pacotes por orçamento

Na busca da página inicial, informe o limite por pessoa em reais (por exemplo, `2000`); o campo formata o valor como moeda brasileira. Há pacotes demonstrativos nos 24 destinos, de R$ 1 mil a R$ 20 mil por pessoa, em faixas essenciais, de conforto e de luxo. Ao abrir um destino, use **Ver planos**. Compare até três opções lado a lado por preço, duração, hotel, transporte, refeições, benefícios, atividades e exclusões. Em **Personalizar e montar meu plano**, escolha data, viajantes, horário para sair do hotel e adicionais opcionais. Depois, há uma etapa de pagamento fictício com opções de demonstração; ela não pede dados financeiros e não processa cobrança. Ao concluir, o site cria um calendário com atividades, lugares e horários sugeridos, incluindo intervalos de deslocamento. Os tempos de trajeto são estimativas genéricas para organização; confira rotas reais e horários dos bilhetes. Você pode ajustar horários/lugares, adicionar atividades, apagar um plano ou todos os planos salvos e imprimir ou salvar o calendário em PDF. Os planos ficam no armazenamento local do navegador. Hotéis, pacotes, benefícios, adicionais e preços são exemplos fictícios; fechar a simulação não reserva uma viagem.

```text
Mundo_Aberto_Melhorado/
  index.html                Página inicial
  destinos.html             Busca e filtros
  destino.html              Detalhe de cada destino e mapa da região
  comparar.html            Comparação de destinos
  login.html               Entrar na conta
  cadastro.html            Criar conta
  montar-pacote.html       Personalização de viajantes, data e adicionais
  pagamento.html            Fechamento demonstrativo sem cobrança
  calendario.html           Cronograma da viagem salvo neste navegador
  favoritos.html            Favoritos locais
  roteiro.html              Roteiro por dias, passagens e orçamento
  mapa.html                 Mapa interativo das regiões
  static/css/style.css      Aparência responsiva
  static/js/main.js         Catálogo, busca, favoritos, menu e slides
  static/js/auth.js         Cadastro, login, Google e sessão
  static/js/supabase.js     Cliente do projeto de autenticação
  static/js/planejamento.js  Organização do roteiro e orçamento
  static/js/transporte.js    Simulação de ônibus e avião
  static/js/mapa.js         Seleção e visualização do mapa
  static/js/animacoes.js    Movimento e botão voltar ao topo
  static/json/dados.json    Destinos e coordenadas aproximadas
  static/json/pacotes.json  Pacotes demonstrativos e inclusões
  static/img/destinos/      Fotos dos novos destinos
  CREDITOS_FOTOS.md        Créditos e licenças das fotos incluídas
```

## Atualizar os destinos — somente pelo responsável pelo código

Edite `static/json/dados.json` no projeto e publique novamente os arquivos na hospedagem. Não há botão para incluir destinos no site público. Para permitir que um administrador cadastre locais online **sem disponibilizar essa opção aos clientes**, no futuro será necessário criar um painel separado e autenticado com backend e validação de permissões no servidor. Apenas ocultar um link HTML não oferece segurança.

Os campos `lat` e `lon` são **referências aproximadas** da região; não indicam obrigatoriamente a entrada exata de um ponto turístico. Não use o mapa embutido como navegação de segurança.

Os campos `preco_passeio`, `moeda`, `fonte_preco` e `atualizado_em` registram os preços de referência. Os preços e as notas desta versão são ilustrativos.

## Privacidade e limites

Favoritos, plano por dia e orçamento ficam no `localStorage` deste navegador e endereço. A conta usa o Supabase configurado pelo projeto; e-mail e senha são enviados diretamente ao serviço de autenticação quando a pessoa envia o formulário. O site não salva senhas no navegador. O mapa e as fotos originais dependem do OpenStreetMap e do Unsplash. A política de segurança limita as origens usadas.

## Conferência rápida

- [ ] A página inicial exibe nove destaques, e a exploração lista os 24 destinos.
- [ ] O menu mostra Entrar e Criar conta; o cadastro e o login funcionam com o projeto Supabase configurado.
- [ ] Favoritar, tirar dos favoritos e montar roteiro funcionam sem recarregar a página.
- [ ] Roteiro permite editar dia, horário e observações, trocar ordem e exportar TXT.
- [ ] São Paulo → Rio de Janeiro sugere ônibus. São Paulo → Paris sugere avião. Ida e volta e o número de viajantes alteram o total.
- [ ] **Usar no orçamento** preenche o campo de transporte em BRL.
- [ ] Orçamento calcula uma noite a menos que o número de dias e atualiza imediatamente.
- [ ] Mapa troca de região quando selecionado outro destino.
- [ ] Personalizar um pacote altera o total por viajantes e adicionais; salvar abre o calendário com horários e lugares, que podem ser editados, e permite inserir atividades.
- [ ] Menu abre no celular e fecha por Escape ou toque em um link.
