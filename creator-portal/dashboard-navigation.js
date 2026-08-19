document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-portal-action-type="opportunity"]');
  if (!target) return;
  const id = target.getAttribute('data-portal-action');
  if (!id) return;
  const url = new URL('./opportunities/', window.location.href);
  url.searchParams.set('id', id);
  window.location.href = url.toString();
});
