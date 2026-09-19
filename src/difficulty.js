/**
 * GameDifficulty - reusable difficulty selection layer.
 *
 * Vanilla JavaScript, no dependencies, no build step.
 * Drop this file into any game page and:
 *   1) <script src="src/difficulty.js"></script>
 *   2) const selector = GameDifficulty.createSelector({ ... });
 *   3) selector.show();
 *
 * Exposes window.GameDifficulty with:
 *   - levels         default Easy / Normal / Hard definitions
 *   - normalize(v)   coerce a value to "easy" | "normal" | "hard" ("normal" fallback)
 *   - createSelector builds an accessible difficulty picker
 *
 * The selector returns a normalized id ("easy" | "normal" | "hard") to the
 * caller's onStart callback. Each game decides what those ids mean.
 */
(function () {
  'use strict';

  const DEFAULT_LEVELS = [
    { id: 'easy', label: 'Easy', tagline: 'Relaxed challenge' },
    { id: 'normal', label: 'Normal', tagline: 'Balanced challenge' },
    { id: 'hard', label: 'Hard', tagline: 'More challenging' }
  ];

  const VALID_IDS = DEFAULT_LEVELS.map(function (level) {
    return level.id;
  });

  function normalize(value) {
    const v = String(value === undefined || value === null ? '' : value).toLowerCase();
    return VALID_IDS.indexOf(v) !== -1 ? v : 'normal';
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const CHECK_SVG =
    '<svg class="difficulty-option-check" viewBox="0 0 20 20" fill="none" aria-hidden="true">' +
    '<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M4 10.5l4 4 8-8"></path>' +
    '</svg>';

  function createSelector(options) {
    options = options || {};

    const root = options.root || document.body;
    const levels = (Array.isArray(options.levels) && options.levels.length)
      ? options.levels.map(function (level) {
          return {
            id: level.id,
            label: level.label || level.id,
            tagline: level.tagline || '',
            hint: level.hint || ''
          };
        })
      : DEFAULT_LEVELS.slice();

    const title = options.title || 'Choose Your Difficulty';
    const intro = options.intro || 'Select how challenging you want today\u2019s activity to be. You can change it at any time.';
    const eyebrow = options.eyebrow || '';
    const startLabel = options.startLabel || 'Start Game';
    const backLabel = options.backLabel || 'Back';
    const onStart = typeof options.onStart === 'function' ? options.onStart : null;
    const onBack = typeof options.onBack === 'function' ? options.onBack : null;

    const uid = 'gd-' + Math.random().toString(36).slice(2, 9);
    const titleId = uid + '-title';

    let optionsHtml = '';
    levels.forEach(function (level) {
      const hintHtml = level.hint
        ? '<span class="difficulty-option-hint">' + escapeHtml(level.hint) + '</span>'
        : '';
      optionsHtml +=
        '<button type="button" role="radio" aria-checked="false" class="difficulty-option" data-difficulty="' +
          escapeHtml(level.id) + '" tabindex="-1">' +
          '<span class="difficulty-option-indicator" aria-hidden="true">' + CHECK_SVG + '</span>' +
          '<span class="difficulty-option-text">' +
            '<span class="difficulty-option-label">' + escapeHtml(level.label) + '</span>' +
            '<span class="difficulty-option-tagline">' + escapeHtml(level.tagline) + '</span>' +
            hintHtml +
          '</span>' +
        '</button>';
    });

    const html =
      '<div class="difficulty-screen is-hidden" role="dialog" aria-modal="true" aria-labelledby="' + titleId + '">' +
        '<div class="difficulty-panel">' +
          (eyebrow ? '<p class="difficulty-eyebrow">' + escapeHtml(eyebrow) + '</p>' : '') +
          '<h2 class="difficulty-title" id="' + titleId + '">' + escapeHtml(title) + '</h2>' +
          '<p class="difficulty-intro">' + escapeHtml(intro) + '</p>' +
          '<div class="difficulty-options" role="radiogroup" aria-labelledby="' + titleId + '">' +
            optionsHtml +
          '</div>' +
          '<button type="button" class="difficulty-start" disabled>' + escapeHtml(startLabel) + '</button>' +
          '<button type="button" class="difficulty-back">' + escapeHtml(backLabel) + '</button>' +
        '</div>' +
      '</div>';

    const wrap = document.createElement('div');
    wrap.innerHTML = html;
    const screen = wrap.firstElementChild;
    const startBtn = screen.querySelector('.difficulty-start');
    const backBtn = screen.querySelector('.difficulty-back');
    const group = screen.querySelector('.difficulty-options');
    const optionEls = Array.prototype.slice.call(screen.querySelectorAll('.difficulty-option'));

    let selectedIndex = -1;

    function select(index, doFocus) {
      index = Math.max(0, Math.min(optionEls.length - 1, index));
      if (index === selectedIndex) {
        if (doFocus && optionEls[index]) optionEls[index].focus();
        return;
      }
      selectedIndex = index;
      optionEls.forEach(function (el, i) {
        const isSelected = i === selectedIndex;
        el.classList.toggle('is-selected', isSelected);
        el.setAttribute('aria-checked', isSelected ? 'true' : 'false');
        el.tabIndex = isSelected ? 0 : -1;
      });
      if (doFocus && optionEls[index]) optionEls[index].focus();
      startBtn.disabled = selectedIndex === -1;
    }

    function focusSelected() {
      if (selectedIndex !== -1 && optionEls[selectedIndex]) optionEls[selectedIndex].focus();
    }

    // Roving tabindex + arrow-key navigation (ARIA radiogroup pattern).
    group.addEventListener('keydown', function (event) {
      const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
      if (keys.indexOf(event.key) === -1) return;
      event.preventDefault();
      let next = selectedIndex;
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next -= 1;
      else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next += 1;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = optionEls.length - 1;
      select(next, true);
    });

    optionEls.forEach(function (el, i) {
      el.addEventListener('click', function () {
        select(i, true);
      });
    });

    startBtn.addEventListener('click', function () {
      if (startBtn.disabled || !onStart) return;
      onStart(levels[selectedIndex].id);
    });

    backBtn.addEventListener('click', function () {
      if (onBack) onBack();
    });

    const api = {
      show: function () {
        screen.classList.remove('is-hidden');
        focusSelected();
      },
      hide: function () {
        screen.classList.add('is-hidden');
      },
      selectLevel: function (id) {
        const targetId = normalize(id);
        let index = -1;
        for (let i = 0; i < levels.length; i++) {
          if (levels[i].id === targetId) {
            index = i;
            break;
          }
        }
        select(index === -1 ? 0 : index, false);
      },
      isVisible: function () {
        return !screen.classList.contains('is-hidden');
      },
      getSelected: function () {
        return selectedIndex === -1 ? null : levels[selectedIndex].id;
      },
      destroy: function () {
        if (screen.parentNode) screen.parentNode.removeChild(screen);
      }
    };

    // Pre-select the requested level (defaults to "normal") so Start is ready.
    const initialId = normalize(options.initial);
    let initialIndex = -1;
    for (let i = 0; i < levels.length; i++) {
      if (levels[i].id === initialId) {
        initialIndex = i;
        break;
      }
    }
    if (initialIndex === -1) initialIndex = 0;
    select(initialIndex, false);

    root.appendChild(screen);

    return api;
  }

  window.GameDifficulty = {
    levels: DEFAULT_LEVELS.slice(),
    normalize: normalize,
    createSelector: createSelector
  };
})();