/* Simula uma passagem em reais a partir da saída e do destino escolhidos. */
(() => {
  'use strict';

  // Países e territórios da ISO 3166-1, com nomes em português.
  const paises = [
    "Afeganistão", "África do Sul", "Albânia", "Alemanha", "Andorra", "Angola",
    "Anguila", "Antártida", "Antígua e Barbuda", "Arábia Saudita", "Argélia", "Argentina",
    "Armênia", "Aruba", "Austrália", "Áustria", "Azerbaijão", "Bahamas",
    "Bangladesh", "Barbados", "Barein", "Bélgica", "Belize", "Benin",
    "Bermudas", "Bielorrússia", "Bolívia", "Bósnia e Herzegovina", "Botsuana", "Brasil",
    "Brunei", "Bulgária", "Burquina Faso", "Burundi", "Butão", "Cabo Verde",
    "Camarões", "Camboja", "Canadá", "Catar", "Cazaquistão", "Chade",
    "Chile", "China", "Chipre", "Cidade do Vaticano", "Colômbia", "Comores",
    "Congo - Kinshasa", "Coreia do Norte", "Coreia do Sul", "Costa do Marfim", "Costa Rica", "Croácia",
    "Cuba", "Curaçao", "Dinamarca", "Djibuti", "Dominica", "Egito",
    "El Salvador", "Emirados Árabes Unidos", "Equador", "Eritreia", "Eslováquia", "Eslovênia",
    "Espanha", "Essuatíni", "Estados Unidos", "Estônia", "Etiópia", "Fiji",
    "Filipinas", "Finlândia", "França", "Gabão", "Gâmbia", "Gana",
    "Geórgia", "Gibraltar", "Granada", "Grécia", "Groenlândia", "Guadalupe",
    "Guam", "Guatemala", "Guernsey", "Guiana", "Guiana Francesa", "Guiné",
    "Guiné Equatorial", "Guiné-Bissau", "Haiti", "Honduras", "Hong Kong, RAE da China", "Hungria",
    "Iêmen", "Ilha Bouvet", "Ilha Christmas", "Ilha de Man", "Ilha Norfolk", "Ilhas Aland",
    "Ilhas Cayman", "Ilhas Cocos (Keeling)", "Ilhas Cook", "Ilhas Faroé", "Ilhas Geórgia do Sul e Sandwich do Sul", "Ilhas Heard e McDonald",
    "Ilhas Malvinas", "Ilhas Marianas do Norte", "Ilhas Marshall", "Ilhas Menores Distantes dos EUA", "Ilhas Pitcairn", "Ilhas Salomão",
    "Ilhas Turcas e Caicos", "Ilhas Virgens Americanas", "Ilhas Virgens Britânicas", "Índia", "Indonésia", "Irã",
    "Iraque", "Irlanda", "Islândia", "Israel", "Itália", "Jamaica",
    "Japão", "Jersey", "Jordânia", "Kuwait", "Laos", "Lesoto",
    "Letônia", "Líbano", "Libéria", "Líbia", "Liechtenstein", "Lituânia",
    "Luxemburgo", "Macau, RAE da China", "Macedônia do Norte", "Madagascar", "Malásia", "Malaui",
    "Maldivas", "Mali", "Malta", "Marrocos", "Martinica", "Maurício",
    "Mauritânia", "Mayotte", "México", "Mianmar (Birmânia)", "Micronésia", "Moçambique",
    "Moldávia", "Mônaco", "Mongólia", "Montenegro", "Montserrat", "Namíbia",
    "Nauru", "Nepal", "Nicarágua", "Níger", "Nigéria", "Niue",
    "Noruega", "Nova Caledônia", "Nova Zelândia", "Omã", "Países Baixos", "Países Baixos Caribenhos",
    "Palau", "Panamá", "Papua-Nova Guiné", "Paquistão", "Paraguai", "Peru",
    "Polinésia Francesa", "Polônia", "Porto Rico", "Portugal", "Quênia", "Quirguistão",
    "Quiribati", "Reino Unido", "República Centro-Africana", "República do Congo", "República Dominicana", "Reunião",
    "Romênia", "Ruanda", "Rússia", "Saara Ocidental", "Samoa", "Samoa Americana",
    "San Marino", "Santa Helena", "Santa Lúcia", "São Bartolomeu", "São Cristóvão e Névis", "São Martinho",
    "São Pedro e Miquelão", "São Tomé e Príncipe", "São Vicente e Granadinas", "Seicheles", "Senegal", "Serra Leoa",
    "Sérvia", "Singapura", "Sint Maarten", "Síria", "Somália", "Sri Lanka",
    "Sudão", "Sudão do Sul", "Suécia", "Suíça", "Suriname", "Svalbard e Jan Mayen",
    "Tadjiquistão", "Tailândia", "Taiwan", "Tanzânia", "Tchéquia", "Território Britânico do Oceano Índico",
    "Territórios Franceses do Sul", "Territórios palestinos", "Timor-Leste", "Togo", "Tokelau", "Tonga",
    "Trinidad e Tobago", "Tunísia", "Turcomenistão", "Turquia", "Tuvalu", "Ucrânia",
    "Uganda", "Uruguai", "Uzbequistão", "Vanuatu", "Venezuela", "Vietnã",
    "Wallis e Futuna", "Zâmbia", "Zimbábue"
  ];

  const moeda = 'BRL';
  const modalidades = {
    onibus: {
      titulo: 'Passagem de ônibus',
      precoBase: 35,
      precoPorKm: 0.22,
      distanciaPadrao: 450,
      passos: [
        'Embarque na rodoviária da sua cidade ou em um terminal próximo.',
        'Siga até a rodoviária da região de destino.',
        'Confira conexões, travessias e o transporte até a atração.'
      ]
    },
    aviao: {
      titulo: 'Passagem aérea',
      precoBase: 450,
      precoPorKm: 0.32,
      distanciaPadrao: 5500,
      passos: [
        'Embarque no aeroporto que atende sua cidade de saída.',
        'Voe até um aeroporto que atenda a região de destino, com conexão se precisar.',
        'Do aeroporto, siga até o destino com transporte local.'
      ]
    },
    local: {
      titulo: 'Deslocamento local',
      passos: ['Use transporte urbano para chegar à atração.']
    }
  };

  // A distância em linha reta serve apenas de base para o preço fictício.
  function distanciaEmKm(origem, destino) {
    const rad = graus => graus * Math.PI / 180;
    const latitude1 = rad(origem.lat), latitude2 = rad(destino.lat);
    const diferencaLongitude = rad(destino.lon - origem.lon);
    const a = Math.sin((latitude2 - latitude1) / 2) ** 2
      + Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(diferencaLongitude / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
  }

  function init(catalogo, { formatPrice, normalize, hasCoords, savedDestinations }) {
    const form = document.getElementById('transport-form');
    const orcamento = document.getElementById('budget-form');
    if (!form || !orcamento || !catalogo.length) return;

    const pais = form.elements.namedItem('pais');
    const cidade = form.elements.namedItem('cidade');
    const destino = form.elements.namedItem('destino');
    const trecho = form.elements.namedItem('trecho');
    const viajantes = form.elements.namedItem('viajantes');
    const sugestoes = document.getElementById('transport-cities');
    const vazio = document.getElementById('transport-empty');
    const resultado = document.getElementById('transport-result');
    const preco = document.getElementById('transport-price');
    const passos = document.getElementById('transport-steps');
    const acoes = document.getElementById('transport-actions');
    const pesquisar = document.getElementById('search-transport');
    const aplicar = document.getElementById('apply-transport');
    const avisoMoeda = document.getElementById('transport-currency-message');
    const moedaOrcamento = orcamento.elements.namedItem('currency');
    const porSlug = new Map(catalogo.map(item => [item.slug, item]));
    const texto = (id, valor) => { document.getElementById(id).textContent = valor; };
    const ordenar = (a, b) => a.localeCompare(b, 'pt-BR');
    let ultimoTotal = null;

    const opcoesPais = [...new Set([...paises, ...catalogo.map(item => item.pais)])].sort(ordenar);
    opcoesPais.forEach(nome => pais.add(new Option(nome, nome)));
    pais.value = opcoesPais.includes('Brasil') ? 'Brasil' : '';
    [...catalogo].sort((a, b) => ordenar(a.nome, b.nome)).forEach(item => {
      destino.add(new Option(`${item.nome} · ${item.pais}`, item.slug));
    });
    const destinoDoLink = new URLSearchParams(location.search).get('destino');
    destino.value = [destinoDoLink, ...savedDestinations].find(slug => porSlug.has(slug)) ?? '';

    function sugerirCidades() {
      const locais = catalogo.filter(item => item.pais === pais.value && item.cidade === item.nome);
      sugestoes.replaceChildren(...locais.map(item => new Option(item.cidade)));
    }
    function conferirMoeda() {
      const outraMoeda = moedaOrcamento.value !== moeda;
      aplicar.disabled = outraMoeda;
      avisoMoeda.hidden = ultimoTotal === null || !outraMoeda;
    }
    function limparSimulacao() {
      cidade.setCustomValidity('');
      viajantes.setCustomValidity('');
      ultimoTotal = null;
      resultado.hidden = true;
      vazio.hidden = false;
    }
    form.addEventListener('input', limparSimulacao);
    form.addEventListener('change', limparSimulacao);
    pais.addEventListener('change', sugerirCidades);
    moedaOrcamento.addEventListener('input', conferirMoeda);
    moedaOrcamento.addEventListener('change', conferirMoeda);
    sugerirCidades();
    form.querySelector('button[type="submit"]').disabled = false;

    form.addEventListener('submit', event => {
      event.preventDefault();
      const chegada = porSlug.get(destino.value);
      const cidadeSaida = cidade.value.trim();
      if (!cidadeSaida) {
        cidade.setCustomValidity('Informe a cidade de saída.');
        cidade.reportValidity();
        return;
      }
      if (!chegada || !opcoesPais.includes(pais.value)) return;

      const mesmoPais = normalize(pais.value) === normalize(chegada.pais);
      const nomeDaCidade = normalize(cidadeSaida);
      const mesmaCidade = mesmoPais && chegada.nome === chegada.cidade
        && normalize(chegada.cidade) === nomeDaCidade;
      const tipo = mesmaCidade ? 'local' : mesmoPais ? 'onibus' : 'aviao';
      const modalidade = modalidades[tipo];
      const saida = `${cidadeSaida}, ${pais.value}`;
      const chegadaNome = `${chegada.nome}, ${chegada.pais}`;
      ultimoTotal = null;
      if (!mesmaCidade) {
        const origem = catalogo.find(item => item.nome === item.cidade && item.pais === pais.value
          && normalize(item.cidade) === nomeDaCidade && hasCoords(item));
        const temDistancia = origem && hasCoords(chegada);
        const km = temDistancia ? distanciaEmKm(origem, chegada) : modalidade.distanciaPadrao;
        const idaEVolta = trecho.value === 'volta';
        const porPessoa = Math.ceil((modalidade.precoBase + km * modalidade.precoPorKm) / 5) * 5
          * (idaEVolta ? 2 : 1);
        const pessoas = Number(viajantes.value);
        const total = porPessoa * pessoas;
        if (pessoas < 1 || !Number.isSafeInteger(total) || !Number.isInteger(pessoas)) {
          viajantes.setCustomValidity('Informe uma quantidade válida de viajantes.');
          viajantes.reportValidity();
          return;
        }
        ultimoTotal = total;
        texto('transport-total', formatPrice(total, moeda));
        const passagem = idaEVolta ? 'ida e volta' : 'somente ida';
        const grupo = pessoas === 1 ? '1 viajante' : `${pessoas} viajantes`;
        texto('transport-breakdown', `${formatPrice(porPessoa, moeda)} por pessoa · ${passagem} · ${grupo}`);
        texto('transport-message', temDistancia
          ? 'Valor fictício baseado na distância em linha reta.'
          : 'Valor fictício da tarifa padrão para esta modalidade.');

        const meio = tipo === 'onibus' ? 'ônibus' : 'avião';
        const busca = new URL('https://www.google.com/search');
        busca.searchParams.set('q', `passagens de ${meio} de ${saida} para ${chegadaNome} ${passagem}`);
        pesquisar.href = busca.href;
        pesquisar.textContent = `Pesquisar passagens de ${meio} ↗`;
      } else {
        texto('transport-message', 'Saída e destino na mesma cidade. Considere o custo do transporte urbano.');
      }

      texto('transport-mode', modalidade.titulo);
      texto('transport-origin', saida);
      texto('transport-destination', chegadaNome);
      passos.replaceChildren(...modalidade.passos.map(descricao => {
        const item = document.createElement('li');
        item.textContent = descricao;
        return item;
      }));
      preco.hidden = mesmaCidade;
      acoes.hidden = mesmaCidade;
      conferirMoeda();
      vazio.hidden = true;
      resultado.hidden = false;
    });

    aplicar.addEventListener('click', () => {
      if (ultimoTotal === null) return;
      if (window.MundoAbertoPlanejamento.applyTransport(ultimoTotal, moeda)) {
        document.getElementById('calculadora').scrollIntoView();
        orcamento.elements.namedItem('transport').focus({ preventScroll: true });
      }
    });
  }

  window.MundoAbertoTransporte = { init };
})();
