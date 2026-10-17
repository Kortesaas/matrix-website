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

// Opening hours: add and remove rows.
const rows = document.querySelector('[data-rows]');
if (rows) {
  document.querySelector('[data-add-row]')?.addEventListener('click', () => {
    const all = rows.querySelectorAll('[data-row]');
    const row = all[all.length - 1].cloneNode(true);
    row.querySelectorAll('input').forEach((input) => (input.value = ''));
    rows.append(row);
    row.querySelector('input').focus();
  });
  rows.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-row]');
    if (!button) return;
    const row = button.closest('[data-row]');
    if (rows.querySelectorAll('[data-row]').length > 1) row.remove();
    else row.querySelectorAll('input').forEach((input) => (input.value = ''));
  });
}

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
