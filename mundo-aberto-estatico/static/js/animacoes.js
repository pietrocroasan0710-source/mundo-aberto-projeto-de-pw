/* Efeitos leves que também funcionam em cartões criados depois do carregamento. */
(() => {
  let observer;
  function refresh(root = document) {
    const cards = [...root.querySelectorAll('.reveal')];
    cards.forEach((card, index) => {
      card.style.setProperty('--card-index', String(index % 6));
      if (card.dataset.motionReady) return;
      card.dataset.motionReady = 'true';
      if (observer) observer.observe(card);
      else card.classList.add('visivel');
    });
  }
  document.addEventListener('DOMContentLoaded', () => {
    const top = document.createElement('button');
    top.type = 'button';
    top.className = 'btn-topo';
    top.setAttribute('aria-label', 'Voltar ao topo');
    top.textContent = '↑';
    document.body.append(top);
    const update = () => {
      document.querySelector('.navbar')?.classList.toggle('rolou', window.scrollY > 30);
      top.classList.toggle('visivel', window.scrollY > 500);
    };
    window.addEventListener('scroll', update, { passive: true });
    top.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    update();
    if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visivel');
          observer.unobserve(entry.target);
        }
      }), { threshold: 0.08 });
    }
    refresh();
  });
  window.MundoAbertoAnimacoes = { refresh };
})();
