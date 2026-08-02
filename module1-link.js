(() => {
  'use strict';
  document.addEventListener('click', (event) => {
    const card = event.target.closest('[data-module-id="1"]');
    if (!card || card.classList.contains('is-locked')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    location.href = './module1.html';
  }, true);
})();