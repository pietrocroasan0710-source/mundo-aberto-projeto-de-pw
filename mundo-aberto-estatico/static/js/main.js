/*
 * Mundo Aberto — catálogo público.
 * Dados publicados: static/json/dados.json (somente leitura).
 * Favoritos e seleção do roteiro: armazenamento local do visitante.
 * O catálogo e os pacotes demonstrativos são publicados como arquivos estáticos.
 */
(() => {
  'use strict';

  const STORAGE = { favorites: 'mundoAberto.favoritos', itinerary: 'mundoAberto.roteiro', packagePlans: 'mundoAberto.pacotesSalvos' };
  let catalog = [];
  let packages = [];
  let comparisonSelection = [];
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
          <a class="btn-dark full-width" href="destino.html?slug=${encodeURIComponent(slug)}&orcamento=20000">Ver planos ↗</a><button class="btn-outline full-width" type="button" data-favorite="${html(slug)}">${fav ? '♥ Remover dos favoritos' : '♡ Salvar nos favoritos'}</button>
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
    comparisonSelection = [];
    const cards = available.map(pack => `<article class="package-card"><img src="${html(pack.imagem || d.imagem)}" alt="Paisagem de ${html(d.nome)}" loading="lazy"><div class="package-card-body"><span class="package-duration">${html(pack.duracao)}</span><h3>${html(pack.nome)}</h3><p>${html(pack.subtitulo)}</p><ul class="package-highlights">${(pack.beneficios || []).slice(0, 3).map(item => `<li>${html(item)}</li>`).join('')}</ul><strong>${html(formatPrice(pack.preco, 'BRL'))} <small>/ pessoa</small></strong><label class="compare-check"><input type="checkbox" value="${html(pack.id)}" data-compare-package> Comparar pacote</label><a class="btn-dark" href="destino.html?slug=${encodeURIComponent(d.slug)}&pacote=${encodeURIComponent(pack.id)}&orcamento=${encodeURIComponent(budget)}">Ver detalhes ↗</a></div></article>`).join('');
    root.innerHTML = `<section class="detail-hero"><img src="${html(d.imagem)}" alt="Paisagem de ${html(d.nome)}"><div class="detail-shade"></div><div class="detail-hero-content"><a class="back-link" href="${back}">← Destinos no meu orçamento</a><p class="eyebrow"><span></span>PACOTES DEMONSTRATIVOS · ${html(d.pais.toUpperCase())}</p><h1>${html(d.nome)}</h1><p>Opções por pessoa até ${html(formatPrice(budget, 'BRL'))}. Compare o que está incluído em cada viagem.</p></div></section><section class="section package-section"><div class="section-heading"><div><p class="eyebrow dark">SUA PRÓXIMA VIAGEM</p><h2>${available.length ? 'Pacotes disponíveis' : 'Nenhum pacote nesta faixa'}</h2></div><span class="package-disclaimer">Valores fictícios para demonstração</span></div>${available.length ? `<div class="package-grid">${cards}</div><div id="package-comparison" class="package-comparison"></div>` : '<p class="package-empty">Aumente o orçamento na busca para ver mais opções.</p>'}</section>`;
    const comparisonRoot = document.getElementById('package-comparison');
    renderPackageComparison(comparisonRoot, []);
    if (comparisonRoot && !root.dataset.compareHandlerBound) {
      root.dataset.compareHandlerBound = 'true';
      root.addEventListener('change', event => {
        const checkbox = event.target.closest('[data-compare-package]');
        if (!checkbox) return;
        comparisonSelection = checkbox.checked
          ? [...comparisonSelection.filter(id => id !== checkbox.value), checkbox.value].slice(-3)
          : comparisonSelection.filter(id => id !== checkbox.value);
        root.querySelectorAll('[data-compare-package]').forEach(input => {
          input.checked = comparisonSelection.includes(input.value);
          input.disabled = comparisonSelection.length >= 3 && !input.checked;
        });
        renderPackageComparison(document.getElementById('package-comparison'), comparisonSelection.map(id => packages.find(item => item.id === id)).filter(Boolean));
      });
    }
  }

  function renderPackageComparison(target, selected) {
    if (!target) return;
    if (selected.length < 2) {
      target.innerHTML = '<div class="comparison-hint"><strong>Compare até 3 opções</strong><span>Marque “Comparar pacote” em duas ou três opções para ver as diferenças lado a lado.</span></div>';
      return;
    }
    const rows = [
      ['Preço por pessoa', p => formatPrice(p.preco, 'BRL')],
      ['Duração', p => p.duracao], ['Hotel', p => p.hospedagem], ['Transporte', p => p.transporte],
      ['Refeições', p => p.refeicoes], ['Benefícios', p => (p.beneficios || []).join(' · ')],
      ['Atividades', p => (p.atividades || []).join(' · ')], ['Taxas incluídas', p => (p.taxas || []).join(' · ')],
      ['Não incluído', p => (p.nao_inclui || []).join(' · ')]
    ];
    target.innerHTML = `<div class="comparison-heading"><div><p class="eyebrow dark">ESCOLHA COM CLAREZA</p><h2>Comparação de pacotes</h2></div><span>${selected.length} opções selecionadas</span></div><div class="comparison-scroll"><table class="comparison-table"><thead><tr><th>O que comparar</th>${selected.map(pack => `<th>${html(pack.nome)}</th>`).join('')}</tr></thead><tbody>${rows.map(([label, value]) => `<tr><th scope="row">${html(label)}</th>${selected.map(pack => `<td>${html(value(pack))}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="package-disclaimer">Valores e condições são exemplos fictícios. Confira os detalhes de cada pacote antes de montar seu plano.</p>`;
  }

  function renderPackageDetail(root, d, pack, budget) {
    const section = (title, values) => `<section class="package-inclusion"><h3>${title}</h3><ul>${(values || []).map(value => `<li>${html(value)}</li>`).join('')}</ul></section>`;
    const back = `destino.html?slug=${encodeURIComponent(d.slug)}&orcamento=${encodeURIComponent(budget)}`;
    root.innerHTML = `<section class="detail-hero"><img src="${html(pack.imagem || d.imagem)}" alt="Paisagem de ${html(d.nome)}"><div class="detail-shade"></div><div class="detail-hero-content"><a class="back-link" href="${back}">← Todos os pacotes de ${html(d.nome)}</a><p class="eyebrow"><span></span>PACOTE DEMONSTRATIVO · ${html(d.pais.toUpperCase())}</p><h1>${html(pack.nome)}</h1><p>${html(pack.subtitulo)}</p></div></section><section class="detail-layout package-detail-layout"><article class="detail-main"><p class="eyebrow dark">DETALHES DA VIAGEM</p><h2>${html(pack.duracao)} · ${html(formatPrice(pack.preco, 'BRL'))} por pessoa</h2><p class="package-disclaimer">Valores fictícios para demonstração; esta página não realiza reservas.</p><div class="package-inclusions">${section('Benefícios especiais',pack.beneficios)}${section('Transporte',[pack.transporte])}${section('Hospedagem',[pack.hospedagem])}${section('Refeições',[pack.refeicoes])}${section('Roteiro',pack.roteiro)}${section('Atividades incluídas',pack.atividades)}${section('Taxas incluídas',pack.taxas)}${section('Não incluído',pack.nao_inclui)}</div></article><aside class="detail-aside"><p class="eyebrow dark">RESUMO DO PACOTE</p><h3>${html(formatPrice(pack.preco, 'BRL'))}<small class="package-person"> por pessoa</small></h3><p>${html(pack.duracao)} em ${html(d.nome)}.</p><a class="btn-dark full-width" href="montar-pacote.html?destino=${encodeURIComponent(d.slug)}&pacote=${encodeURIComponent(pack.id)}">Personalizar e montar meu plano ↗</a><a class="btn-outline full-width" href="${back}">Voltar aos pacotes ↗</a><p class="package-disclaimer">Montar o plano não efetua reserva nem pagamento.</p></aside></section>`;
  }

  function readPackagePlans() {
    try {
      const plans = JSON.parse(localStorage.getItem(STORAGE.packagePlans) || '[]');
      return Array.isArray(plans) ? plans : [];
    } catch { return []; }
  }

  function writePackagePlans(plans) {
    try { localStorage.setItem(STORAGE.packagePlans, JSON.stringify(plans)); return true; }
    catch { notify('Não foi possível salvar o plano neste navegador.', true); return false; }
  }

  function defaultTripDate() {
    const date = new Date();
    date.setDate(date.getDate() + 14);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  function scheduleTime(startTime, offsetMinutes) {
    const [hours, minutes] = String(startTime || '09:00').split(':').map(Number);
    const total = (hours * 60 + minutes + offsetMinutes + 1440) % 1440;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  function buildTripSchedule(destination, pack, startDate, activityStart) {
    const days = Math.max(1, Number(String(pack.duracao).match(/\d+/)?.[0]) || 3);
    const attractions = destination.atracoes?.length ? destination.atracoes : [destination.nome];
    const hotel = pack.hospedagem;
    const schedule = [];
    for (let day = 0; day < days; day++) {
      const date = new Date(`${startDate}T12:00:00`);
      date.setDate(date.getDate() + day);
      const dateKey = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      let events;
      if (day === 0) {
        events = [
          { time: scheduleTime(activityStart, 300), duration: '60 min', activity: 'Chegada e check-in', place: hotel, details: 'Horário sugerido. Confirme a entrada e a bagagem diretamente com a hospedagem.' },
          { time: scheduleTime(activityStart, 375), duration: '45 min estimados', activity: 'Deslocamento até a região do passeio', place: `Hotel → ${attractions[0]}`, details: 'Tempo ilustrativo para planejamento; confira a rota e o trânsito local.' },
          { time: scheduleTime(activityStart, 420), duration: '90 min', activity: `Passeio de reconhecimento: ${attractions[0]}`, place: attractions[0], details: 'Atividade leve para começar a conhecer o destino.' }
        ];
      } else if (day === days - 1) {
        events = [
          { time: scheduleTime(activityStart, -60), duration: '45 min', activity: 'Café da manhã', place: hotel, details: 'Conforme a hospedagem descrita no pacote.' },
          { time: scheduleTime(activityStart, 0), duration: '90 min', activity: `Última visita: ${attractions[(day * 2) % attractions.length]}`, place: attractions[(day * 2) % attractions.length], details: 'Passeio curto próximo ao hotel; confira o deslocamento antes de sair.' },
          { time: scheduleTime(activityStart, 105), duration: '45 min estimados', activity: 'Retorno ao hotel e retirada das malas', place: `${attractions[(day * 2) % attractions.length]} → hotel`, details: 'Tempo ilustrativo. Confira trânsito e horário do check-out.' },
          { time: scheduleTime(activityStart, 150), duration: '60 min estimados', activity: 'Deslocamento ao aeroporto ou terminal', place: 'Hotel → terminal de embarque', details: 'Margem de planejamento; confirme o endereço e a antecedência exigida pela transportadora.' },
          { time: scheduleTime(activityStart, 210), duration: 'A confirmar', activity: 'Embarque de retorno', place: 'Aeroporto ou rodoviária', details: `Horário apenas sugerido: confira o bilhete. ${pack.transporte}` }
        ];
      } else {
        const first = attractions[((day - 1) * 2) % attractions.length];
        const second = attractions[((day - 1) * 2 + 1) % attractions.length];
        events = [
          { time: scheduleTime(activityStart, -60), duration: '45 min', activity: 'Café da manhã', place: hotel, details: 'Conforme a hospedagem descrita no pacote.' },
          { time: scheduleTime(activityStart, 0), duration: '45 min estimados', activity: 'Deslocamento até a primeira visita', place: `Hotel → ${first}`, details: 'Estimativa genérica para organização; confira rota, distância e trânsito do destino.' },
          { time: scheduleTime(activityStart, 45), duration: '2 h 15 min', activity: `Visita: ${first}`, place: first, details: (pack.atividades || []).join(' · ') },
          { time: scheduleTime(activityStart, 180), duration: '1 h 30 min', activity: 'Pausa para almoço', place: `Região de ${first}`, details: 'Refeição livre, exceto quando indicada como incluída no pacote.' },
          { time: scheduleTime(activityStart, 270), duration: '45 min estimados', activity: 'Deslocamento até a segunda visita', place: `${first} → ${second}`, details: 'Estimativa genérica; confirme a rota e os horários de transporte local.' },
          { time: scheduleTime(activityStart, 315), duration: '2 h 15 min', activity: `Passeio: ${second}`, place: second, details: (pack.roteiro || [])[day] || 'Tempo para explorar o local.' },
          { time: scheduleTime(activityStart, 450), duration: '45 min estimados', activity: 'Retorno ao hotel', place: `${second} → hotel`, details: 'Tempo ilustrativo para deslocamento; confirme a rota local.' },
          { time: scheduleTime(activityStart, 495), duration: 'Livre', activity: 'Descanso e tempo livre', place: hotel, details: 'Intervalo sem atividade programada.' }
        ];
      }
      schedule.push({ date: dateKey, events });
    }
    return schedule;
  }

  function renderPackageBuilder(root) {
    if (!root) return;
    const params = new URLSearchParams(location.search);
    const destination = catalog.find(item => item.slug === params.get('destino'));
    const pack = packages.find(item => item.id === params.get('pacote'));
    if (!destination || !pack || pack.destino !== destination.slug) {
      root.innerHTML = '<section class="error-state"><h1>Não encontramos esse pacote</h1><a class="btn-dark" href="destinos.html">Explorar destinos ↗</a></section>';
      return;
    }
    document.title = `Personalizar ${pack.nome} — Mundo Aberto`;
    const extras = pack.extras || [];
    root.innerHTML = `<section class="page-banner"><p class="eyebrow"><span></span>MONTE SUA VIAGEM</p><h1>Personalize seu pacote.</h1><p>${html(pack.nome)} · ${html(destination.nome)} · ${html(pack.duracao)}</p></section><section class="section builder-section"><form id="package-builder-form" class="builder-layout"><div class="builder-panel"><p class="eyebrow dark">ESCOLHAS DA VIAGEM</p><h2>Como você quer viajar?</h2><div class="builder-fields"><label>Data de início<input type="date" name="startDate" min="${new Date().toISOString().slice(0,10)}" value="${defaultTripDate()}" required></label><label>Número de viajantes<input type="number" name="travelers" min="1" max="8" value="1" required></label><label>Saída do hotel para passeios<input type="time" name="activityStart" min="07:00" max="10:30" step="1800" value="09:00" required></label></div><h3>Adicione experiências</h3><p class="builder-help">Os adicionais são opcionais e calculados por pessoa.</p><div class="extra-options">${extras.map(extra => `<label class="extra-option"><input type="checkbox" name="extras" value="${html(extra.id)}" data-extra-price="${Number(extra.preco)}"><span><strong>${html(extra.nome)}</strong><small>${html(extra.descricao)}</small></span><b>+ ${html(formatPrice(extra.preco,'BRL'))} / pessoa</b></label>`).join('')}</div></div><aside class="builder-summary"><p class="eyebrow">RESUMO DO PLANO</p><h2>${html(pack.nome)}</h2><p>${html(destination.nome)} · ${html(pack.duracao)}</p><div class="builder-price-row"><span>Pacote por pessoa</span><strong>${html(formatPrice(pack.preco,'BRL'))}</strong></div><div class="builder-price-row"><span>Viajantes</span><strong id="builder-travelers-label">1</strong></div><div class="builder-price-row"><span>Adicionais</span><strong id="builder-extras-total">${html(formatPrice(0,'BRL'))}</strong></div><div class="builder-total"><span>Total demonstrativo</span><strong id="builder-total">${html(formatPrice(pack.preco,'BRL'))}</strong></div><button class="btn-dark full-width" type="submit">Salvar plano e montar calendário ↗</button><small>Este site não cobra nem reserva. O plano ficará salvo somente neste navegador.</small></aside></form></section>`;
    const form = document.getElementById('package-builder-form');
    const updateTotal = () => {
      const travelers = Math.max(1, Math.min(8, Number(form.elements.travelers.value) || 1));
      const extrasTotal = [...form.querySelectorAll('[data-extra-price]:checked')].reduce((sum, input) => sum + Number(input.dataset.extraPrice), 0);
      document.getElementById('builder-travelers-label').textContent = String(travelers);
      document.getElementById('builder-extras-total').textContent = formatPrice(extrasTotal * travelers, 'BRL');
      document.getElementById('builder-total').textContent = formatPrice((Number(pack.preco) + extrasTotal) * travelers, 'BRL');
    };
    form.addEventListener('input', updateTotal);
    form.addEventListener('change', updateTotal);
    form.addEventListener('submit', event => {
      event.preventDefault();
      const startDate = form.elements.startDate.value;
      if (!startDate) return;
      const travelers = Math.max(1, Math.min(8, Number(form.elements.travelers.value) || 1));
      const selected = [...form.querySelectorAll('[data-extra-price]:checked')].map(input => extras.find(extra => extra.id === input.value)).filter(Boolean);
      const total = (Number(pack.preco) + selected.reduce((sum, extra) => sum + Number(extra.preco), 0)) * travelers;
      const plan = { id: `plano-${Date.now()}`, destination: destination.slug, destinationName: destination.nome, packageId: pack.id, packageName: pack.nome, startDate, activityStart: form.elements.activityStart.value, travelers, extras: selected, total, schedule: buildTripSchedule(destination, pack, startDate, form.elements.activityStart.value) };
      const plans = readPackagePlans().filter(item => item.id !== plan.id);
      plans.unshift(plan);
      if (!writePackagePlans(plans)) return;
      location.href = `pagamento.html?plano=${encodeURIComponent(plan.id)}`;
    });
  }

  function renderPayment(root) {
    if (!root) return;
    const planId = new URLSearchParams(location.search).get('plano');
    const plan = readPackagePlans().find(item => item.id === planId);
    if (!plan) {
      root.innerHTML = '<section class="error-state"><h1>Plano não encontrado</h1><a class="btn-dark" href="calendario.html">Ver meus planos ↗</a></section>';
      return;
    }
    if (plan.demoPayment) {
      root.innerHTML = `<section class="page-banner"><p class="eyebrow"><span></span>PLANO FECHADO · SIMULAÇÃO</p><h1>Seu plano já foi concluído.</h1><p>Esta etapa não fez cobrança nem reservou serviços.</p></section><section class="section payment-section"><a class="btn-dark" href="calendario.html?plano=${encodeURIComponent(plan.id)}&fechado=1">Abrir meu calendário ↗</a></section>`;
      return;
    }
    document.title = 'Fechamento demonstrativo — Mundo Aberto';
    root.innerHTML = `<section class="page-banner"><p class="eyebrow"><span></span>ETAPA FICTÍCIA</p><h1>Feche seu plano de viagem.</h1><p>Confira o resumo e escolha uma forma de pagamento demonstrativa.</p></section><section class="section payment-section"><form id="demo-payment-form" class="payment-layout"><div class="payment-options"><p class="eyebrow dark">FORMA DE PAGAMENTO</p><h2>Como você pagaria?</h2><label class="payment-choice"><input type="radio" name="method" value="pix" checked><span><strong>Pix de demonstração</strong><small>Confirmação simulada, sem gerar cobrança ou código de pagamento.</small></span></label><label class="payment-choice"><input type="radio" name="method" value="cartao"><span><strong>Cartão de teste</strong><small>Não pediremos número do cartão, senha ou código de segurança.</small></span></label><div id="installment-field" class="installment-field" hidden><label>Parcelas<select name="installments"><option value="1">1x sem juros</option><option value="3">3x sem juros</option><option value="6">6x sem juros</option></select></label><small id="installment-preview"></small></div><p class="demo-payment-notice"><strong>Importante:</strong> esta etapa é apenas uma demonstração visual. Nenhum dado financeiro será solicitado, enviado ou cobrado.</p></div><aside class="payment-summary"><p class="eyebrow">RESUMO FINAL</p><h2>${html(plan.packageName)}</h2><p>${html(plan.destinationName)} · ${plan.travelers} viajante(s)</p><p>Data de início: ${html(plan.startDate)}</p>${plan.extras?.length ? `<p>Adicionais: ${plan.extras.map(extra => html(extra.nome)).join(' · ')}</p>` : '<p>Sem adicionais selecionados.</p>'}<div class="builder-total"><span>Total do plano</span><strong>${html(formatPrice(plan.total,'BRL'))}</strong></div><button class="btn-dark full-width" type="submit">Confirmar fechamento fictício ↗</button><a class="payment-back" href="montar-pacote.html?destino=${encodeURIComponent(plan.destination)}&pacote=${encodeURIComponent(plan.packageId)}">Voltar e personalizar</a><small>O plano só será marcado como concluído nesta simulação. Não é uma reserva.</small></aside></form></section>`;
    const form = document.getElementById('demo-payment-form');
    const methodInputs = form.querySelectorAll('[name="method"]');
    const installmentField = document.getElementById('installment-field');
    const updateInstallments = () => {
      const isCard = form.elements.method.value === 'cartao';
      installmentField.hidden = !isCard;
      const count = Number(form.elements.installments.value || 1);
      document.getElementById('installment-preview').textContent = isCard ? `${count} parcelas demonstrativas de ${formatPrice(plan.total / count, 'BRL')}.` : '';
    };
    methodInputs.forEach(input => input.addEventListener('change', updateInstallments));
    form.elements.installments.addEventListener('change', updateInstallments);
    updateInstallments();
    form.addEventListener('submit', event => {
      event.preventDefault();
      const plans = readPackagePlans();
      const saved = plans.find(item => item.id === plan.id);
      if (!saved) return;
      saved.demoPayment = { status: 'simulado', method: form.elements.method.value, installments: form.elements.method.value === 'cartao' ? Number(form.elements.installments.value) : 1, closedAt: new Date().toISOString() };
      if (!writePackagePlans(plans)) return;
      location.href = `calendario.html?plano=${encodeURIComponent(plan.id)}&fechado=1`;
    });
  }

  function renderCalendar(root) {
    if (!root) return;
    const params = new URLSearchParams(location.search);
    const plans = readPackagePlans();
    const selectedId = params.get('plano');
    const matchingPlan = selectedId ? plans.filter(plan => plan.id === selectedId) : [];
    const visible = matchingPlan.length ? matchingPlan : plans;
    if (!visible.length) {
      root.innerHTML = `<section class="page-banner"><p class="eyebrow"><span></span>SEU CRONOGRAMA</p><h1>Seu calendário de viagem.</h1><p>Monte um pacote para criar seu cronograma por dia.</p></section><section class="section"><div class="empty-state"><span>✧</span><h2>Nenhum plano salvo ainda</h2><p>Escolha um pacote, personalize a viagem e salve seu plano para montar o calendário.</p><a class="btn-dark" href="destinos.html">Encontrar um pacote ↗</a></div></section>`;
      return;
    }
    const dateLabel = value => new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
    root.innerHTML = `<section class="page-banner"><p class="eyebrow"><span></span>SEU CRONOGRAMA</p><h1>Calendário da viagem.</h1><p>Atividades, horários e lugares do seu plano. Você pode ajustar os horários e adicionar atividades.</p></section><section class="section calendar-section">${visible.map(plan => `<article class="saved-plan"><div class="saved-plan-heading"><div><p class="eyebrow dark">${html(plan.destinationName)}</p><h2>${html(plan.packageName)}</h2><p>${plan.travelers} viajante(s) · início em ${html(dateLabel(plan.startDate))}</p></div><strong>${html(formatPrice(plan.total,'BRL'))}<small> total demonstrativo</small></strong></div>${plan.extras?.length ? `<p class="saved-extras"><strong>Adicionais:</strong> ${plan.extras.map(extra => html(extra.nome)).join(' · ')}</p>` : ''}<div class="calendar-days">${plan.schedule.map((day, dayIndex) => `<section class="calendar-day"><div class="calendar-day-heading"><span>Dia ${dayIndex + 1}</span><h3>${html(dateLabel(day.date))}</h3></div><div class="calendar-events">${day.events.map((item, eventIndex) => `<article class="calendar-event"><label>Horário<input type="time" value="${html(item.time)}" data-calendar-plan="${html(plan.id)}" data-calendar-day="${dayIndex}" data-calendar-event="${eventIndex}" data-calendar-field="time"></label><div class="calendar-event-content"><strong>${html(item.activity)}</strong><p>${html(item.details)}</p><label>Lugar<input type="text" value="${html(item.place)}" data-calendar-plan="${html(plan.id)}" data-calendar-day="${dayIndex}" data-calendar-event="${eventIndex}" data-calendar-field="place"></label></div></article>`).join('')}</div><form class="calendar-add-form" data-add-plan="${html(plan.id)}" data-add-day="${dayIndex}"><input type="time" name="time" value="18:30" aria-label="Horário da atividade" required><input name="activity" placeholder="Nova atividade" aria-label="Nome da atividade" required><input name="place" placeholder="Lugar" aria-label="Lugar da atividade" required><button class="btn-outline" type="submit">+ Adicionar ao dia</button></form></section>`).join('')}</div><p class="package-disclaimer">Plano demonstrativo salvo neste navegador. Nenhum serviço, ingresso ou hospedagem foi reservado.</p></article>`).join('')}</section>`;
    if (params.get('fechado') === '1' && visible.some(item => item.id === selectedId && item.demoPayment?.status === 'simulado')) {
      const notice = document.createElement('div');
      notice.className = 'plan-confirmation';
      notice.innerHTML = '<strong>Plano fechado na simulação!</strong><span>Não houve cobrança e nenhuma reserva real foi feita.</span>';
      root.querySelector('.calendar-section')?.prepend(notice);
    }
    const calendarTools = document.createElement('div');
    calendarTools.className = 'calendar-tools';
    const deleteAllButton = document.createElement('button');
    deleteAllButton.type = 'button';
    deleteAllButton.className = 'btn-outline calendar-delete-all';
    deleteAllButton.dataset.deleteAllPlans = '';
    deleteAllButton.textContent = 'Apagar todos os planos salvos';
    calendarTools.append(deleteAllButton);
    root.querySelector('.calendar-section')?.prepend(calendarTools);
    const printButton = document.createElement('button');
    printButton.type = 'button';
    printButton.className = 'btn-dark calendar-print';
    printButton.dataset.printCalendar = '';
    printButton.textContent = 'Imprimir ou salvar em PDF ↗';
    root.querySelector('.page-banner > p:last-child')?.after(printButton);
    const eventCards = root.querySelectorAll('.calendar-event');
    let cardIndex = 0;
    visible.forEach(plan => plan.schedule.forEach(day => day.events.forEach(item => {
      const title = eventCards[cardIndex++]?.querySelector('.calendar-event-content > strong');
      if (!title) return;
      const duration = document.createElement('small');
      duration.className = 'calendar-event-duration';
      duration.textContent = item.duration || 'Duração a definir';
      title.after(duration);
    })));
    const savedPlanCards = root.querySelectorAll('.saved-plan');
    visible.forEach((plan, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'small-outline plan-delete';
      button.dataset.deletePlan = plan.id;
      button.textContent = 'Apagar este plano';
      savedPlanCards[index]?.querySelector('.saved-plan-heading')?.append(button);
    });
    if (!root.dataset.calendarHandlersBound) {
      root.dataset.calendarHandlersBound = 'true';
      root.addEventListener('click', event => {
        if (event.target.closest('[data-print-calendar]')) window.print();
        if (event.target.closest('[data-delete-all-plans]')) {
          if (!window.confirm('Apagar todos os planos salvos neste navegador?')) return;
          if (writePackagePlans([])) renderCalendar(root);
          return;
        }
        const button = event.target.closest('[data-delete-plan]');
        if (!button) return;
        if (!window.confirm('Apagar este plano salvo neste navegador?')) return;
        const remaining = readPackagePlans().filter(plan => plan.id !== button.dataset.deletePlan);
        if (writePackagePlans(remaining)) renderCalendar(root);
      });
      root.addEventListener('change', event => {
      const input = event.target.closest('[data-calendar-field]');
      if (!input) return;
      const current = readPackagePlans();
      const plan = current.find(item => item.id === input.dataset.calendarPlan);
      const entry = plan?.schedule?.[Number(input.dataset.calendarDay)]?.events?.[Number(input.dataset.calendarEvent)];
      if (!entry) return;
      entry[input.dataset.calendarField] = input.value;
      writePackagePlans(current);
      });
      root.addEventListener('submit', event => {
      const form = event.target.closest('.calendar-add-form');
      if (!form) return;
      event.preventDefault();
      const plansNow = readPackagePlans();
      const plan = plansNow.find(item => item.id === form.dataset.addPlan);
      const day = plan?.schedule?.[Number(form.dataset.addDay)];
      if (!day) return;
      day.events.push({ time: form.elements.time.value, duration: 'A definir', activity: form.elements.activity.value, place: form.elements.place.value, details: 'Atividade adicionada por você.' });
      day.events.sort((a,b) => a.time.localeCompare(b.time));
      if (writePackagePlans(plansNow)) renderCalendar(root);
      });
    }
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
    renderPackageBuilder(document.getElementById('package-builder-root'));
    renderPayment(document.getElementById('payment-root'));
    renderCalendar(document.getElementById('calendar-root'));
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
      const target = document.querySelector('#destination-grid, #home-destinations, #detail-root, #itinerary-list, #map-list, #package-builder-root, #calendar-root');
      if (target) target.innerHTML = '<div class="empty-state"><h2>Não foi possível carregar os destinos</h2><p>Use o Live Server no VS Code para abrir o projeto e confira o arquivo dados.json.</p></div>';
    }
  }

  window.addEventListener('storage', event => {
    if (Object.values(STORAGE).includes(event.key) && catalog.length) renderDynamic();
  });
  document.addEventListener('DOMContentLoaded', init);
})();


