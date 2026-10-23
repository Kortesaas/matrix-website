// Small helpers for the admin forms. Everything works without JavaScript too.

// Mobile menu.
const toggle = document.querySelector('.nav-toggle');
const nav = document.getElementById('nav');
toggle?.addEventListener('click', () => {
  const open = nav.classList.toggle('is-open');
  toggle.setAttribute('aria-expanded', String(open));
});

// Ask before deleting, in the site's style instead of the browser's box.
const dialog = document.querySelector('[data-confirm-dialog]');
document.querySelectorAll('form[data-confirm]').forEach((form) => {
  form.addEventListener('submit', (event) => {
    if (form.dataset.confirmed) return;
    event.preventDefault();
    if (!dialog?.showModal) {
      if (confirm(form.dataset.confirm)) {
        form.dataset.confirmed = '1';
        form.requestSubmit();
      }
      return;
    }
    dialog.querySelector('[data-confirm-text]').textContent = form.dataset.confirm;
    dialog.querySelector('[data-confirm-yes]').textContent = form.dataset.confirmAction || 'Ja, löschen';
    dialog.onclose = () => {
      if (dialog.returnValue !== 'yes') return;
      form.dataset.confirmed = '1';
      form.requestSubmit();
    };
    dialog.returnValue = '';
    dialog.showModal();
  });
});
dialog?.querySelector('[data-confirm-yes]').addEventListener('click', () => dialog.close('yes'));
dialog?.querySelector('[data-confirm-no]').addEventListener('click', () => dialog.close('no'));
dialog?.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close('no');
});

// Account menu: close on outside click or Escape.
const usermenu = document.querySelector('.usermenu');
document.addEventListener('click', (event) => {
  if (usermenu?.open && !usermenu.contains(event.target)) usermenu.open = false;
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && usermenu?.open) {
    usermenu.open = false;
    usermenu.querySelector('summary').focus();
  }
});

// Save checkboxes marked as such right away.
document.querySelectorAll('[data-autosubmit]').forEach((input) => {
  input.addEventListener('change', () => input.form.requestSubmit());
});

// Image pickers: preview, file name, drag and drop.
document.querySelectorAll('[data-upload]').forEach((upload) => {
  const input = upload.querySelector('input[type="file"]');
  const drop = upload.querySelector('[data-upload-drop]');
  const preview = upload.querySelector('[data-upload-preview]');
  const name = upload.querySelector('[data-upload-name]');
  const show = () => {
    const file = input.files?.[0];
    if (!file) return;
    name.textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(1).replace('.', ',')} MB)`;
    if (preview) {
      preview.src = URL.createObjectURL(file);
      preview.hidden = false;
    }
  };
  input.addEventListener('change', show);
  for (const type of ['dragenter', 'dragover']) {
    drop.addEventListener(type, (event) => {
      event.preventDefault();
      drop.classList.add('is-over');
    });
  }
  for (const type of ['dragleave', 'drop']) drop.addEventListener(type, () => drop.classList.remove('is-over'));
  drop.addEventListener('drop', (event) => {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    show();
  });
});

// Rows (opening hours, Speisekarte): add, remove and move them. Buttons act
// on the rows of their [data-row-scope], else on the page's [data-rows].
const rowsFor = (button) => button.closest('[data-row-scope]')?.querySelector('[data-rows]') ?? document.querySelector('[data-rows]');
const clear = (row) => row.querySelectorAll('input').forEach((input) => (input.value = ''));
// Moves an element past its next or previous sibling of the same kind.
const move = (element, selector, by) => {
  const siblings = [...element.parentElement.querySelectorAll(`:scope > ${selector}`)];
  const target = siblings[siblings.indexOf(element) + by];
  if (target) target[by < 0 ? 'before' : 'after'](element);
};
document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.matches('[data-add-row]')) {
    const rows = rowsFor(button);
    const all = rows.querySelectorAll('[data-row]');
    const row = all[all.length - 1].cloneNode(true);
    clear(row);
    rows.append(row);
    row.querySelector('input').focus();
  } else if (button.matches('[data-remove-row]')) {
    const row = button.closest('[data-row]');
    if (row.parentElement.querySelectorAll(':scope > [data-row]').length > 1) row.remove();
    else clear(row);
  } else if (button.matches('[data-move-row]')) {
    move(button.closest('[data-row]'), '[data-row]', Number(button.dataset.moveRow));
    button.focus();
  } else if (button.matches('[data-move-group]')) {
    move(button.closest('[data-group]'), '[data-group]', Number(button.dataset.moveGroup));
    button.focus();
  } else if (button.matches('[data-remove-group]')) {
    const group = button.closest('[data-group]');
    if (group.parentElement.querySelectorAll(':scope > [data-group]').length > 1) group.remove();
    else clear(group);
  } else if (button.matches('[data-add-group]')) {
    const template = document.querySelector('[data-group-template]');
    const holder = document.createElement('div');
    holder.innerHTML = template.innerHTML.replaceAll('__G__', `new${Date.now()}`);
    const group = holder.firstElementChild;
    document.querySelector('[data-groups]').append(group);
    group.querySelector('input').focus();
  }
});

// Notice: templates and live preview.
const noticeForm = document.querySelector('[data-notice-form]');
const preview = document.querySelector('[data-notice-preview]');
if (noticeForm && preview) {
  const field = (name) => noticeForm.elements.namedItem(name);
  const german = (value) => {
    if (!value) return '';
    const [y, m, d] = value.split('-');
    return `${d}.${m}.${y}`;
  };
  const nextDay = (value) => {
    if (!value) return '';
    const date = new Date(`${value}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + 1);
    return date.toISOString().slice(0, 10);
  };
  const update = () => {
    preview.dataset.tone = field('tone').value;
    preview.toggleAttribute('data-off', !field('active').checked);
    for (const key of ['label', 'title', 'text']) {
      preview.querySelector(`[data-preview="${key}"]`).textContent = field(key).value;
    }
  };
  noticeForm.addEventListener('input', update);
  noticeForm.addEventListener('change', update);
  noticeForm.querySelectorAll('[data-template]').forEach((button) => {
    button.addEventListener('click', () => {
      const from = field('from').value;
      const until = field('until').value;
      const fill = (text) =>
        text
          .replaceAll('{von}', german(from) || '…')
          .replaceAll('{bis}', german(until) || '…')
          .replaceAll('{ab}', german(nextDay(until || from)) || '…');
      field('tone').value = button.dataset.tone;
      field('label').value = button.dataset.label;
      field('title').value = fill(button.dataset.title);
      field('text').value = fill(button.dataset.text);
      field('active').checked = true;
      update();
    });
  });
  update();
}

