/* Aplica um pequeno atraso diferente em cada cartão para a grade surgir suavemente. */
document.addEventListener('DOMContentLoaded',
 function ()  {
    document.querySelectorAll('.destination-card').forEach(function (card,
   index)  {
        card.style.setProperty('--card-index',
     index % 6);
  });
});
