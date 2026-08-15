const mascot = (() => {
  let oopsEl = null;

  function showOops(container) {
    if (!oopsEl) {
      oopsEl = document.createElement('img');
      oopsEl.className = 'mascot mascot-oops';
      oopsEl.src = 'assets/mascot-oops.png';
      oopsEl.alt = 'A cartoon boy looking surprised';
      container.appendChild(oopsEl);
    }
    soundEffects.playOops();
  }

  function hideOops() {
    if (oopsEl) {
      oopsEl.remove();
      oopsEl = null;
    }
  }

  function showYay(container) {
    soundEffects.playYay();

    const el = document.createElement('img');
    el.className = 'mascot mascot-yay';
    el.src = 'assets/mascot-yay.png';
    el.alt = 'A cartoon boy cheering with a party popper';
    container.appendChild(el);

    setTimeout(() => {
      el.classList.add('mascot-fade-out');
      setTimeout(() => el.remove(), 400);
    }, 1500);
  }

  return { showOops, hideOops, showYay };
})();
