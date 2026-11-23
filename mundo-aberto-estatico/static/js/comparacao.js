/*
 * Lógica da página de comparação
 * Busca no catálogo, escolhe destinos para comparar e mostra um ao lado do outro
 * A lista escolhida fica guardada neste navegador (localStorage) <<<<<<<<<<<<< TEM QUE MUDAR ISSO DEPOIS PRO COISINHA LA DE BD .
 */
(function () {
  const DATA_URL = 'static/json/dados.json';
  const STORAGE_KEYS = {
    compare: 'mundoAberto.comparacao',
    userDestinations: 'mundoAberto.lugaresAdicionados',
  };

  const els = {
    form: document.getElementById('filters'),
    resultsWrap: document.getElementById('compare-results'),
    resultsGrid: document.getElementById('compare-results-grid'),
    resultsCount: document.getElementById('results-count'),
    emptyState: document.getElementById('empty-state'),
    section: document.getElementById('compare-section'),
    grid: document.getElementById('compare-grid'),
    count: document.getElementById('compare-count'),
    clear: document.getElementById('compare-clear'),
    template: document.getElementById('compare-card-template'),
  };
  // Se a página não tiver a estrutura da comparação, não faz nada.
  if (!els.form || !els.grid || !els.template) return;

  const controls = {
    search: document.getElementById('search'),
    country: document.getElementById('country'),
    category: document.getElementById('category'),
    minRating: document.getElementById('rating-min'),
    maxRating: document.getElementById('rating-max'),
    maxPrice: document.getElementById('price-max'),
    priceCurrency: document.getElementById('price-currency'),
    sortPrice: document.getElementById('price-sort'),
  };

  const MAX_COMPARE = Number(els.grid.dataset.compareMax) || 4;
  let destinations = [];
  let submitted = false; // vira true quando a pessoa clica em "Buscar"

  /* ---------- utilidades (mesmo padrão do main.js) ---------- */

  function readList(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function saveList(key, list) {
    localStorage.setItem(key, JSON.stringify(list));
  }

  function escapeHtml(value) {
    const characters = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(value ?? '').replace(/[&<>"']/g, (character) => characters[character]);
  }

  function normalizeText(value) {
    return String(value || '')
      .toLocaleLowerCase('pt-BR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function detailUrl(slug) {
    return 'destino.html?slug=' + encodeURIComponent(slug);
  }

  function formatPrice(value, currency) {
    if (value === null || value === undefined || value === '') return 'Preço não informado';
    try {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currency || 'USD' }).format(Number(value));
    } catch {
      return Number(value).toFixed(2) + ' ' + (currency || '');
    }
  }

  function priceLabel(destination) {
    if (destination.preco_tipo === 'gratuito' || destination.preco_passeio === 0) return 'Gratuito';
    return destination.preco_passeio == null
      ? 'Preço a consultar'
      : 'A partir de ' + formatPrice(destination.preco_passeio, destination.moeda);
  }

  function showMessage(message, type) {
    let container = document.querySelector('.flash-wrap');
    if (!container) {
      container = document.createElement('div');
      container.className = 'flash-wrap';
      document.body.appendChild(container);
    }
    container.innerHTML = '<div class="flash ' + (type || 'sucesso') + '" role="status">' + escapeHtml(message) + '</div>';
    setTimeout(() => container.remove(), 2800);
  }

  /* ---------- busca (mesma regra do destinos.html) ---------- */

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

    return remainingWords.every((word) => searchableText.includes(word))
      && (hasSemanticMatch || words.every((word) => searchableText.includes(word)));
  }

  function hasActiveFilter() {
    return Object.values(controls).some((control) => control && String(control.value || '').trim() !== '');
  }

  function filterDestinations() {
    const words = normalizeText(controls.search?.value || '').trim().split(/\s+/).filter(Boolean);
    const minimum = controls.minRating?.value === '' ? 0 : Number(controls.minRating?.value || 0);
    const maximum = controls.maxRating?.value === '' ? 5 : Number(controls.maxRating?.value || 5);
    const maxPrice = controls.maxPrice?.value;
    const currency = controls.priceCurrency?.value;

    const results = destinations.filter((destination) => {
      if (!matchesSearch(destination, words)) return false;
      if (controls.country?.value && destination.pais !== controls.country.value) return false;
      if (controls.category?.value && destination.categoria !== controls.category.value) return false;

      const rating = Number(destination.nota || 0);
      if (rating < minimum || rating > maximum) return false;

      if (maxPrice !== '' && maxPrice != null) {
        if (!currency) return false;
        if (!destination.moeda || destination.moeda !== currency || destination.preco_passeio == null) return false;
        if (Number(destination.preco_passeio) > Number(maxPrice)) return false;
      }
      return true;
    });

    if (controls.sortPrice?.value === 'menor') results.sort((a, b) => (a.preco_passeio ?? Infinity) - (b.preco_passeio ?? Infinity));
    if (controls.sortPrice?.value === 'maior') results.sort((a, b) => (b.preco_passeio ?? -Infinity) - (a.preco_passeio ?? -Infinity));
    return results;
  }

  /* ---------- resultados da busca ---------- */

  function createResultCard(destination, index, selected) {
    const isSelected = selected.includes(destination.slug);
    return `
      <article class="destination-card compare-result" style="--card-index:${index % 6}">
        <a class="card-image" href="${detailUrl(destination.slug)}">
          <img src="${escapeHtml(destination.imagem)}" alt="Paisagem de ${escapeHtml(destination.nome)}" loading="lazy">
          <span class="card-country">${escapeHtml(destination.emoji)} ${escapeHtml(destination.pais)}</span>
        </a>
        <div class="card-info">
          <p>${escapeHtml(destination.categoria)} <span>· ${escapeHtml(destination.duracao)}</span></p>
          <p class="card-price">${escapeHtml(priceLabel(destination))}</p>
          <h3><a href="${detailUrl(destination.slug)}">${escapeHtml(destination.nome)}</a></h3>
          <p class="card-description">${escapeHtml(destination.resumo)}</p>
          <div class="card-actions">
            <span class="destination-rating">★ ${Number(destination.nota || 0).toFixed(1)}</span>
            <button type="button" class="btn-compare ${isSelected ? 'is-selected' : ''}" data-compare-toggle="${escapeHtml(destination.slug)}" aria-pressed="${isSelected}">
              ${isSelected ? '✓ Na comparação' : '+ Comparar'}
            </button>
          </div>
        </div>
      </article>`;
  }

  function renderResults() {
    // Sem busca feita, a página mostra só a barra de busca (e a comparação, se houver).
    if (!submitted && !hasActiveFilter()) {
      els.resultsWrap.hidden = true;
      els.emptyState.hidden = true;
      els.resultsGrid.innerHTML = '';
      return;
    }

    const results = filterDestinations();
    const selected = readList(STORAGE_KEYS.compare);

    els.resultsGrid.innerHTML = results.map((item, index) => createResultCard(item, index, selected)).join('');
    els.resultsWrap.hidden = results.length === 0;
    els.emptyState.hidden = results.length > 0;
    els.resultsCount.textContent = results.length + (results.length === 1 ? ' destino encontrado' : ' destinos encontrados');
  }

  /* ---------- comparação lado a lado ---------- */

  function getSelectedDestinations() {
    const stored = readList(STORAGE_KEYS.compare);
    const selected = stored
      .map((slug) => destinations.find((item) => item.slug === slug))
      .filter(Boolean);

    // Remove da lista destinos que não existem mais (por exemplo, lugar excluído).
    if (selected.length !== stored.length) saveList(STORAGE_KEYS.compare, selected.map((item) => item.slug));
    return selected;
  }

  function buildAttractionRows(destination) {
    const items = destination.passeios?.length ? destination.passeios : (destination.atracoes || []);
    return items.map((attraction, index) => {
      const item = typeof attraction === 'string'
        ? { nome: attraction, preco: null, moeda: destination.moeda }
        : attraction;
      const value = item.gratuito || item.preco === 0
        ? 'Gratuito'
        : (item.preco == null ? 'Preço a consultar' : formatPrice(item.preco, item.moeda || destination.moeda));
      return `<div class="attraction-price-row"><span>${String(index + 1).padStart(2, '0')}</span><strong>${escapeHtml(item.nome)}</strong><small>${escapeHtml(value)}</small></div>`;
    }).join('');
  }

  // Descobre qual destino tem o menor preço, mas só quando todos os preços estão na mesma moeda.
  function findBestPrice(selected) {
    const priced = selected.filter((item) => item.preco_passeio != null);
    if (priced.length < 2) return { slugs: [], mixedCurrencies: false };

    const currencies = new Set(priced.map((item) => item.moeda || ''));
    if (currencies.size > 1) return { slugs: [], mixedCurrencies: true };

    const values = priced.map((item) => Number(item.preco_passeio));
    const lowest = Math.min(...values);
    if (lowest === Math.max(...values)) return { slugs: [], mixedCurrencies: false };

    return {
      slugs: priced.filter((item) => Number(item.preco_passeio) === lowest).map((item) => item.slug),
      mixedCurrencies: false,
    };
  }

  function fillCompareCard(destination, isBest) {
    const fragment = els.template.content.cloneNode(true);
    const root = fragment.querySelector('.compare-card');
    const field = (name) => root.querySelector('[data-field="' + name + '"]');

    root.dataset.slug = destination.slug;
    root.querySelector('[data-compare-remove]').dataset.compareRemove = destination.slug;

    field('link').href = detailUrl(destination.slug);
    const image = field('imagem');
    image.src = destination.imagem || '';
    image.alt = 'Paisagem de ' + destination.nome;
    field('pais').textContent = (destination.emoji || '') + ' ' + (destination.pais || '');
    field('categoria').textContent = destination.categoria || '';
    field('duracao').textContent = destination.duracao || '';
    field('nome').textContent = destination.nome || '';
    field('nome').href = detailUrl(destination.slug);
    field('resumo').textContent = destination.resumo || '';

    field('preco').textContent = priceLabel(destination);
    field('moeda').textContent = 'Moeda local: ' + (destination.moeda || 'Não informada');
    field('cidade').textContent = destination.cidade || '—';
    field('pais-texto').textContent = destination.pais || '—';
    field('duracao-texto').textContent = destination.duracao || '—';
    field('melhor_epoca').textContent = destination.melhor_epoca || '—';
    field('nota').textContent = '★ ' + Number(destination.nota || 0).toFixed(1);
    field('atracoes').innerHTML = buildAttractionRows(destination);
    field('link-detalhe').href = detailUrl(destination.slug);

    if (isBest) {
      root.classList.add('is-best');
      const badge = document.createElement('span');
      badge.className = 'best-badge';
      badge.textContent = '✦ Menor preço';
      root.querySelector('.price-panel').prepend(badge);
    }
    return fragment;
  }

  function renderCompare() {
    const selected = getSelectedDestinations();
    els.section.hidden = selected.length === 0;
    els.grid.innerHTML = '';
    els.grid.dataset.count = String(selected.length);
    els.grid.style.setProperty('--cols', String(Math.max(selected.length, 1)));
    if (!selected.length) return;

    const best = findBestPrice(selected);
    selected.forEach((destination) => {
      els.grid.appendChild(fillCompareCard(destination, best.slugs.includes(destination.slug)));
    });

    let text = selected.length + (selected.length === 1 ? ' destino' : ' destinos') + ' em comparação';
    if (selected.length === 1) text += ' · busque e adicione outro para comparar';
    if (selected.length >= MAX_COMPARE) text += ' · limite de ' + MAX_COMPARE + ' destinos atingido';
    if (best.mixedCurrencies) text += ' · as moedas são diferentes, então os valores não foram convertidos';
    els.count.textContent = text;
  }

  /* ---------- ações ---------- */

  function toggleCompare(slug) {
    const list = readList(STORAGE_KEYS.compare);

    if (list.includes(slug)) {
      saveList(STORAGE_KEYS.compare, list.filter((item) => item !== slug));
      showMessage('Destino removido da comparação.');
    } else {
      if (list.length >= MAX_COMPARE) {
        showMessage('Você pode comparar até ' + MAX_COMPARE + ' destinos. Remova um para adicionar outro.', 'aviso');
        return;
      }
      saveList(STORAGE_KEYS.compare, [...list, slug]);
      showMessage('Destino adicionado à comparação!');
    }
    renderResults();
    renderCompare();
  }

  function removeFromCompare(slug) {
    saveList(STORAGE_KEYS.compare, readList(STORAGE_KEYS.compare).filter((item) => item !== slug));
    showMessage('Destino removido da comparação.');
    renderResults();
    renderCompare();
  }

  document.addEventListener('click', (event) => {
    const toggle = event.target.closest('[data-compare-toggle]');
    const remove = event.target.closest('[data-compare-remove]');
    if (toggle) toggleCompare(toggle.dataset.compareToggle);
    if (remove) removeFromCompare(remove.dataset.compareRemove);
  });

  els.clear?.addEventListener('click', () => {
    saveList(STORAGE_KEYS.compare, []);
    showMessage('Comparação limpa.');
    renderResults();
    renderCompare();
  });

  /* ---------- início ---------- */

  function fillSelect(select, values) {
    if (!select) return;
    [...new Set(values.filter(Boolean))].sort().forEach((value) => select.add(new Option(value, value)));
  }

  function bindControls() {
    Object.values(controls).filter(Boolean).forEach((control) => {
      control.addEventListener(control.tagName === 'INPUT' ? 'input' : 'change', () => {
        submitted = false;
        renderResults();
      });
    });

    els.form.addEventListener('submit', (event) => {
      event.preventDefault();
      submitted = true;
      renderResults();
    });
  }

  async function init() {
    try {
      const response = await fetch(DATA_URL);
      if (!response.ok) throw new Error('Não foi possível carregar os dados.');
      const data = await response.json();
      destinations = [...(data.destinos || []), ...readList(STORAGE_KEYS.userDestinations)];

      fillSelect(controls.country, destinations.map((item) => item.pais));
      fillSelect(controls.category, destinations.map((item) => item.categoria));
      fillSelect(controls.priceCurrency, destinations.map((item) => item.moeda));

      // Permite abrir uma busca por endereço, por exemplo ?q=Paris.
      const parameters = new URLSearchParams(location.search);
      if (controls.search) controls.search.value = parameters.get('q') || '';
      if (controls.country) controls.country.value = parameters.get('pais') || '';
      if (controls.category) controls.category.value = parameters.get('categoria') || '';
      if (controls.minRating) controls.minRating.value = parameters.get('notaMin') || '';
      if (controls.maxRating) controls.maxRating.value = parameters.get('notaMax') || '';
      if (controls.maxPrice) controls.maxPrice.value = parameters.get('precoMax') || '';
      if (controls.priceCurrency) controls.priceCurrency.value = parameters.get('moeda') || '';

      bindControls();
      renderResults();
      renderCompare();
    } catch {
      els.resultsWrap.hidden = false;
      els.resultsGrid.innerHTML = '<div class="empty-state"><h2>Não foi possível carregar os destinos</h2><p>Abra o projeto com um servidor estático local, por exemplo, Live Server.</p></div>';
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
