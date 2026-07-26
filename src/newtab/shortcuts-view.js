(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.LumnoNewtabShortcutsView = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  function createNoopView(options) {
    const tiles = options && Array.isArray(options.tiles) ? options.tiles : [];
    return {
      render() {
        tiles.length = 0;
        return { count: 0 };
      },
      clear() {
        tiles.length = 0;
      },
      refreshElements() {
        tiles.length = 0;
      },
      getTiles() {
        return tiles;
      },
      getAddButton() {
        return null;
      }
    };
  }

  function createShortcutsView(options) {
    const opts = options && typeof options === 'object' ? options : {};
    const grid = opts.grid;
    const tiles = Array.isArray(opts.tiles) ? opts.tiles : [];
    if (!grid || typeof grid.appendChild !== 'function') {
      return createNoopView(opts);
    }

    const renderTile = typeof opts.renderTile === 'function'
      ? opts.renderTile
      : () => null;
    const createAddButton = typeof opts.createAddButton === 'function'
      ? opts.createAddButton
      : () => null;
    let addButton = null;

    function ensureAddButton() {
      if (!addButton) {
        addButton = createAddButton();
      }
      return addButton;
    }

    function refreshElements() {
      tiles.length = 0;
      if (typeof grid.querySelectorAll === 'function') {
        Array.from(grid.querySelectorAll('.x-nt-shortcut-tile[data-shortcut-id]'))
          .forEach((tile) => tiles.push(tile));
      }
      addButton = typeof grid.querySelector === 'function'
        ? grid.querySelector('.x-nt-shortcut-tile--add')
        : addButton;
    }

    function clear() {
      grid.innerHTML = '';
      tiles.length = 0;
      addButton = null;
    }

    function render(items) {
      const normalizedItems = Array.isArray(items) ? items : [];
      grid.innerHTML = '';
      tiles.length = 0;
      normalizedItems.forEach((shortcut) => {
        const tile = renderTile(shortcut);
        if (tile) {
          grid.appendChild(tile);
        }
      });
      const nextAddButton = ensureAddButton();
      if (nextAddButton) {
        grid.appendChild(nextAddButton);
      }
      refreshElements();
      return { count: normalizedItems.length };
    }

    return {
      render,
      clear,
      refreshElements,
      getTiles() {
        return tiles;
      },
      getAddButton() {
        return addButton || ensureAddButton();
      }
    };
  }

  return Object.freeze({
    implementation: 'legacy',
    createShortcutsView
  });
});
