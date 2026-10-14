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

  // Se já estiver em modo standalone (já instalado e aberto pela tela de início), não exibe banners
  if (isStandalone) {
    return;
  }

  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallPrompt(false);
  });

  // Modal e Banner de Instalação PWA
  function createModal() {
    if (document.getElementById('pwa-install-modal')) return;

    const modalHTML = `
      <div id="pwa-install-modal" class="pwa-modal-overlay" hidden aria-hidden="true" role="dialog" aria-labelledby="pwa-modal-title">
        <div class="pwa-modal-card">
          <button type="button" class="pwa-modal-close" id="pwa-modal-close-btn" aria-label="Fechar">&times;</button>
          
          <div class="pwa-modal-header">
            <img src="assets/favicon.png" alt="Vôlei Hub" class="pwa-modal-icon" />
            <div>
              <h3 id="pwa-modal-title">Adicionar à Tela de Início</h3>
              <p class="pwa-modal-sub">Instale o Vôlei Hub no seu iPhone para usar em tela cheia como um aplicativo nativo!</p>
            </div>
          </div>

          <div class="pwa-steps-list">
            <div class="pwa-step-item">
              <div class="pwa-step-number">1</div>
              <div class="pwa-step-content">
                <strong>Toque em Compartilhar</strong>
                <p>Na barra inferior do Safari no iPhone, toque no ícone de <b>Compartilhar</b>.</p>
              </div>
              <div class="pwa-step-icon" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                  <polyline points="16 6 12 2 8 6"/>
                  <line x1="12" y1="2" x2="12" y2="15"/>
                </svg>
              </div>
            </div>

            <div class="pwa-step-item">
              <div class="pwa-step-number">2</div>
              <div class="pwa-step-content">
                <strong>Adicionar à Tela de Início</strong>
                <p>Role as opções para cima e toque em <b>Adicionar à Tela de Início</b>.</p>
              </div>
              <div class="pwa-step-icon" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <line x1="12" y1="8" x2="12" y2="16"/>
                  <line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
              </div>
            </div>

            <div class="pwa-step-item">
              <div class="pwa-step-number">3</div>
              <div class="pwa-step-content">
                <strong>Confirmar</strong>
                <p>Toque em <b>Adicionar</b> no canto superior direito do seu iPhone.</p>
              </div>
              <div class="pwa-step-icon" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
            </div>
          </div>

          <div class="pwa-modal-actions">
            <button type="button" class="pwa-btn-primary" id="pwa-modal-ok-btn">Entendi</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('pwa-install-modal');
    const closeBtn = document.getElementById('pwa-modal-close-btn');
    const okBtn = document.getElementById('pwa-modal-ok-btn');

    function closeModal() {
      modal.hidden = true;
      modal.setAttribute('aria-hidden', 'true');
    }

    closeBtn?.addEventListener('click', closeModal);
    okBtn?.addEventListener('click', closeModal);
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  function openPwaInstallModal() {
    createModal();
    const modal = document.getElementById('pwa-install-modal');
    if (modal) {
      modal.hidden = false;
      modal.setAttribute('aria-hidden', 'false');
    }
  }

  // Expor função globalmente para qualquer botão no site poder chamar
  window.openPwaInstallGuide = openPwaInstallModal;

  function showInstallPrompt(force) {
    if (isStandalone) return;
    
    // Se o usuário dispensou recentemente nas últimas 24h e não foi forçado, não mostra banner
    const dismissedTime = localStorage.getItem('volei_hub_pwa_dismissed');
    if (!force && dismissedTime && Date.now() - Number(dismissedTime) < 24 * 60 * 60 * 1000) {
      return;
    }

    if (document.getElementById('pwa-install-banner')) return;

    const bannerHTML = `
      <aside id="pwa-install-banner" class="pwa-banner" aria-label="Instalar aplicativo">
        <div class="pwa-banner-content">
          <img src="assets/favicon.png" alt="Vôlei Hub" class="pwa-banner-logo" />
          <div class="pwa-banner-text">
            <strong>Instale o Vôlei Hub</strong>
            <span>${isIOS ? 'Adicione à tela inicial do iPhone para tela cheia' : 'Acesse com um toque na sua tela inicial'}</span>
          </div>
        </div>
        <div class="pwa-banner-actions">
          <button type="button" id="pwa-install-action-btn" class="pwa-banner-btn">
            ${isIOS ? 'Como adicionar' : 'Instalar'}
          </button>
          <button type="button" id="pwa-dismiss-btn" class="pwa-banner-close" aria-label="Fechar aviso">&times;</button>
        </div>
      </aside>
    `;

    document.body.insertAdjacentHTML('beforeend', bannerHTML);

    const banner = document.getElementById('pwa-install-banner');
    const actionBtn = document.getElementById('pwa-install-action-btn');
    const dismissBtn = document.getElementById('pwa-dismiss-btn');

    actionBtn?.addEventListener('click', () => {
      if (isIOS) {
        openPwaInstallModal();
      } else if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            banner?.remove();
          }
          deferredPrompt = null;
        });
      } else {
        openPwaInstallModal();
      }
    });

    dismissBtn?.addEventListener('click', () => {
      localStorage.setItem('volei_hub_pwa_dismissed', String(Date.now()));
      banner?.classList.add('is-hiding');
      setTimeout(() => banner?.remove(), 300);
    });
  }

  // Inicializar verificação após carregar o DOM
  function init() {
    createModal();
    // Se for iOS ou se tiver deferredPrompt, exibe aviso após 1.5s suavemente
    if (isIOS && !isStandalone) {
      setTimeout(() => showInstallPrompt(false), 1500);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
