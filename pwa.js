// pwa.js - Suporte a PWA (Progressive Web App) & Instalação no iPhone / iOS e Android
(function () {
  'use strict';

  // 1. Registro do Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => {
          // Atualização automática do SW se houver versão nova
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[PWA] Nova versão disponível.');
                }
              });
            }
          });
        })
        .catch((err) => {
          console.warn('[PWA] Erro ao registrar Service Worker:', err);
        });
    });
  }

  // 2. Detecção de ambiente
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = window.navigator.standalone === true || 
    window.matchMedia('(display-mode: standalone)').matches;

  if (isStandalone) {
    document.documentElement.classList.add('pwa-standalone');
    document.body?.classList.add('pwa-standalone');
  }

  // Tratamento de links internos no iOS Standalone para não sair da tela cheia
  if (isStandalone && isIOS) {
    document.addEventListener('click', (e) => {
      const anchor = e.target.closest('a');
      if (anchor && anchor.href && anchor.target !== '_blank' && !anchor.hasAttribute('download')) {
        const url = new URL(anchor.href, window.location.href);
        if (url.origin === window.location.origin && !url.hash.startsWith('#')) {
          e.preventDefault();
          window.location.assign(url.href);
        }
      }
    });
  }

  // Compatibilidade caso algum script ainda referencie a função
  window.openPwaInstallGuide = function () {};
})();

