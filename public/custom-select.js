// Custom dropdowns for the website and the admin area: every <select> gets a
// button and a list in the site's style instead of the system menu. The real
// <select> stays in the form, visually hidden, and keeps the value,
// validation and change events, so forms work as before. Without JavaScript
// the plain select shows. Opt out with <select data-native>.
// Keyboard: arrows, Home/End, Page Up/Down, Enter/Space, Esc and typing a
// letter, like the select-only combobox in the WAI-ARIA practices.

let count = 0;

function enhanceSelect(select) {
  if (select.multiple || select.size > 1 || 'enhanced' in select.dataset || 'native' in select.dataset) return;
  select.dataset.enhanced = '';
  const uid = `mx-select-${++count}`;

  const wrap = document.createElement('div');
  wrap.className = 'mx-select';
  select.before(wrap);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'mx-select__button';
  button.setAttribute('role', 'combobox');
  button.setAttribute('aria-haspopup', 'listbox');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', `${uid}-list`);
  const shown = document.createElement('span');
  shown.className = 'mx-select__value';
  button.append(shown);

  const list = document.createElement('ul');
  list.className = 'mx-select__list';
  list.id = `${uid}-list`;
  list.setAttribute('role', 'listbox');
  list.tabIndex = -1;
  list.hidden = true;

  // Name: the select's <label>, else its aria-label.
  const label = select.labels?.[0];
  if (label) {
    label.id ||= `${uid}-label`;
    button.setAttribute('aria-labelledby', `${label.id} ${uid}-value`);
    shown.id = `${uid}-value`;
    list.setAttribute('aria-labelledby', label.id);
  } else if (select.getAttribute('aria-label')) {
    button.setAttribute('aria-label', select.getAttribute('aria-label'));
    list.setAttribute('aria-label', select.getAttribute('aria-label'));
  }

  select.classList.add('mx-select__native');
  select.tabIndex = -1;
  select.setAttribute('aria-hidden', 'true');
  wrap.append(select, button, list);

  let items = [];
  let active = -1;
  const isDisabled = (i) => items[i]?.getAttribute('aria-disabled') === 'true';

  const sync = () => {
    const option = select.options[select.selectedIndex];
    shown.textContent = option?.textContent ?? '';
    button.classList.toggle('is-placeholder', !option || option.value === '');
    items.forEach((item, i) => item.setAttribute('aria-selected', String(i === select.selectedIndex)));
  };

  const build = () => {
    items = [...select.options].map((option, i) => {
      const item = document.createElement('li');
      item.id = `${uid}-${i}`;
      item.className = 'mx-select__option';
      item.setAttribute('role', 'option');
      item.textContent = option.textContent;
      item.dataset.index = String(i);
      if (option.disabled) item.setAttribute('aria-disabled', 'true');
      // An empty first option of a required select is only the prompt.
      if (select.required && option.value === '') {
        item.hidden = true;
        item.setAttribute('aria-disabled', 'true');
      }
      return item;
    });
    list.replaceChildren(...items);
    sync();
  };

  // Mirror what the form code sets on the select (errors, hints, disabled).
  const mirror = () => {
    for (const name of ['aria-invalid', 'aria-describedby']) {
      const value = select.getAttribute(name);
      if (value === null) button.removeAttribute(name);
      else button.setAttribute(name, value);
    }
    if (select.required) button.setAttribute('aria-required', 'true');
    else button.removeAttribute('aria-required');
    button.disabled = select.disabled;
  };

  // Code that sets select.value / selectedIndex updates the button too.
  const proto = HTMLSelectElement.prototype;
  for (const key of ['value', 'selectedIndex']) {
    const native = Object.getOwnPropertyDescriptor(proto, key);
    Object.defineProperty(select, key, {
      configurable: true,
      get() { return native.get.call(this); },
      set(value) { native.set.call(this, value); sync(); },
    });
  }

  const move = (i) => {
    if (!items.length) return;
    i = Math.max(0, Math.min(items.length - 1, i));
    active = i;
    items.forEach((item, n) => item.classList.toggle('is-active', n === i));
    button.setAttribute('aria-activedescendant', items[i].id);
    items[i].scrollIntoView({ block: 'nearest' });
  };
  // Next enabled option in a direction, staying put at the ends.
  const step = (from, by) => {
    let i = from;
    for (let n = 0; n < items.length; n++) {
      const next = i + Math.sign(by);
      if (next < 0 || next >= items.length) break;
      i = next;
      if (!isDisabled(i) && Math.abs(i - from) >= Math.abs(by)) break;
    }
    return isDisabled(i) ? from : i;
  };

  const isOpen = () => !list.hidden;
  const open = () => {
    if (select.disabled || isOpen()) return;
    list.hidden = false;
    wrap.classList.add('is-open');
    button.setAttribute('aria-expanded', 'true');
    // Open upwards when there's no room below.
    const box = button.getBoundingClientRect();
    const below = innerHeight - box.bottom;
    wrap.classList.toggle('is-up', below < Math.min(list.scrollHeight, 280) + 16 && box.top > below);
    move(isDisabled(select.selectedIndex) || select.selectedIndex < 0 ? step(-1, 1) : select.selectedIndex);
  };
  const close = () => {
    if (!isOpen()) return;
    list.hidden = true;
    wrap.classList.remove('is-open', 'is-up');
    button.setAttribute('aria-expanded', 'false');
    button.removeAttribute('aria-activedescendant');
  };
  const choose = (i) => {
    if (i < 0 || isDisabled(i)) return;
    if (select.selectedIndex !== i) {
      select.selectedIndex = i;
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    close();
    button.focus();
  };

  // Typing letters jumps to the first matching option.
  let typed = '';
  let typedAt = 0;
  const typeahead = (char) => {
    const now = Date.now();
    typed = now - typedAt > 700 ? char : typed + char;
    typedAt = now;
    const start = typed.length === 1 ? active + 1 : active;
    const order = items.map((_, n) => (start + n) % items.length);
    const hit = order.find((n) => !isDisabled(n) && items[n].textContent.trim().toLowerCase().startsWith(typed));
    if (hit !== undefined) move(hit);
  };

  button.addEventListener('click', () => (isOpen() ? close() : open()));
  button.addEventListener('blur', close);
  button.addEventListener('keydown', (event) => {
    const { key } = event;
    if (!isOpen()) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(key)) {
        event.preventDefault();
        open();
      } else if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        open();
        typeahead(key.toLowerCase());
      }
      return;
    }
    const moves = { ArrowDown: 1, ArrowUp: -1, PageDown: 5, PageUp: -5 };
    if (key in moves) move(step(active, moves[key]));
    else if (key === 'Home') move(step(-1, 1));
    else if (key === 'End') move(step(items.length, -1));
    else if (key === 'Enter' || (key === ' ' && Date.now() - typedAt > 700)) choose(active);
    else if (key === 'Escape') {
      close();
      event.stopPropagation(); // don't close a surrounding dialog too
    } else if (key === 'Tab') {
      close();
      return;
    } else if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) typeahead(key.toLowerCase());
    else return;
    event.preventDefault();
  });

  // Keep focus on the button while using the list with the mouse.
  list.addEventListener('mousedown', (event) => event.preventDefault());
  list.addEventListener('click', (event) => {
    const item = event.target.closest('[role="option"]');
    if (item) choose(Number(item.dataset.index));
  });
  list.addEventListener('pointermove', (event) => {
    const item = event.target.closest('[role="option"]');
    if (item && !isDisabled(Number(item.dataset.index))) move(Number(item.dataset.index));
  });

  // A click on the <label> or select.focus() lands on the button.
  select.focus = (options) => button.focus(options);
  select.addEventListener('focus', () => setTimeout(() => button.focus()));
  label?.addEventListener('click', (event) => {
    event.preventDefault();
    button.focus();
  });
  select.form?.addEventListener('reset', () => setTimeout(sync));

  new MutationObserver(build).observe(select, { childList: true, subtree: true, characterData: true });
  new MutationObserver(mirror).observe(select, { attributes: true, attributeFilter: ['aria-invalid', 'aria-describedby', 'disabled', 'required'] });
  build();
  mirror();
}

document.querySelectorAll('select').forEach(enhanceSelect);
