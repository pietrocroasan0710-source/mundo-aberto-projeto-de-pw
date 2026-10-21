/* Efeitos leves sem dependências externas. */
document.addEventListener('DOMContentLoaded', function () {
  const top = document.createElement('button');
  top.type = 'button'; top.className = 'btn-topo'; top.setAttribute('aria-label', 'Voltar ao topo'); top.textContent = '↑'; document.body.appendChild(top);
  const update = () => { document.querySelector('.navbar')?.classList.toggle('rolou', window.scrollY > 30); top.classList.toggle('visivel', window.scrollY > 500); };
  window.addEventListener('scroll', update, { passive: true }); update(); top.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  if ('IntersectionObserver' in window) { const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visivel'); observer.unobserve(entry.target); } }), { threshold: .15 }); document.querySelectorAll('.reveal').forEach(el => observer.observe(el)); }
  else document.querySelectorAll('.reveal').forEach(el => el.classList.add('visivel'));
});
