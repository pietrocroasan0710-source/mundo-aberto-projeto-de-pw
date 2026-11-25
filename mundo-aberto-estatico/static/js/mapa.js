/* Mapa explorável dos destinos: iframe de OpenStreetMap sem API nem chaves. */
(() => {
  let items = [];
  let helpers;
  let activeSlug = null;

  function render(destinations = items) {
    items = destinations;
    const list = document.getElementById('map-list');
    if (!list || !helpers) return;
    const { html, hasCoords } = helpers;
    const mappable = items.filter(hasCoords);
    if (!activeSlug || !mappable.some(d => d.slug === activeSlug)) activeSlug = mappable[0]?.slug;
    list.innerHTML = mappable.map(d => `
      <button type="button" class="map-location ${activeSlug === d.slug ? 'is-active' : ''}" data-map-slug="${html(d.slug)}" aria-pressed="${activeSlug === d.slug}">
        <span>${html(d.emoji)}</span><span><strong>${html(d.nome)}</strong><small>${html(d.pais)}</small></span><span aria-hidden="true">↗</span>
      </button>`).join('');
    const current = mappable.find(d => d.slug === activeSlug);
    if (!current) return;
    const iframe = document.getElementById('explore-map');
    if (iframe && iframe.dataset.slug !== current.slug) {
      iframe.src = helpers.embedMap(current);
      iframe.title = `Mapa explorável de ${current.nome}`;
      iframe.dataset.slug = current.slug;
    }
    document.getElementById('map-title').textContent = current.nome;
    const link = document.getElementById('map-link');
    link.href = helpers.mapUrl(current);
    const detail = document.getElementById('map-detail');
    detail.href = 'destino.html?slug=' + encodeURIComponent(current.slug);
  }

  function init(destinations, utilities) {
    if (!document.getElementById('map-list')) return;
    helpers = utilities;
    items = destinations;
    document.getElementById('map-list').addEventListener('click', event => {
      const button = event.target.closest('[data-map-slug]');
      if (!button) return;
      activeSlug = button.dataset.mapSlug;
      render();
    });
    render();
  }
  window.MundoAbertoMapa = { init, render };
})();
