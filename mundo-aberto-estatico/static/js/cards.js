/* Pequenos comportamentos dos cards do guia turístico. */
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.destination-card').forEach(function (card, index) {
    card.style.setProperty('--card-index', index % 6);
  });
});
