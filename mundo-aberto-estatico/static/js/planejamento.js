/* Planejador do visitante: dias, horários, notas, ordem e orçamento manual. */
(() => {
  'use strict';
  const PLAN_KEY = 'mundoAberto.planejamento.v2';
  const BUDGET_KEY = 'mundoAberto.orcamento.v1';
  let helpers;
  let destinations = [];
  let transportCurrency = '';

  function loadObject(key) {
    try {
      const obj = JSON.parse(localStorage.getItem(key) || '{}');
      return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {};
    } catch { return {}; }
  }
  function writeObject(key, obj) {
    try { localStorage.setItem(key, JSON.stringify(obj)); return true; }
    catch { helpers.notify('Não foi possível salvar os dados no navegador.', true); return false; }
  }
  function dayOf(slug, plan) {
    const n = Number(plan[slug]?.day);
    return Number.isInteger(n) && n >= 1 && n <= 14 ? n : 1;
  }
  const formatDay = day => `Dia ${day}`;

  function render(catalog = destinations) {
    destinations = catalog;
    const root = document.getElementById('itinerary-list');
    if (!root) return;
    const { html, readList, STORAGE, detailUrl, mapUrl, hasCoords, formatPrice } = helpers;
    const chosen = readList(STORAGE.itinerary);
    const bySlug = new Map(destinations.map(d => [d.slug, d]));
    const plan = loadObject(PLAN_KEY);
    const selected = chosen.map(slug => bySlug.get(slug)).filter(Boolean);
    const grouped = new Map();
    selected.forEach(d => {
      const day = dayOf(d.slug, plan);
      if (!grouped.has(day)) grouped.set(day, []);
      grouped.get(day).push(d);
    });
    const list = [...grouped.entries()].sort(([a], [b]) => a - b);
    root.innerHTML = list.map(([day, entries]) => `
      <section class="itinerary-day" aria-label="${formatDay(day)}">
        <div class="itinerary-day-heading"><h2>${formatDay(day)}</h2><span>${entries.length} ${entries.length === 1 ? 'parada' : 'paradas'}</span></div>
        ${entries.map((d, index) => {
          const p = plan[d.slug] || {};
          const options = Array.from({ length: 14 }, (_, i) => `<option value="${i + 1}" ${day === i + 1 ? 'selected' : ''}>Dia ${i + 1}</option>`).join('');
          return `<article class="itinerary-item itinerary-item-extended">
            <img src="${html(d.imagem)}" alt="${html(d.nome)}" loading="lazy">
            <div class="itinerary-content"><span>${html(d.emoji)} ${html(d.pais)} · ${html(d.categoria)}</span>
              <h3><a href="${detailUrl(d.slug)}">${html(d.nome)}</a></h3>
              <p>${html(d.resumo)}</p>
              <div class="itinerary-fields">
                <label>Dia <select data-plan-day="${html(d.slug)}" aria-label="Dia para ${html(d.nome)}">${options}</select></label>
                <label>Horário <input type="time" data-plan-time="${html(d.slug)}" value="${html(p.time || '')}" aria-label="Horário para ${html(d.nome)}"></label>
                <label class="plan-note">Observação <input type="text" data-plan-note="${html(d.slug)}" value="${html(p.note || '')}" maxlength="120" placeholder="Ex.: visitar pela manhã" aria-label="Observação para ${html(d.nome)}"></label>
              </div>
              <div class="itinerary-actions">
                <button type="button" class="small-outline" data-plan-move="up" data-slug="${html(d.slug)}" ${index === 0 ? 'disabled' : ''} aria-label="Subir ${html(d.nome)} na ordem">↑ Subir</button>
                <button type="button" class="small-outline" data-plan-move="down" data-slug="${html(d.slug)}" ${index === entries.length - 1 ? 'disabled' : ''} aria-label="Descer ${html(d.nome)} na ordem">↓ Descer</button>
                ${hasCoords(d) ? `<a class="small-outline" href="${mapUrl(d)}" target="_blank" rel="noopener noreferrer">Ver mapa ↗</a>` : ''}
                <button type="button" class="remove-btn" data-itinerary="${html(d.slug)}">Remover ×</button>
              </div>
            </div>
          </article>`;
        }).join('')}
      </section>`).join('');

    const count = document.getElementById('results-count');
    const empty = document.getElementById('empty-state');
    const action = document.getElementById('itinerary-action');
    if (count) count.textContent = `${selected.length} ${selected.length === 1 ? 'destino no roteiro' : 'destinos no roteiro'}`;
    if (empty) empty.hidden = selected.length > 0;
    if (action) action.hidden = selected.length === 0;
    const totalByCurrency = new Map();
    selected.forEach(d => {
      if (d.preco_passeio != null) totalByCurrency.set(d.moeda, (totalByCurrency.get(d.moeda) || 0) + Number(d.preco_passeio));
    });
    const unknown = selected.filter(d => d.preco_passeio == null).length;
    const summary = document.getElementById('itinerary-price-summary');
    if (summary) {
      summary.hidden = selected.length === 0;
      const sums = [...totalByCurrency.entries()].map(([currency, total]) => formatPrice(total, currency)).join(' · ');
      const hasSimulated = selected.some(d => d.preco_tipo === 'simulado' && d.preco_passeio != null);
      summary.innerHTML = `<strong>Preços de referência dos passeios</strong>
        <p>${html(sums || 'Nenhum valor informado')}</p>
        <small>${hasSimulated ? 'Inclui preços fictícios. ' : ''}${unknown} ${unknown === 1 ? 'destino sem preço informado' : 'destinos sem preços informados'}. Os valores acima não incluem transporte, alimentação ou hospedagem. Moedas não são misturadas.</small>`;
    }
    const exportButton = document.getElementById('export-itinerary');
    if (exportButton) exportButton.disabled = selected.length === 0;
  }

  function savePlanControl(node) {
    const slug = node.dataset.planDay || node.dataset.planTime || node.dataset.planNote;
    if (!destinations.some(d => d.slug === slug)) return;
    const plan = loadObject(PLAN_KEY);
    const current = plan[slug] && typeof plan[slug] === 'object' ? plan[slug] : {};
    if (node.hasAttribute('data-plan-day')) current.day = Math.max(1, Math.min(14, Math.floor(Number(node.value) || 1)));
    if (node.hasAttribute('data-plan-time')) current.time = /^([01]\d|2[0-3]):[0-5]\d$/.test(node.value) ? node.value : '';
    if (node.hasAttribute('data-plan-note')) current.note = node.value.trim().slice(0, 120);
    plan[slug] = current;
    if (writeObject(PLAN_KEY, plan) && node.hasAttribute('data-plan-day')) render();
  }

  function move(slug, direction) {
    const { readList, saveList, STORAGE } = helpers;
    const chosen = readList(STORAGE.itinerary);
    const plan = loadObject(PLAN_KEY);
    const day = dayOf(slug, plan);
    const sameDay = chosen.filter(s => dayOf(s, plan) === day);
    const idx = sameDay.indexOf(slug);
    const next = idx + (direction === 'up' ? -1 : 1);
    if (idx < 0 || next < 0 || next >= sameDay.length) return;
    const other = sameDay[next];
    const a = chosen.indexOf(slug), b = chosen.indexOf(other);
    [chosen[a], chosen[b]] = [chosen[b], chosen[a]];
    if (saveList(STORAGE.itinerary, chosen)) render();
  }

  function exportItinerary() {
    const bySlug = new Map(destinations.map(d => [d.slug, d]));
    const plan = loadObject(PLAN_KEY);
    const items = helpers.readList(helpers.STORAGE.itinerary).map(s => bySlug.get(s)).filter(Boolean);
    if (!items.length) return;
    const lines = ['MUNDO ABERTO — MEU ROTEIRO', 'Gerado em ' + new Date().toLocaleDateString('pt-BR'), ''];
    [...new Set(items.map(d => dayOf(d.slug, plan)))].sort((a,b) => a-b).forEach(day => {
      lines.push(formatDay(day));
      items.filter(d => dayOf(d.slug, plan) === day).forEach(d => {
        const p = plan[d.slug] || {};
        lines.push(`- ${p.time || 'Sem horário'} | ${d.nome} (${d.pais})`);
        if (p.note) lines.push('  Observação: ' + p.note);
      });
      lines.push('');
    });
    lines.push('Planejamento pessoal. Confirme valores e horários nas fontes oficiais.');
    const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'meu-roteiro-mundo-aberto.txt';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function renderBudget() {
    const form = document.getElementById('budget-form');
    const total = document.getElementById('budget-result');
    if (!form || !total) return;
    const f = name => Math.max(0, Number(form.elements.namedItem(name)?.value) || 0);
    const days = Math.min(60, Math.max(1, Math.floor(f('days') || 1)));
    const nights = Math.max(0, days - 1);
    const lodging = nights * f('lodging');
    const food = days * f('food');
    const transit = f('transport');
    const tickets = f('tickets');
    const extras = f('extras');
    const grand = lodging + food + transit + tickets + extras;
    const currency = form.elements.namedItem('currency').value;
    const money = n => helpers.formatPrice(n, currency);
    total.innerHTML = `<span>Estimativa total da sua viagem</span><strong>${money(grand)}</strong>
      <small>${days} ${days === 1 ? 'dia' : 'dias'} · ${nights} ${nights === 1 ? 'noite' : 'noites'}</small>
      <div class="budget-breakdown"><span>Hospedagem</span><b>${money(lodging)}</b><span>Alimentação</span><b>${money(food)}</b>
      <span>${transportCurrency ? 'Transporte simulado' : 'Transporte'}</span><b>${money(transit)}</b><span>Passeios</span><b>${money(tickets)}</b><span>Extras</span><b>${money(extras)}</b></div>`;
  }

  function saveBudget(form) {
    const data = Object.fromEntries(new FormData(form).entries());
    writeObject(BUDGET_KEY, { ...data, transportCurrency });
    renderBudget();
  }

  function applyTransport(value, currency) {
    const budget = document.getElementById('budget-form');
    if (!budget || budget.elements.namedItem('currency').value !== currency) return false;
    budget.elements.namedItem('transport').value = String(value);
    transportCurrency = currency;
    saveBudget(budget);
    return true;
  }

  function init(catalog, utilities) {
    destinations = catalog;
    helpers = utilities;
    const root = document.getElementById('itinerary-list');
    if (!root) return;
    const budget = document.getElementById('budget-form');
    if (budget) {
      const saved = loadObject(BUDGET_KEY);
      Object.entries(saved).forEach(([name, value]) => {
        const input = budget.elements.namedItem(name);
        if (input && ['days', 'lodging', 'food', 'transport', 'tickets', 'extras', 'currency'].includes(name)) input.value = value;
      });
      const transport = budget.elements.namedItem('transport');
      const currency = budget.elements.namedItem('currency');
      transportCurrency = saved.transportCurrency === currency.value ? currency.value : '';
      const onBudgetEdit = event => {
        if (event.target === transport) transportCurrency = '';
        if (transportCurrency && transportCurrency !== currency.value) {
          transport.value = '0';
          transportCurrency = '';
          helpers.notify('O valor da passagem em reais foi retirado ao trocar a moeda.');
        }
        saveBudget(budget);
      };
      budget.addEventListener('input', onBudgetEdit);
      budget.addEventListener('change', onBudgetEdit);
      budget.addEventListener('submit', event => event.preventDefault());
      renderBudget();
    }
    root.addEventListener('change', event => {
      const control = event.target.closest('[data-plan-day], [data-plan-time], [data-plan-note]');
      if (control) savePlanControl(control);
    });
    root.addEventListener('click', event => {
      const button = event.target.closest('[data-plan-move]');
      if (button) move(button.dataset.slug, button.dataset.planMove);
    });
    document.getElementById('export-itinerary')?.addEventListener('click', exportItinerary);
    render();
  }
  window.MundoAbertoPlanejamento = { init, render, applyTransport };
})();