// Pinnwand preview: masonry like on the website, drag (or arrows) to reorder.
const board = document.querySelector('[data-board] .board');
if (board) {
  const grid = board.querySelector('[data-board-grid]');
  const form = board.closest('form');
  const status = form.querySelector('[data-board-status]');
  const items = () => [...grid.querySelectorAll('[data-board-item]')];
  let dirty = false;

  // Every item spans as many 4px rows as it is tall, so posters fill the
  // shortest column (the same rule as the board on the website).
  let frame = 0;
  const pack = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      board.classList.add('is-packed');
      for (const item of grid.children) {
        const { marginBottom } = getComputedStyle(item);
        item.style.gridRowEnd = `span ${Math.ceil((item.offsetHeight + (parseFloat(marginBottom) || 0)) / 4)}`;
      }
    });
  };
  const observer = new ResizeObserver(pack);
  for (const item of grid.children) observer.observe(item);
  pack();

  const changed = () => {
    items().forEach((item, i, all) => {
      item.querySelector('.board__num').textContent = String(i + 2);
      item.querySelector('[data-board-move="-1"]').disabled = i === 0;
      item.querySelector('[data-board-move="1"]').disabled = i === all.length - 1;
    });
    dirty = true;
    status.textContent = 'Noch nicht gespeichert.';
    pack();
  };
  window.addEventListener('beforeunload', (event) => {
    if (dirty) event.preventDefault();
  });
  form.addEventListener('submit', () => { dirty = false; });

  // Computer / Handy view.
  document.querySelectorAll('[data-board-view]').forEach((button, _, all) => {
    button.addEventListener('click', () => {
      board.dataset.view = button.dataset.boardView;
      for (const other of all) other.setAttribute('aria-pressed', String(other === button));
      pack();
    });
  });

  // Arrows: move in place (without JavaScript they submit and move on the server).
  grid.addEventListener('click', (event) => {
    const button = event.target.closest('[data-board-move]');
    if (!button) return;
    event.preventDefault();
    const item = button.closest('[data-board-item]');
    const list = items();
    const target = list[list.indexOf(item) + Number(button.dataset.boardMove)];
    if (!target) return;
    if (button.dataset.boardMove === '-1') target.before(item);
    else target.after(item);
    item.classList.add('is-moved');
    changed();
    (button.disabled ? item.querySelector('[data-board-move]:not(:disabled)') : button)?.focus();
  });

  // Drag: the whole poster with a mouse, the grip with a finger or pen.
  let drag = null;
  grid.addEventListener('pointerdown', (event) => {
    const item = event.target.closest('[data-board-item]');
    if (!item || event.button !== 0 || event.target.closest('button')) return;
    if (event.pointerType !== 'mouse' && !event.target.closest('[data-board-grip]')) return;
    event.preventDefault();
    const rect = item.getBoundingClientRect();
    drag = { item, id: event.pointerId, x: event.clientX, y: event.clientY, dx: event.clientX - rect.left, dy: event.clientY - rect.top, moved: false };
    item.setPointerCapture(event.pointerId);
  });
  grid.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const { item } = drag;
    if (!drag.moved) {
      if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 6) return;
      drag.moved = true;
      item.classList.add('is-dragging');
    }
    // Swap places with the poster under the pointer.
    item.style.visibility = 'hidden';
    const below = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-board-item]');
    item.style.visibility = '';
    // Once swapped, a poster has to be left before it can swap back (no flicker).
    if (below !== drag.last) drag.last = null;
    if (below && below !== item && !drag.last) {
      drag.last = below;
      const list = items();
      if (list.indexOf(below) < list.indexOf(item)) below.before(item);
      else below.after(item);
      changed();
    }
    // Keep the poster under the pointer, wherever the masonry put its slot.
    item.style.translate = '';
    const base = item.getBoundingClientRect();
    item.style.translate = `${event.clientX - drag.dx - base.left}px ${event.clientY - drag.dy - base.top}px`;
  });
  const drop = (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    drag.item.classList.remove('is-dragging');
    drag.item.style.translate = '';
    if (drag.moved) drag.item.classList.add('is-moved');
    drag = null;
  };
  grid.addEventListener('pointerup', drop);
  grid.addEventListener('pointercancel', drop);
}
