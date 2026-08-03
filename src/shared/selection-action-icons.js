(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.LumnoSelectionActionIcons = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  const icon = (body) => Object.freeze({
    viewBox: '0 0 24 24',
    body
  });

  return Object.freeze({
    remix: Object.freeze({
      ask: icon('<path fill="currentColor" d="m17 1.208l1.32 2.473L20.792 5L18.32 6.319L17 8.792l-1.318-2.473l-2.473-1.32l2.473-1.318zm-6.333 8.125l5 2.667l-5 2.667l-2.666 5l-2.667-5l-5-2.667l5-2.667l2.667-2.667zm.75 2.667L9.19 10.812L8.001 8.583l-1.189 2.229L4.584 12l2.228 1.188l1.189 2.229l1.188-2.229zm8.25 4.333l-1.666-3.125l-1.667 3.125L13.209 18l3.125 1.667l1.667 3.125l1.666-3.125L22.792 18z"/>'),
      translate: icon('<path fill="currentColor" d="m18.5 10l4.4 11h-2.155l-1.201-3h-4.09l-1.199 3h-2.154L16.5 10zM10 2v2h6v2h-1.968a18.2 18.2 0 0 1-3.62 6.301a15 15 0 0 0 2.335 1.707l-.75 1.878A17 17 0 0 1 9 13.725a16.7 16.7 0 0 1-6.201 3.548l-.536-1.929a14.7 14.7 0 0 0 5.327-3.042A18 18 0 0 1 4.767 8h2.24A16 16 0 0 0 9 10.877a16.2 16.2 0 0 0 2.91-4.876L2 6V4h6V2zm7.5 10.885L16.253 16h2.492z"/>'),
      explain: icon('<path fill="currentColor" d="M9.973 18H11v-5h2v5h1.027c.132-1.202.745-2.193 1.74-3.277c.113-.122.832-.867.917-.973a6 6 0 1 0-9.37-.002c.086.107.807.853.918.974c.996 1.084 1.609 2.076 1.741 3.278M10 20v1h4v-1zm-4.246-5a8 8 0 1 1 12.49.002C17.624 15.774 16 17 16 18.5V21a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.5C8 17 6.375 15.774 5.754 15"/>'),
      summarize: icon('<path fill="currentColor" d="M19 22H5a3 3 0 0 1-3-3V3a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v12h4v4a3 3 0 0 1-3 3m-1-5v2a1 1 0 1 0 2 0v-2zm-2 3V4H4v15a1 1 0 0 1 1 1zM6 7h8v2H6zm0 4h8v2H6zm0 4h5v2H6z"/>'),
      search: icon('<path fill="currentColor" d="m18.031 16.617l4.283 4.282l-1.415 1.415l-4.282-4.283A8.96 8.96 0 0 1 11 20c-4.968 0-9-4.032-9-9s4.032-9 9-9s9 4.032 9 9a8.96 8.96 0 0 1-1.969 5.617m-2.006-.742A6.98 6.98 0 0 0 18 11c0-3.867-3.133-7-7-7s-7 3.133-7 7s3.133 7 7 7a6.98 6.98 0 0 0 4.875-1.975z"/>'),
      calculate: icon('<path fill="currentColor" d="M4 2h16a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1m1 2v16h14V4zm2 2h10v4H7zm0 6h2v2H7zm0 4h2v2H7zm4-4h2v2h-2zm0 4h2v2h-2zm4-4h2v6h-2z"/>')
    }),
    hugeicons: Object.freeze({
      ask: icon('<path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.5" d="m15 2l.539 2.392a5.39 5.39 0 0 0 4.07 4.07L22 9l-2.392.539a5.39 5.39 0 0 0-4.07 4.07L15 16l-.539-2.392a5.39 5.39 0 0 0-4.07-4.07L8 9l2.392-.539a5.39 5.39 0 0 0-4.07-4.07zM7 12l.385 1.708a3.85 3.85 0 0 0 2.907 2.907L12 17l-1.708.385a3.85 3.85 0 0 0-2.907 2.907L7 22l-.385-1.708a3.85 3.85 0 0 0-2.907-2.907L2 17l1.708-.385a3.85 3.85 0 0 0-2.907-2.907z"/>'),
      translate: icon('<g fill="none" stroke="currentColor" stroke-width="1.5"><path fill="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M5 5.828h2.7m3.3 0H9.5m-1.8 0h1.8m-1.8 0V5m1.8.828c-.316 1.131-.98 2.201-1.736 3.141M5.836 11a19 19 0 0 1 1.928-2.03m0 0c-.385-.453-.925-1.184-1.08-1.515m1.08 1.514l1.157 1.203M13.5 19l.833-2m4.167 2l-.833-2m-3.334 0L16 13l1.667 4m-3.334 0h3.334"/><path fill="currentColor" stroke-linecap="round" d="M14 10V8c0-2.828 0-4.243-.879-5.121C12.243 2 10.828 2 8 2s-4.243 0-5.121.879C2 3.757 2 5.172 2 8s0 4.243.879 5.121C3.757 14 5.172 14 8 14h2"/><path fill="currentColor" d="M10 16c0-2.828 0-4.243.879-5.121C11.757 10 13.172 10 16 10s4.243 0 5.121.879C22 11.757 22 13.172 22 16s0 4.243-.879 5.121C20.243 22 18.828 22 16 22s-4.243 0-5.121-.879C10 20.243 10 20.243 10 16Z"/><path fill="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M4 16.5c0 1.404 0 2.107.337 2.611a2 2 0 0 0 .552.552C5.393 20 6.096 20 7.5 20M20 7.5c0-1.404 0-2.107-.337-2.611a2 2 0 0 0-.552-.552C18.607 4 17.904 4 16.5 4"/></g>'),
      explain: icon('<g fill="none" stroke="currentColor" stroke-width="1.5"><path fill="currentColor" stroke-linecap="round" d="M5.143 14A7.8 7.8 0 0 1 4 9.919C4 5.545 7.582 2 12 2s8 3.545 8 7.919A7.8 7.8 0 0 1 18.857 14"/><path fill="currentColor" stroke-linecap="round" d="M14 10c-.613.643-1.289 1-2 1s-1.387-.357-2-1"/><path fill="currentColor" d="M7.383 17.098c-.092-.276-.138-.415-.133-.527a.6.6 0 0 1 .382-.53c.104-.041.25-.041.54-.041h7.656c.291 0 .436 0 .54.04a.6.6 0 0 1 .382.531c.005.112-.041.25-.133.527c-.17.511-.255.767-.386.974a2 2 0 0 1-1.2.869c-.238.059-.506.059-1.043.059h-3.976c-.537 0-.806 0-1.043-.06a2 2 0 0 1-1.2-.868c-.131-.207-.216-.463-.386-.974ZM15 19l-.13.647c-.14.707-.211 1.06-.37 1.34a2 2 0 0 1-1.113.912C13.082 22 12.72 22 12 22s-1.082 0-1.387-.1a2 2 0 0 1-1.113-.913c-.159-.28-.23-.633-.37-1.34L9 19"/><path fill="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M12 15.5V11"/></g>'),
      summarize: icon('<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16.5 2v3m-9-3v3M12 2v3m1-1.5h-2c-3.3 0-4.95 0-5.975 1.025S4 7.2 4 10.5V15c0 3.3 0 4.95 1.025 5.975S7.7 22 11 22h2c3.3 0 4.95 0 5.975-1.025S20 18.3 20 15v-4.5c0-3.3 0-4.95-1.025-5.975S16.3 3.5 13 3.5M8 15h4m-4-4h8"/>'),
      search: icon('<g fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.5"><path fill="currentColor" stroke-linecap="round" d="M17.5 17.5L22 22"/><path fill="currentColor" d="M20 11a9 9 0 1 0-18 0a9 9 0 0 0 18 0Z"/><path fill="currentColor" stroke-linecap="round" d="m6.5 14l1.842-5.526a.694.694 0 0 1 1.316 0L11.5 14m3-6v6m-7 2h3"/></g>'),
      calculate: icon('<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5.5 3v5M8 5.5H3M8 16l-2 2m0 0l-2 2m2-2l2 2m-2-2l-2-2M20 6h-4m4 12.5h-4m4-3h-4m4-3.5H2m10 10V2"/>')
    })
  });
});
