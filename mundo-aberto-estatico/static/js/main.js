/*
 * Mundo Aberto — catálogo público.
 * Dados publicados: static/json/dados.json (somente leitura).
 * Favoritos e seleção do roteiro: armazenamento local do visitante.
 * Não existe cadastro de destinos nem autenticação administrativa nesta versão.
 */
(() => {
  'use strict';

  const STORAGE = { favorites: 'mundoAberto.favoritos', itinerary: 'mundoAberto.roteiro' };
  let catalog = [];
  let packages = [];
  let listingControls = null;
  let slideInterval = null;
  let toastTimer = null;

  function readList(key) {
    try {
      const result = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(result) ? [...new Set(result.filter(value => typeof value === 'string'))] : [];
    } catch { return []; }
  }

  function saveList(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { notify('Não foi possível salvar. Verifique o espaço e as permissões do navegador.', true); return false; }
  }

  function html(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
  }

  const detailUrl = slug => 'destino.html?slug=' + encodeURIComponent(slug);
  const mapUrl = destination => 'https://www.openstreetmap.org/?mlat=' +
    encodeURIComponent(destination.lat) + '&mlon=' + encodeURIComponent(destination.lon) +
    '#map=12/' + encodeURIComponent(destination.lat) + '/' + encodeURIComponent(destination.lon);
  const hasCoords = destination => Number.isFinite(Number(destination.lat)) && Number.isFinite(Number(destination.lon)) && destination.lat != null && destination.lon != null;

  function formatPrice(value, currency) {
    if (value == null || value === '') return 'Preço a consultar';
    try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currency || 'BRL' }).format(Number(value)); }
    catch { return Number(value).toFixed(2) + ' ' + (currency || ''); }
  }
  function parseBudget(value) {
    const cleaned = String(value ?? '').trim().replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
    if (!cleaned) return null;
    const amount = Number(cleaned);
    return Number.isFinite(amount) && amount >= 0 ? amount : null;
  }
  function formatBudgetInput(input) {
    const raw = input.value.replace(/[^\d,]/g, '');
    const comma = raw.indexOf(',');
    const integerPart = (comma < 0 ? raw : raw.slice(0, comma)).replace(/^0+(?=\d)/, '');
    const decimals = comma < 0 ? null : raw.slice(comma + 1).slice(0, 2);
    const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    input.value = grouped ? `R$ ${grouped}${decimals === null ? '' : ',' + decimals}` : (decimals === null ? '' : `R$ 0,${decimals}`);
  }
  function initializeBudgetInputs() {
    document.querySelectorAll('input[name="orcamento"], #budget-max').forEach(input => {
      if (input.value) { const amount = parseBudget(input.value); if (amount !== null) input.value = formatPrice(amount, 'BRL'); }
      input.addEventListener('input', () => {
        formatBudgetInput(input);
        if (input.id === 'budget-max') renderListing();
      });
      input.addEventListener('blur', () => formatBudgetInput(input));
    });
  }
  function priceLabel(destination) {
    if (destination.preco_tipo === 'gratuito' || destination.preco_passeio === 0) return 'Gratuito';
    return destination.preco_passeio == null ? 'Preço a consultar' : 'A partir de ' + formatPrice(destination.preco_passeio, destination.moeda);
  }

  function notify(message, error = false) {
    let root = document.querySelector('.flash-wrap');
    if (!root) {
      root = document.createElement('div');
      root.className = 'flash-wrap';
      root.setAttribute('aria-live', 'polite');
      document.body.append(root);
    }
    root.innerHTML = `<div class="flash ${error ? 'erro' : 'sucesso'}" role="status">${html(message)}</div>`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => root.replaceChildren(), 3200);
  }

  function initializeMenu() {
    const toggle = document.getElementById('menuToggle');
    const nav = document.getElementById('menu');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('menu-aberto');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
      toggle.textContent = open ? '×' : '☰';
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && nav.classList.contains('menu-aberto')) toggle.click();
    });
    nav.addEventListener('click', event => {
      if (event.target.closest('a') && nav.classList.contains('menu-aberto')) toggle.click();
    });
    const name = location.pathname.split('/').pop() || 'index.html';
    nav.querySelectorAll('a').forEach(link => {
      if (link.getAttribute('href') === name) link.setAttribute('aria-current', 'page');
    });
  }

  function updateNavCount() {
    const count = readList(STORAGE.itinerary).length;
    document.querySelectorAll('[data-roteiro-count]').forEach(node => node.textContent = String(count));
  }

  function card(destination, favorites, packageBudget = null) {
    const selected = favorites.includes(destination.slug);
    const destinationHref = detailUrl(destination.slug) + (packageBudget ? '&orcamento=' + encodeURIComponent(packageBudget) : '');
    return `
      <article class="destination-card reveal">
        <a class="card-image" href="${destinationHref}">
          <img src="${html(destination.imagem)}" alt="Paisagem de ${html(destination.nome)}" loading="lazy">
          <span class="card-country">${html(destination.emoji)} ${html(destination.pais)}</span>
          <span class="card-arrow" aria-hidden="true">↗</span>
        </a>
        <div class="card-info">
          <p>${packageBudget ? 'Pacotes de viagem' : html(destination.categoria)} <span>· ${html(destination.duracao)}</span></p>
          <p class="card-price">${packageBudget ? `Pacotes a partir de ${html(formatPrice(Math.min(...packages.filter(p => p.destino === destination.slug && p.preco <= packageBudget).map(p => p.preco)), 'BRL'))}` : html(priceLabel(destination))}</p>
          <h3><a href="${destinationHref}">${html(destination.nome)}</a></h3>
          <p class="card-description">${html(destination.resumo)}</p>
          <div class="card-actions">
            <span class="destination-rating" title="Nota ilustrativa; não representa avaliação de usuários">★ ${Number(destination.nota || 0).toFixed(1)} <small>exemplo</small></span>
            <a href="${destinationHref}" class="text-link">${packageBudget ? 'Ver pacotes ↗' : 'Conhecer ↗'}</a>
            <button type="button" class="heart-btn ${selected ? 'is-favorite' : ''}" data-favorite="${html(destination.slug)}"
              aria-label="${selected ? 'Remover' : 'Adicionar'} ${html(destination.nome)} ${selected ? 'dos' : 'aos'} favoritos"
              aria-pressed="${selected}">${selected ? '♥' : '♡'}</button>
          </div>
        </div>
      </article>`;
  }

  const normalize = value => String(value ?? '').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const synonymGroups = {
    bonito: ['bonito', 'bonita', 'bonitos', 'bonitas', 'lindo', 'linda', 'lindos', 'lindas', 'belo', 'bela', 'paisagem', 'paisagens'],
    historico: ['historico', 'historica', 'historicos', 'historicas', 'historia', 'cultura', 'cultural', 'antigo', 'antiga'],
    natureza: ['natureza', 'natural', 'praia', 'praias', 'montanha', 'montanhas', 'floresta', 'lago', 'trilha'],
    aventura: ['aventura', 'aventuras', 'trilha', 'radical'],
    gastronomia: ['comida', 'gastronomia', 'culinaria', 'restaurante']
  };
  const ignored = new Set(['lugar', 'lugares', 'destino', 'destinos', 'de', 'do', 'da', 'dos', 'das', 'para', 'com', 'em', 'no', 'na']);

  function matchesSearch(destination, terms) {
    const searchable = normalize([
      destination.nome, destination.cidade, destination.pais, destination.continente,
      destination.categoria, destination.resumo, destination.descricao, ...(destination.tags || []),
      ...(destination.atracoes || [])
    ].join(' '));
    return terms.every(term => {
      if (ignored.has(term)) return true;
      if (searchable.includes(term)) return true;
      return Object.entries(synonymGroups).some(([tag, words]) =>
        words.includes(term) && (destination.tags || []).includes(tag));
    });
  }

  function renderCards(target, destinations, favorites, packageBudget = null) {
    target.innerHTML = destinations.map(d => card(d, favorites, packageBudget)).join('');
    window.MundoAbertoAnimacoes?.refresh(target);
  }

  function renderListing() {
    const grid = document.getElementById('destination-grid');
    if (!grid) return;
    const favorites = readList(STORAGE.favorites);
    const c = listingControls || {};
    const terms = normalize(c.search?.value).trim().split(/\s+/).filter(Boolean);
    const min = c.minRating?.value ? Number(c.minRating.value) : 0;
    const max = c.maxRating?.value ? Number(c.maxRating.value) : 5;
    const maxPrice = c.maxPrice?.value === '' || !c.maxPrice ? null : Number(c.maxPrice.value);
    const packageBudget = c.budget ? parseBudget(c.budget.value) : null;
    const filtered = catalog.filter(d => {
      if (grid.hasAttribute('data-favorites-only') && !favorites.includes(d.slug)) return false;
      if (packageBudget !== null) return packages.some(p => p.destino === d.slug && p.preco <= packageBudget);
      if (!matchesSearch(d, terms)) return false;
      if (c.country?.value && d.pais !== c.country.value) return false;
      if (c.category?.value && d.categoria !== c.category.value) return false;
      if (Number(d.nota || 0) < min || Number(d.nota || 0) > max) return false;
      if (maxPrice !== null) {
        if (!c.priceCurrency?.value || d.moeda !== c.priceCurrency.value || d.preco_passeio == null) return false;
        if (Number(d.preco_passeio) > maxPrice) return false;
      }
      return true;
    });
    if (c.sortPrice?.value === 'menor') filtered.sort((a, b) => (a.preco_passeio ?? Infinity) - (b.preco_passeio ?? Infinity));
    if (c.sortPrice?.value === 'maior') filtered.sort((a, b) => (b.preco_passeio ?? -Infinity) - (a.preco_passeio ?? -Infinity));
    renderCards(grid, filtered, favorites, packageBudget);
    const label = document.getElementById('results-count');
    if (label) label.textContent = packageBudget !== null ? `${filtered.length} ${filtered.length === 1 ? 'destino com pacote' : 'destinos com pacotes'} até ${formatPrice(packageBudget, 'BRL')} por pessoa` : `${filtered.length} ${filtered.length === 1 ? 'destino encontrado' : 'destinos encontrados'}`;
    const empty = document.getElementById('empty-state');
    if (empty) empty.hidden = filtered.length > 0;
  }

  function initializeListing() {
    if (!document.getElementById('destination-grid')) return;
    const params = new URLSearchParams(location.search);
    const elements = {
      search: 'search', country: 'country', category: 'category',
      minRating: 'rating-min', maxRating: 'rating-max', maxPrice: 'price-max',
      priceCurrency: 'price-currency', sortPrice: 'price-sort'
    };
    listingControls = Object.fromEntries(Object.entries(elements).map(([key, id]) => [key, document.getElementById(id)]));
    const c = listingControls;
    c.budget = document.getElementById('budget-max');
    if (c.budget) c.budget.value = params.get('orcamento') || '';
    if (params.has('orcamento')) {
      const heading = document.querySelector('.page-banner h1');
      const description = document.querySelector('.page-banner>p:last-child');
      if (heading) heading.textContent = 'Pacotes que cabem no seu orçamento.';
      if (description) description.textContent = 'Escolha um destino para ver pacotes disponíveis nessa faixa de preço por pessoa.';
      const disclaimer = document.querySelector('.rating-disclaimer');
      if (disclaimer) disclaimer.textContent = 'Pacotes e preços fictícios para demonstração. Não são ofertas ou reservas reais.';
      ['country','category','price-max','price-currency','price-sort','rating-min','rating-max'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { if (el.tagName === 'SELECT') el.hidden = true; else if (el.closest('label')) el.closest('label').hidden = true; }
      });
    }
    if (c.search) c.search.value = params.get('q') || '';
    if (c.budget?.value) { const amount = parseBudget(c.budget.value); c.budget.value = amount === null ? '' : formatPrice(amount, 'BRL'); }
    for (const [key, param] of [['search', 'q'], ['minRating', 'notaMin'], ['maxRating', 'notaMax'], ['maxPrice', 'precoMax']]) {
      if (c[key]) c[key].value = params.get(param) || '';
    }
    for (const [control, field, param] of [[c.country, 'pais', 'pais'], [c.category, 'categoria', 'categoria'], [c.priceCurrency, 'moeda', 'moeda']]) {
      if (!control) continue;
      [...new Set(catalog.map(item => item[field]).filter(Boolean))].sort((a,b) => a.localeCompare(b, 'pt-BR'))
        .forEach(value => control.add(new Option(value, value)));
      control.value = params.get(param) || '';
    }
    const knownPrices = catalog.some(d => d.preco_passeio != null);
    if (!knownPrices) {
      if (c.maxPrice) c.maxPrice.closest('label').hidden = true;
      if (c.priceCurrency) c.priceCurrency.hidden = true;
      if (c.sortPrice) c.sortPrice.hidden = true;
      const disclaimer = document.querySelector('.rating-disclaimer');
      if (disclaimer) disclaimer.textContent = 'Valores de ingresso ainda não confirmados. Os filtros de preço ficarão disponíveis quando houver preços verificados; não mostramos preços inventados.';
    }
    Object.values(c).filter(Boolean).forEach(control => {
      control.addEventListener(control.tagName === 'INPUT' ? 'input' : 'change', renderListing);
    });
    document.getElementById('filters')?.addEventListener('submit', event => { event.preventDefault(); renderListing(); });
    renderListing();
  }

  function initializeSlideshow(landscapes) {
    const node = document.getElementById('slideshow');
    if (!node || !landscapes?.length || slideInterval !== null) return;
    const caption = document.getElementById('legenda');
    let current = 0;
    const show = () => {
      const image = landscapes[current % landscapes.length];
      current += 1;
      node.style.backgroundImage = `url("${image.url}")`;
      if (caption) caption.textContent = `✦ ${(image.local || 'Paisagens pelo mundo').toLocaleUpperCase('pt-BR')}`;
    };
    show();
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      slideInterval = window.setInterval(() => { if (!document.hidden) show(); }, 7000);
      window.addEventListener('pagehide', () => clearInterval(slideInterval), { once: true });
    }
  }

  function renderDetails() {
    const root = document.getElementById('detail-root');
    if (!root) return;
    const params = new URLSearchParams(location.search);
    const slug = params.get('slug');
    const d = catalog.find(item => item.slug === slug);
    if (!d) {
      root.innerHTML = '<section class="error-state"><p class="eyebrow dark">404</p><h1>Destino não encontrado</h1><a class="btn-dark" href="destinos.html">Ver destinos ↗</a></section>';
      return;
    }
    document.title = `${d.nome} — Mundo Aberto`;
    const budget = parseBudget(params.get('orcamento'));
    const packageId = params.get('pacote');
    if (packageId) {
      const pack = packages.find(item => item.id === packageId && item.destino === slug);
      if (!pack) {
        root.innerHTML = `<section class="error-state"><h1>Pacote não encontrado</h1><a class="btn-dark" href="destino.html?slug=${encodeURIComponent(slug)}&orcamento=${encodeURIComponent(budget || 2000)}">Voltar aos pacotes ↗</a></section>`;
        return;
      }
      renderPackageDetail(root, d, pack, budget || pack.preco);
      return;
    }
    if (params.has('orcamento') && Number.isFinite(budget)) {
    const available = packages.filter(item => item.destino === slug && item.preco <= budget).sort((a, b) => a.preco - b.preco);
      renderDestinationPackages(root, d, available, budget);
      return;
    }
    const fav = readList(STORAGE.favorites).includes(slug);
    const planned = readList(STORAGE.itinerary).includes(slug);
    const attractions = (d.passeios?.length ? d.passeios : d.atracoes || []);
    root.innerHTML = `
      <section class="detail-hero">
        <img src="${html(d.imagem)}" alt="Paisagem de ${html(d.nome)}">
        <div class="detail-shade"></div>
        <div class="detail-hero-content">
          <a class="back-link" href="destinos.html">← Todos os destinos</a>
          <p class="eyebrow"><span></span>${html(d.continente.toUpperCase())} · ${html(d.pais.toUpperCase())}</p>
          <h1>${html(d.nome)}</h1><p>${html(d.resumo)}</p>
        </div>
        <span class="detail-flag">${html(d.emoji)}</span>
      </section>
      <section class="detail-layout">
        <article class="detail-main">
          <p class="eyebrow dark">UM POUCO SOBRE O LUGAR</p>
          <h2>Uma experiência para lembrar.</h2><p class="detail-description">${html(d.descricao)}</p>
          <h3>O que vale conhecer</h3>
          <div class="price-panel"><span class="eyebrow dark">PREÇO DE REFERÊNCIA DO PASSEIO</span>
            <strong>${html(priceLabel(d))}</strong><small>Moeda: ${html(d.moeda || 'Não informada')}</small>
            ${d.fonte_preco ? `<small>Fonte: ${html(d.fonte_preco)}</small>` : ''}
            ${d.atualizado_em ? `<small>Atualizado em ${html(d.atualizado_em)}</small>` : ''}
            <small>Confirme preços, horários e condições diretamente com a atração.</small>
          </div>
          <div class="attraction-list">${attractions.map((attraction, i) => {
            const a = typeof attraction === 'string' ? { nome: attraction } : attraction;
            const price = a.gratuito || a.preco === 0 ? 'Gratuito' : formatPrice(a.preco, a.moeda || d.moeda);
            return `<div class="attraction-price-row"><span>${String(i+1).padStart(2, '0')}</span><strong>${html(a.nome)}</strong><small>${html(price)}</small></div>`;
          }).join('')}</div>
          <div class="travel-note"><span>✦</span><div><strong>Dica de planejamento</strong>
            <p>Melhor época: ${html(d.melhor_epoca)}. Reserve ${html(d.duracao)} para conhecer a região.</p></div></div>
          ${hasCoords(d) ? `<section class="destination-map"><div class="section-heading"><div><p class="eyebrow dark">LOCALIZAÇÃO APROXIMADA</p><h3>Explore no mapa</h3></div></div>
            <iframe title="Mapa interativo da região de ${html(d.nome)}" loading="lazy" referrerpolicy="no-referrer" src="${embedMap(d)}"></iframe>
            <p>Marcador de referência da região; confira o endereço exato da atração.</p>
            <a href="${mapUrl(d)}" target="_blank" rel="noopener noreferrer" class="text-link">Abrir no OpenStreetMap ↗</a>
          </section>` : ''}
        </article>
        <aside class="detail-aside"><p class="eyebrow dark">GUARDE PARA SUA VIAGEM</p>
          <h3>Não perca esse lugar de vista.</h3><p>Favoritos e roteiro ficam salvos no seu navegador.</p>
          <button class="btn-outline full-width" type="button" data-favorite="${html(slug)}">${fav ? '♥ Remover dos favoritos' : '♡ Salvar nos favoritos'}</button>
          <button class="btn-dark full-width" type="button" data-itinerary="${html(slug)}">${planned ? '✓ Remover do roteiro' : '+ Adicionar ao meu roteiro'}</button>
          <a class="btn-outline full-width" href="roteiro.html?destino=${encodeURIComponent(slug)}#transporte">Como chegar ↗</a>
          <div class="aside-meta"><span>⌖ País</span><strong>${html(d.pais)}</strong>
            <span>◷ Tempo sugerido</span><strong>${html(d.duracao)}</strong>
            <span>✧ Categoria</span><strong>${html(d.categoria)}</strong></div>
        </aside>
      </section>`;
  }

  function renderDestinationPackages(root, d, available, budget) {
    document.title = `Pacotes em ${d.nome} — Mundo Aberto`;
    const back = 'destinos.html?orcamento=' + encodeURIComponent(budget);
    const cards = available.map(pack => `<article class="package-card"><img src="${html(pack.imagem || d.imagem)}" alt="Paisagem de ${html(d.nome)}" loading="lazy"><div class="package-card-body"><span class="package-duration">${html(pack.duracao)}</span><h3>${html(pack.nome)}</h3><p>${html(pack.subtitulo)}</p><ul class="package-highlights">${(pack.beneficios || []).slice(0, 3).map(item => `<li>${html(item)}</li>`).join('')}</ul><strong>${html(formatPrice(pack.preco, 'BRL'))} <small>/ pessoa</small></strong><a class="btn-dark" href="destino.html?slug=${encodeURIComponent(d.slug)}&pacote=${encodeURIComponent(pack.id)}&orcamento=${encodeURIComponent(budget)}">Ver tudo que inclui ↗</a></div></article>`).join('');
    root.innerHTML = `<section class="detail-hero"><img src="${html(d.imagem)}" alt="Paisagem de ${html(d.nome)}"><div class="detail-shade"></div><div class="detail-hero-content"><a class="back-link" href="${back}">← Destinos no meu orçamento</a><p class="eyebrow"><span></span>PACOTES DEMONSTRATIVOS · ${html(d.pais.toUpperCase())}</p><h1>${html(d.nome)}</h1><p>Opções por pessoa até ${html(formatPrice(budget, 'BRL'))}. Compare o que está incluído em cada viagem.</p></div></section><section class="section package-section"><div class="section-heading"><div><p class="eyebrow dark">SUA PRÓXIMA VIAGEM</p><h2>${available.length ? 'Pacotes disponíveis' : 'Nenhum pacote nesta faixa'}</h2></div><span class="package-disclaimer">Valores fictícios para demonstração</span></div>${available.length ? `<div class="package-grid">${cards}</div>` : '<p class="package-empty">Aumente o orçamento na busca para ver mais opções.</p>'}</section>`;
  }

  function renderPackageDetail(root, d, pack, budget) {
    const section = (title, values) => `<section class="package-inclusion"><h3>${title}</h3><ul>${(values || []).map(value => `<li>${html(value)}</li>`).join('')}</ul></section>`;
    const back = `destino.html?slug=${encodeURIComponent(d.slug)}&orcamento=${encodeURIComponent(budget)}`;
    root.innerHTML = `<section class="detail-hero"><img src="${html(pack.imagem || d.imagem)}" alt="Paisagem de ${html(d.nome)}"><div class="detail-shade"></div><div class="detail-hero-content"><a class="back-link" href="${back}">← Todos os pacotes de ${html(d.nome)}</a><p class="eyebrow"><span></span>PACOTE DEMONSTRATIVO · ${html(d.pais.toUpperCase())}</p><h1>${html(pack.nome)}</h1><p>${html(pack.subtitulo)}</p></div></section><section class="detail-layout package-detail-layout"><article class="detail-main"><p class="eyebrow dark">DETALHES DA VIAGEM</p><h2>${html(pack.duracao)} · ${html(formatPrice(pack.preco, 'BRL'))} por pessoa</h2><p class="package-disclaimer">Valores fictícios para demonstração; esta página não realiza reservas.</p><div class="package-inclusions">${section('Benefícios especiais',pack.beneficios)}${section('Transporte',[pack.transporte])}${section('Hospedagem',[pack.hospedagem])}${section('Refeições',[pack.refeicoes])}${section('Roteiro',pack.roteiro)}${section('Atividades incluídas',pack.atividades)}${section('Taxas incluídas',pack.taxas)}${section('Não incluído',pack.nao_inclui)}</div></article><aside class="detail-aside"><p class="eyebrow dark">RESUMO DO PACOTE</p><h3>${html(formatPrice(pack.preco, 'BRL'))}<small class="package-person"> por pessoa</small></h3><p>${html(pack.duracao)} em ${html(d.nome)}.</p><a class="btn-outline full-width" href="${back}">Voltar aos pacotes ↗</a><p class="package-disclaimer">Confira disponibilidade e valores com fornecedores reais.</p></aside></section>`;
  }

  function embedMap(d) {
    const lat = Number(d.lat), lon = Number(d.lon);
    const deltaLat = 0.14, deltaLon = 0.2;
    const bbox = [lon - deltaLon, lat - deltaLat, lon + deltaLon, lat + deltaLat].join(',');
    return 'https://www.openstreetmap.org/export/embed.html?bbox=' + encodeURIComponent(bbox) +
      '&layer=mapnik&marker=' + encodeURIComponent(lat + ',' + lon);
  }

  function renderDynamic() {
    updateNavCount();
    const home = document.getElementById('home-destinations');
    if (home) renderCards(home, catalog.slice(0, Number(home.dataset.limit) || 6), readList(STORAGE.favorites));
    renderListing();
    renderDetails();
    window.MundoAbertoPlanejamento?.render(catalog);
    window.MundoAbertoMapa?.render(catalog);
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-favorite], [data-itinerary]');
    if (!button || !catalog.length) return;
    const isFavorite = button.hasAttribute('data-favorite');
    const key = isFavorite ? STORAGE.favorites : STORAGE.itinerary;
    const slug = isFavorite ? button.dataset.favorite : button.dataset.itinerary;
    if (!catalog.some(d => d.slug === slug)) return;
    const current = readList(key);
    const adding = !current.includes(slug);
    if (!saveList(key, adding ? [...current, slug] : current.filter(v => v !== slug))) return;
    notify(isFavorite ? (adding ? 'Salvo nos favoritos!' : 'Removido dos favoritos.') : (adding ? 'Adicionado ao roteiro!' : 'Removido do roteiro.'));
    renderDynamic();
  });

  async function init() {
    initializeMenu();
    initializeBudgetInputs();
    updateNavCount();
    try {
      const [response, packageResponse] = await Promise.all([fetch('static/json/dados.json'), fetch('static/json/pacotes.json')]);
      if (!response.ok || !packageResponse.ok) throw new Error('Falha ao carregar dados');
      const [data, packageData] = await Promise.all([response.json(), packageResponse.json()]);
      if (!Array.isArray(data.destinos)) throw new Error('Dados de destinos inválidos');
      catalog = data.destinos; // Somente destinos aprovados e publicados pelo projeto.
      packages = Array.isArray(packageData.pacotes) ? packageData.pacotes : [];
      initializeListing();
      window.MundoAbertoPlanejamento?.init(catalog, { html, formatPrice, detailUrl, mapUrl, hasCoords, notify, readList, saveList, STORAGE });
      window.MundoAbertoTransporte?.init(catalog, { formatPrice, normalize, hasCoords, savedDestinations: readList(STORAGE.itinerary) });
      window.MundoAbertoMapa?.init(catalog, { html, embedMap, mapUrl, hasCoords });
      initializeSlideshow(data.paisagens);
      renderDynamic();
    } catch (error) {
      console.error('Mundo Aberto:', error);
      const target = document.querySelector('#destination-grid, #home-destinations, #detail-root, #itinerary-list, #map-list');
      if (target) target.innerHTML = '<div class="empty-state"><h2>Não foi possível carregar os destinos</h2><p>Use o Live Server no VS Code para abrir o projeto e confira o arquivo dados.json.</p></div>';
    }
  }

  window.addEventListener('storage', event => {
    if (Object.values(STORAGE).includes(event.key) && catalog.length) renderDynamic();
  });
  document.addEventListener('DOMContentLoaded', init);
})();
