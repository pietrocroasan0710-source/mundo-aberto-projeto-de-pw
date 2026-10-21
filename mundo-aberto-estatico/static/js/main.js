/*
 * Lógica principal do site.
 * O catálogo vem do JSON; favoritos e roteiro ficam guardados neste navegador.
 */
(function () {
  const DATA_URL = 'static/json/dados.json';
  const STORAGE_KEYS = {
    favorites: 'mundoAberto.favoritos',
    itinerary: 'mundoAberto.roteiro',
    userDestinations: 'mundoAberto.lugaresAdicionados',
  };

  // Lê uma lista do localStorage e recupera uma lista vazia se o conteúdo estiver inválido.
  function readList(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  // Salva favoritos ou roteiro localmente, sem tentar alterar o arquivo JSON do projeto.
  function saveList(key, list) {
    localStorage.setItem(key, JSON.stringify(list));
  }

  // Escapa texto vindo dos dados antes de inseri-lo no HTML.
  function escapeHtml(value) {
    const characters = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };

    return String(value ?? '').replace(/[&<>"']/g, (character) => characters[character]);
  }

  function detailUrl(slug) {
    return 'destino.html?slug=' + encodeURIComponent(slug);
  }

  // Cria um cartão reutilizável para a página inicial, resultados e favoritos.
  function createCard(destination, favorites) {
    const isFavorite = favorites.includes(destination.slug);

    return `
      <article class="destination-card reveal">
        <a class="card-image" href="${detailUrl(destination.slug)}">
          <img src="${escapeHtml(destination.imagem)}" alt="Paisagem de ${escapeHtml(destination.nome)}" loading="lazy">
          <span class="card-country">${escapeHtml(destination.emoji)} ${escapeHtml(destination.pais)}</span>
          <span class="card-arrow">↗</span>
        </a>
        <div class="card-info">
          <p>${escapeHtml(destination.categoria)} <span>· ${escapeHtml(destination.duracao)}</span></p>
          <h3><a href="${detailUrl(destination.slug)}">${escapeHtml(destination.nome)}</a></h3>
          <p class="card-description">${escapeHtml(destination.resumo)}</p>
          <div class="card-actions">
            <span class="destination-rating" title="Nota demonstrativa">★ ${Number(destination.nota || 0).toFixed(1)} <small>exemplo</small></span>
            <a href="${detailUrl(destination.slug)}" class="text-link">Conhecer ↗</a>
            <button class="heart-btn ${isFavorite ? 'is-favorite' : ''}" data-favorite="${escapeHtml(destination.slug)}" aria-label="Alternar favorito" aria-pressed="${isFavorite}">
              ${isFavorite ? '♥' : '♡'}
            </button>
          </div>
        </div>
      </article>`;
  }

  // Controla o menu compacto e atualiza a quantidade de destinos no roteiro.
  function initializeMenu() {
    const button = document.getElementById('menuToggle');
    const menu = document.getElementById('menu');

    if (button && menu && !button.dataset.bound) {
      button.dataset.bound = 'true';
      button.addEventListener('click', () => {
        const isOpen = menu.classList.toggle('menu-aberto');
        button.setAttribute('aria-expanded', String(isOpen));
        button.textContent = isOpen ? '×' : '☰';
      });
    }

    document.querySelectorAll('[data-roteiro-count]').forEach((element) => {
      element.textContent = readList(STORAGE_KEYS.itinerary).length;
    });
  }

  function showMessage(message) {
    let container = document.querySelector('.flash-wrap');
    if (!container) {
      container = document.createElement('div');
      container.className = 'flash-wrap';
      document.body.appendChild(container);
    }

    container.innerHTML = '<div class="flash sucesso" role="status">' + escapeHtml(message) + '</div>';
    setTimeout(() => container.remove(), 2800);
  }

  // Converte variações com e sem acento para a mesma forma de busca.
  function normalizeText(value) {
    return value
      .toLocaleLowerCase('pt-BR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  // Palavras relacionadas ajudam a busca a entender pedidos como “lugares bonitos”.
  const searchSynonyms = {
    bonito: ['bonito', 'bonita', 'bonitos', 'bonitas', 'lindo', 'linda', 'lindos', 'lindas', 'belo', 'bela', 'beleza', 'paisagem', 'paisagens', 'beautiful'],
    historico: ['historico', 'historica', 'historicos', 'historicas', 'historia', 'cultura', 'cultural', 'antigo', 'antiga', 'historical'],
    natureza: ['natureza', 'natural', 'praia', 'praias', 'montanha', 'montanhas', 'floresta', 'lago', 'trilha'],
    aventura: ['aventura', 'aventuras', 'ao', 'ar', 'livre', 'trilha'],
    gastronomia: ['comida', 'gastronomia', 'culinaria', 'restaurante'],
  };
  const fillerWords = new Set(['lugar', 'lugares', 'destino', 'destinos', 'de', 'do', 'da', 'dos', 'das', 'para', 'com']);

  function matchesSearch(destination, words) {
    if (!words.length) return true;

    const searchableText = normalizeText([
      destination.nome,
      destination.cidade,
      destination.pais,
      destination.descricao,
      destination.categoria,
      destination.continente,
      ...(destination.tags || []),
    ].join(' '));
    const tags = destination.tags || [];
    const hasSemanticMatch = Object.entries(searchSynonyms).some(([tag, synonyms]) =>
      synonyms.some((word) => words.includes(word)) && tags.includes(tag)
    );
    const knownSynonyms = new Set(Object.values(searchSynonyms).flat());
    const remainingWords = words.filter((word) => !knownSynonyms.has(word) && !fillerWords.has(word));

    // Termos adicionais, como o nome de uma cidade, ainda precisam combinar com o destino.
    return remainingWords.every((word) => searchableText.includes(word))
      && (hasSemanticMatch || words.every((word) => searchableText.includes(word)));
  }

  // Filtra a lista e atualiza os cartões e a mensagem de resultados.
  function renderDestinations(destinations, grid, controls, favorites, onlyFavorites) {
    const { search, country, category, minRating, maxRating } = controls;
    const words = normalizeText(search?.value || '').trim().split(/\s+/).filter(Boolean);
    const minimum = minRating?.value === '' || !minRating ? 0 : Number(minRating.value);
    const maximum = maxRating?.value === '' || !maxRating ? 5 : Number(maxRating.value);

    const results = destinations.filter((destination) => {
      if (onlyFavorites && !favorites.includes(destination.slug)) return false;
      if (!matchesSearch(destination, words)) return false;
      if (country?.value && destination.pais !== country.value) return false;
      if (category?.value && destination.categoria !== category.value) return false;

      const rating = Number(destination.nota || 0);
      return rating >= minimum && rating <= maximum;
    });

    grid.innerHTML = results.map((destination) => createCard(destination, favorites)).join('');

    const count = document.getElementById('results-count');
    const emptyState = document.getElementById('empty-state');
    if (count) count.textContent = results.length + (results.length === 1 ? ' destino encontrado' : ' destinos encontrados');
    if (emptyState) emptyState.hidden = results.length > 0;
  }

  function initializeListing(destinations) {
    const grid = document.getElementById('destination-grid');
    if (!grid) return;

    const parameters = new URLSearchParams(location.search);
    const controls = {
      search: document.getElementById('search'),
      country: document.getElementById('country'),
      category: document.getElementById('category'),
      minRating: document.getElementById('rating-min'),
      maxRating: document.getElementById('rating-max'),
    };

    // Permite abrir uma busca compartilhada por endereço, por exemplo ?q=Paris.
    if (controls.search) controls.search.value = parameters.get('q') || '';
    if (controls.minRating) controls.minRating.value = parameters.get('notaMin') || '';
    if (controls.maxRating) controls.maxRating.value = parameters.get('notaMax') || '';

    if (controls.country) {
      [...new Set(destinations.map((destination) => destination.pais))]
        .sort()
        .forEach((country) => controls.country.add(new Option(country, country)));
      controls.country.value = parameters.get('pais') || '';
    }

    if (controls.category) {
      [...new Set(destinations.map((destination) => destination.categoria))]
        .sort()
        .forEach((category) => controls.category.add(new Option(category, category)));
      controls.category.value = parameters.get('categoria') || '';
    }

    const onlyFavorites = grid.hasAttribute('data-favorites-only');
    const updateResults = () => renderDestinations(
      destinations,
      grid,
      controls,
      readList(STORAGE_KEYS.favorites),
      onlyFavorites
    );

    updateResults();
    Object.values(controls).filter(Boolean).forEach((control) => {
      if (control.dataset.bound) return;
      control.dataset.bound = 'true';
      control.addEventListener(control.tagName === 'INPUT' ? 'input' : 'change', updateResults);
    });

    const form = document.getElementById('filters');
    if (form && !form.dataset.bound) {
      form.dataset.bound = 'true';
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        updateResults();
      });
    }
  }

  function initializeSlideshow(data) {
    const slideshow = document.getElementById('slideshow');
    if (!slideshow || !data.paisagens?.length) return;

    const label = document.getElementById('legenda');
    let current = 0;

    function showNextLandscape() {
      const landscape = data.paisagens[current % data.paisagens.length];
      current++;
      slideshow.style.backgroundImage = 'url("' + landscape.url + '")';
      if (label) label.textContent = '✦ ' + (landscape.local || 'PAISAGENS PELO MUNDO').toUpperCase();
    }

    showNextLandscape();
    setInterval(showNextLandscape, 6000);
  }

  function initializeDetails(destinations) {
    const container = document.getElementById('detail-root');
    if (!container) return;

    const slug = new URLSearchParams(location.search).get('slug');
    const destination = destinations.find((item) => item.slug === slug);
    if (!destination) {
      container.innerHTML = '<section class="error-state"><p class="eyebrow dark">404</p><h1>Destino não encontrado</h1><a class="btn-dark" href="destinos.html">Ver destinos ↗</a></section>';
      return;
    }

    const favorites = readList(STORAGE_KEYS.favorites);
    const itinerary = readList(STORAGE_KEYS.itinerary);
    const isFavorite = favorites.includes(destination.slug);
    const isPlanned = itinerary.includes(destination.slug);
    document.title = destination.nome + ' — Mundo Aberto';

    container.innerHTML = `
      <section class="detail-hero">
        <img src="${escapeHtml(destination.imagem)}" alt="Paisagem de ${escapeHtml(destination.nome)}">
        <div class="detail-shade"></div>
        <div class="detail-hero-content">
          <a class="back-link" href="destinos.html">← Todos os destinos</a>
          <p class="eyebrow"><span></span> ${escapeHtml(destination.continente.toUpperCase())} · ${escapeHtml(destination.pais.toUpperCase())}</p>
          <h1>${escapeHtml(destination.nome)}</h1>
          <p>${escapeHtml(destination.resumo)}</p>
        </div>
        <span class="detail-flag">${escapeHtml(destination.emoji)}</span>
      </section>
      <section class="detail-layout">
        <article class="detail-main">
          <p class="eyebrow dark">UM POUCO SOBRE O LUGAR</p>
          <h2>Uma experiência para lembrar.</h2>
          <p class="detail-description">${escapeHtml(destination.descricao)}</p>
          <h3>O que vale conhecer</h3>
          <div class="attraction-list">
            ${destination.atracoes.map((attraction, index) => `
              <div><span>${String(index + 1).padStart(2, '0')}</span><strong>${escapeHtml(attraction)}</strong><span>↗</span></div>
            `).join('')}
          </div>
          <div class="travel-note">
            <span>✦</span>
            <div><strong>Dica de planejamento</strong><p>Melhor época: ${escapeHtml(destination.melhor_epoca)}. Para aproveitar com calma, reserve ${escapeHtml(destination.duracao)}.</p></div>
          </div>
        </article>
        <aside class="detail-aside">
          <p class="eyebrow dark">GUARDE PARA SUA VIAGEM</p>
          <h3>Não perca esse lugar de vista.</h3>
          <p>Seus favoritos e roteiro ficam salvos localmente neste navegador.</p>
          <button class="btn-outline full-width" data-favorite="${escapeHtml(destination.slug)}">${isFavorite ? '♥ Remover dos favoritos' : '♡ Salvar nos favoritos'}</button>
          <button class="btn-dark full-width" data-itinerary="${escapeHtml(destination.slug)}">${isPlanned ? '✓ Remover do roteiro' : '+ Adicionar ao meu roteiro'}</button>
          <div class="aside-meta">
            <span>⌖ País</span><strong>${escapeHtml(destination.pais)}</strong>
            <span>◷ Tempo sugerido</span><strong>${escapeHtml(destination.duracao)}</strong>
            <span>✧ Categoria</span><strong>${escapeHtml(destination.categoria)}</strong>
          </div>
        </aside>
      </section>`;
  }

  function initializeItinerary(destinations) {
    const container = document.getElementById('itinerary-list');
    if (!container) return;

    const itinerary = readList(STORAGE_KEYS.itinerary);
    const selected = destinations.filter((destination) => itinerary.includes(destination.slug));

    container.innerHTML = selected.map((destination) => `
      <article class="itinerary-item">
        <img src="${escapeHtml(destination.imagem)}" alt="${escapeHtml(destination.nome)}">
        <div>
          <span>${escapeHtml(destination.emoji)} ${escapeHtml(destination.pais)} · ${escapeHtml(destination.categoria)}</span>
          <h2><a href="${detailUrl(destination.slug)}">${escapeHtml(destination.nome)}</a></h2>
          <p>${escapeHtml(destination.resumo)}</p>
        </div>
        <button class="remove-btn" data-itinerary="${escapeHtml(destination.slug)}">Remover ×</button>
      </article>`).join('');

    const emptyState = document.getElementById('empty-state');
    const count = document.getElementById('results-count');
    const action = document.getElementById('itinerary-action');
    if (emptyState) emptyState.hidden = selected.length > 0;
    if (count) count.textContent = selected.length + (selected.length === 1 ? ' destino no roteiro' : ' destinos no roteiro');
    if (action) action.hidden = !selected.length;
  }

  // Cria um identificador simples para usar no endereço dos lugares adicionados.
  function createSlug(value) {
    return normalizeText(value)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // Exibe os lugares próprios e permite remover um cadastro salvo por engano.
  function renderUserPlaces() {
    const list = document.getElementById('my-places-list');
    if (!list) return;

    const places = readList(STORAGE_KEYS.userDestinations);
    const empty = document.getElementById('my-places-empty');
    if (empty) empty.hidden = places.length > 0;

    list.innerHTML = places.map((place) => `
      <article class="itinerary-item">
        <img src="${escapeHtml(place.imagem)}" alt="${escapeHtml(place.nome)}">
        <div>
          <span>${escapeHtml(place.emoji)} ${escapeHtml(place.pais)} · ${escapeHtml(place.categoria)}</span>
          <h2><a href="${detailUrl(place.slug)}">${escapeHtml(place.nome)}</a></h2>
          <p>${escapeHtml(place.resumo)}</p>
        </div>
        <button class="remove-btn" data-delete-place="${escapeHtml(place.slug)}">Excluir</button>
      </article>`).join('');
  }

  // Guarda o formulário no navegador e mostra o lugar junto com o catálogo original.
  function initializePlaceForm(destinations) {
    const form = document.getElementById('add-place-form');
    if (!form || form.dataset.bound) return;

    form.dataset.bound = 'true';
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;

      const values = new FormData(form);
      const name = String(values.get('name')).trim();
      const slugBase = createSlug(name);
      const places = readList(STORAGE_KEYS.userDestinations);
      const slug = destinations.some((place) => place.slug === slugBase)
        ? slugBase + '-' + Date.now().toString(36)
        : slugBase;
      const imageInput = String(values.get('image') || '').trim();
      const imageUrl = imageInput || 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1100&q=85';

      // Aceita somente endereços HTTPS para imagens adicionadas pelo formulário.
      if (imageInput && !/^https:\/\//i.test(imageInput)) {
        document.getElementById('place-form-message').textContent = 'Use um endereço de imagem que comece com https://.';
        return;
      }

      const place = {
        id: 'custom-' + Date.now(),
        slug,
        nome: name,
        cidade: String(values.get('city')).trim(),
        pais: String(values.get('country')).trim(),
        continente: String(values.get('continent')).trim() || 'Não informado',
        categoria: String(values.get('category')),
        emoji: String(values.get('emoji')).trim() || '📍',
        imagem: imageUrl,
        resumo: String(values.get('summary')).trim(),
        descricao: String(values.get('description')).trim(),
        atracoes: String(values.get('attractions')).split(',').map((item) => item.trim()).filter(Boolean),
        melhor_epoca: String(values.get('season')).trim() || 'Consulte fontes locais',
        duracao: String(values.get('duration')).trim() || 'A definir',
        nota: Number(values.get('rating') || 0),
        tags: [String(values.get('tag'))],
        criadoPeloUsuario: true,
      };

      try {
        saveList(STORAGE_KEYS.userDestinations, [...places, place]);
        form.reset();
        document.getElementById('place-form-message').textContent = 'Lugar salvo neste navegador. Ele já aparece na busca e no catálogo.';
        renderUserPlaces();
      } catch {
        document.getElementById('place-form-message').textContent = 'Não foi possível salvar. O armazenamento do navegador pode estar cheio.';
      }
    });
  }

  // Carrega os dados e monta somente a parte da página que existe no HTML atual.
  async function initializePage() {
    initializeMenu();

    try {
      const response = await fetch(DATA_URL);
      if (!response.ok) throw new Error('Não foi possível carregar os dados.');
      const data = await response.json();
      // Junta o catálogo publicado aos lugares cadastrados neste navegador.
      const destinations = [...(data.destinos || []), ...readList(STORAGE_KEYS.userDestinations)];
      const favorites = readList(STORAGE_KEYS.favorites);
      const homeGrid = document.getElementById('home-destinations');

      initializeSlideshow(data);
      if (homeGrid) {
        const limit = Number(homeGrid.dataset.limit || 6);
        homeGrid.innerHTML = destinations.slice(0, limit).map((item) => createCard(item, favorites)).join('');
      }

      initializeListing(destinations);
      initializeDetails(destinations);
      initializeItinerary(destinations);
      initializePlaceForm(destinations);
      renderUserPlaces();
    } catch {
      const target = document.querySelector('#destination-grid, #home-destinations, #detail-root');
      if (target) {
        target.innerHTML = '<div class="empty-state"><h2>Não foi possível carregar os destinos</h2><p>Abra o projeto com um servidor estático local, por exemplo, Live Server.</p></div>';
      }
    }
  }

  // Os cliques são tratados no documento para continuar funcionando após recriar os cartões.
  document.addEventListener('click', (event) => {
    const favoriteButton = event.target.closest('[data-favorite]');
    const itineraryButton = event.target.closest('[data-itinerary]');
    const deleteButton = event.target.closest('[data-delete-place]');

    if (favoriteButton) {
      const slug = favoriteButton.dataset.favorite;
      const favorites = readList(STORAGE_KEYS.favorites);
      const shouldAdd = !favorites.includes(slug);
      saveList(STORAGE_KEYS.favorites, shouldAdd ? [...favorites, slug] : favorites.filter((item) => item !== slug));
      showMessage(shouldAdd ? 'Destino salvo nos favoritos!' : 'Destino removido dos favoritos.');
      initializePage();
    }

    if (itineraryButton) {
      const slug = itineraryButton.dataset.itinerary;
      const itinerary = readList(STORAGE_KEYS.itinerary);
      const shouldAdd = !itinerary.includes(slug);
      saveList(STORAGE_KEYS.itinerary, shouldAdd ? [...itinerary, slug] : itinerary.filter((item) => item !== slug));
      showMessage(shouldAdd ? 'Destino adicionado ao roteiro!' : 'Destino removido do roteiro.');
      initializePage();
    }

    if (deleteButton) {
      const slug = deleteButton.dataset.deletePlace;
      saveList(STORAGE_KEYS.userDestinations, readList(STORAGE_KEYS.userDestinations).filter((place) => place.slug !== slug));
      saveList(STORAGE_KEYS.favorites, readList(STORAGE_KEYS.favorites).filter((item) => item !== slug));
      saveList(STORAGE_KEYS.itinerary, readList(STORAGE_KEYS.itinerary).filter((item) => item !== slug));
      showMessage('Lugar removido deste navegador.');
      initializePage();
    }
  });

  document.addEventListener('DOMContentLoaded', initializePage);
})();
