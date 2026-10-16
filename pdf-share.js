(function () {
  function getOrCreatePdfModal() {
    let modal = document.querySelector("#pdf-share-modal");
    if (modal) return modal;

    modal = document.createElement("dialog");
    modal.id = "pdf-share-modal";
    modal.className = "pdf-share-dialog";
    modal.innerHTML = `
      <div class="pdf-share-content">
        <header class="pdf-share-header">
          <div>
            <p class="eyebrow">COMPARTILHAMENTO</p>
            <h2>Opções de Envio</h2>
          </div>
          <button id="pdf-share-close" class="dialog-close" type="button" aria-label="Fechar">×</button>
        </header>

        <div class="pdf-share-file-info" id="pdf-share-file-info">
          <span class="pdf-file-icon" id="pdf-share-file-icon" aria-hidden="true">📄</span>
          <div class="pdf-file-details">
            <strong id="pdf-share-filename">documento.pdf</strong>
            <small id="pdf-share-filesize">Documento PDF pronto para envio</small>
          </div>
        </div>

        <div class="pdf-share-options">
          <button id="pdf-opt-copy-text" class="pdf-share-opt opt-copy-text" type="button">
            <span class="pdf-opt-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </span>
            <div class="pdf-opt-text">
              <strong>Enviar Texto</strong>
              <small id="pdf-text-subtext">Copia o resumo formatado para a área de transferência.</small>
            </div>
          </button>

          <button id="pdf-opt-device" class="pdf-share-opt opt-device" type="button">
            <span class="pdf-opt-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="18" cy="5" r="3"></circle>
                <circle cx="6" cy="12" r="3"></circle>
                <circle cx="18" cy="19" r="3"></circle>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
              </svg>
            </span>
            <div class="pdf-opt-text">
              <strong id="pdf-opt-device-title">Compartilhar PDF</strong>
              <small id="pdf-opt-device-sub">Usa o compartilhamento nativo do seu celular/sistema.</small>
            </div>
          </button>

          <button id="pdf-opt-download" class="pdf-share-opt opt-download" type="button">
            <span class="pdf-opt-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </span>
            <div class="pdf-opt-text">
              <strong id="pdf-opt-download-title">Baixar PDF</strong>
              <small id="pdf-opt-download-sub">Baixa o arquivo no seu dispositivo.</small>
            </div>
          </button>
        </div>

        <div class="pdf-share-format-selector" id="pdf-share-format-selector">
          <span class="pdf-format-label">Modelo de Envio / Impressão</span>
          <div class="pdf-format-options" role="radiogroup" aria-label="Modelo de Envio">
            <button type="button" class="pdf-fmt-btn is-active" id="pdf-fmt-a4" data-format="a4" role="radio" aria-checked="true">
              <span class="pdf-fmt-icon" aria-hidden="true">📄</span>
              <div class="pdf-fmt-text">
                <strong>Padrão A4</strong>
                <small>Folha PDF</small>
              </div>
            </button>
            <button type="button" class="pdf-fmt-btn" id="pdf-fmt-cupom" data-format="cupom" role="radio" aria-checked="false">
              <span class="pdf-fmt-icon" aria-hidden="true">🧾</span>
              <div class="pdf-fmt-text">
                <strong>Cupom PDF</strong>
                <small>Bobina 58mm</small>
              </div>
            </button>
            <button type="button" class="pdf-fmt-btn is-full-width" id="pdf-fmt-cupom-img" data-format="cupom-img" role="radio" aria-checked="false">
              <span class="pdf-fmt-icon" aria-hidden="true">🖼️</span>
              <div class="pdf-fmt-text">
                <strong>Foto Cupom (PNG)</strong>
              </div>
            </button>
          </div>
        </div>

        <p id="pdf-share-feedback" class="pdf-share-feedback" hidden></p>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector("#pdf-share-close").addEventListener("click", closePdfModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closePdfModal();
    });
    modal.addEventListener("close", unlockBackground);
    modal.addEventListener("cancel", unlockBackground);

    return modal;
  }

  let savedScrollY = 0;
  let isBackgroundLocked = false;

  function onTouchMovePrevent(e) {
    const modal = document.querySelector("#pdf-share-modal");
    if (!modal || !modal.open) return;

    // Se o toque for no próprio dialog backdrop ou fora dos elementos internos do modal:
    if (e.target === modal || !modal.contains(e.target)) {
      e.preventDefault();
      return;
    }

    // Se o conteúdo do modal cabe na tela sem precisar de rolagem interna,
    // bloqueia o touchmove para evitar que o navegador passe o gesto para o fundo (scroll chaining)
    if (modal.scrollHeight <= modal.clientHeight + 2) {
      e.preventDefault();
      return;
    }

    // Se o modal tiver rolagem interna (ex: tela em orientação horizontal/muito baixa):
    // Previne que ultrapasse o topo ou o final e arraste o fundo
    const atTop = modal.scrollTop <= 0;
    const atBottom = modal.scrollTop + modal.clientHeight >= modal.scrollHeight - 1;
    if ((atTop && e.movementY > 0) || (atBottom && e.movementY < 0)) {
      e.preventDefault();
    }
  }

  function onWheelPrevent(e) {
    const modal = document.querySelector("#pdf-share-modal");
    if (!modal || !modal.open) return;
    if (e.target === modal || !modal.contains(e.target)) {
      e.preventDefault();
    }
  }

  function lockBackground() {
    if (isBackgroundLocked) return;
    isBackgroundLocked = true;

    savedScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;

    document.documentElement.classList.add("pdf-modal-active");
    document.body.classList.add("pdf-modal-active");

    // Trava física contra o bug de rolagem no iOS Safari e Android Chrome:
    document.body.style.position = "fixed";
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.body.style.height = "100%";
    document.body.style.overflow = "hidden";

    window.addEventListener("touchmove", onTouchMovePrevent, { passive: false });
    window.addEventListener("wheel", onWheelPrevent, { passive: false });
  }

  function unlockBackground() {
    if (!isBackgroundLocked) return;
    isBackgroundLocked = false;

    document.documentElement.classList.remove("pdf-modal-active");
    document.body.classList.remove("pdf-modal-active");

    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    document.body.style.height = "";
    document.body.style.overflow = "";

    window.scrollTo(0, savedScrollY);

    window.removeEventListener("touchmove", onTouchMovePrevent);
    window.removeEventListener("wheel", onWheelPrevent);
  }

  function closePdfModal() {
    const modal = document.querySelector("#pdf-share-modal");
    if (modal) {
      if (typeof modal.close === "function") {
        try { modal.close(); } catch (_) { modal.removeAttribute("open"); }
      } else {
        modal.removeAttribute("open");
      }
    }
    unlockBackground();
  }

  function downloadPdfFile(file, optionalDataUrl) {
    if (!file && !optionalDataUrl) return;
    const fileName = file?.name || "VoleiHub-Documento.png";
    const rawDataUrl = optionalDataUrl || file?._dataUrl;

    try {
      let downloadUrl = null;
      let shouldRevoke = false;

      if (file && (file instanceof Blob || file instanceof File)) {
        downloadUrl = URL.createObjectURL(file);
        shouldRevoke = true;
      } else if (rawDataUrl) {
        // Se temos dataUrl mas não blob, convertemos para blob para download nativo perfeito
        try {
          const parts = rawDataUrl.split(",");
          const mimeMatch = parts[0].match(/:(.*?);/);
          const mime = mimeMatch ? mimeMatch[1] : "image/png";
          const bstr = atob(parts[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          const blob = new Blob([u8arr], { type: mime });
          downloadUrl = URL.createObjectURL(blob);
          shouldRevoke = true;
        } catch (_) {
          downloadUrl = rawDataUrl;
        }
      }

      if (!downloadUrl) return;

      const link = document.createElement("a");
      link.style.display = "none";
      link.setAttribute("download", fileName);
      link.href = downloadUrl;
      // IMPORTANTE: NÃO colocar target="_blank" pois o Chrome bloqueia navegações para data/blob URL e não baixa o arquivo
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        link.remove();
        if (shouldRevoke && downloadUrl) {
          try { URL.revokeObjectURL(downloadUrl); } catch (_) {}
        }
      }, 4000);
    } catch (err) {
      console.warn("Falha no download via link:", err);
    }
  }

  async function copyTextToClipboard(content) {
    if (!content) return false;

    // 1. Tenta API moderna do Clipboard (funciona em HTTPS e localhost)
    if (navigator?.clipboard && typeof navigator.clipboard.writeText === "function") {
      try {
        await navigator.clipboard.writeText(content);
        return true;
      } catch (_) {}
    }

    // 2. Fallback universal para HTTP / Mobile / Safari / Android:
    // O textarea DEVE ser inserido dentro do modal (para não ser bloqueado pelo inert do dialog nem por user-select:none)
    try {
      const modal = document.querySelector("#pdf-share-modal") || document.body;
      const area = document.createElement("textarea");
      area.value = content;
      area.setAttribute("readonly", "");
      area.style.position = "absolute";
      area.style.left = "-9999px";
      area.style.top = "0";
      area.style.width = "100px";
      area.style.height = "40px";
      area.style.opacity = "0.01";
      area.style.userSelect = "text";
      area.style.webkitUserSelect = "text";
      area.style.fontSize = "16px";

      modal.appendChild(area);

      // Foco e seleção compatível com iOS Safari
      area.focus({ preventScroll: true });
      area.select();
      area.setSelectionRange(0, content.length);

      const success = document.execCommand("copy");
      area.remove();

      if (success) return true;
    } catch (_) {}

    return false;
  }

  window.openPdfShareModal = function (options) {
    const { file, title = "Vôlei Hub - PDF", text = "", whatsappText = "", pdfOptions = null } = options || {};
    const modal = getOrCreatePdfModal();
    const filenameEl = modal.querySelector("#pdf-share-filename");
    const filesizeEl = modal.querySelector("#pdf-share-filesize");
    const fileIconEl = modal.querySelector("#pdf-share-file-icon");
    const copyTextBtn = modal.querySelector("#pdf-opt-copy-text");
    const downloadBtn = modal.querySelector("#pdf-opt-download");
    const deviceBtn = modal.querySelector("#pdf-opt-device");
    const feedbackEl = modal.querySelector("#pdf-share-feedback");
    const textSubtext = modal.querySelector("#pdf-text-subtext");
    const formatSelectorEl = modal.querySelector("#pdf-share-format-selector");
    const fmtA4Btn = modal.querySelector("#pdf-fmt-a4");
    const fmtCupomBtn = modal.querySelector("#pdf-fmt-cupom");
    const fmtCupomImgBtn = modal.querySelector("#pdf-fmt-cupom-img");
    const deviceTitleEl = modal.querySelector("#pdf-opt-device-title");
    const deviceSubEl = modal.querySelector("#pdf-opt-device-sub");
    const downloadTitleEl = modal.querySelector("#pdf-opt-download-title");
    const downloadSubEl = modal.querySelector("#pdf-opt-download-sub");

    feedbackEl.hidden = true;
    feedbackEl.textContent = "";

    const rawPdfOptions = pdfOptions || file?._pdfOptions || null;
    let activeFormat = "a4"; // Opções: "a4", "cupom", "cupom-img"
    let a4File = (file && (file instanceof Blob || file instanceof File)) ? file : null;
    let cupomFile = null;
    let cupomImgFile = null;
    let currentFile = a4File;

    // Pré-gerar a Foto do Cupom (PNG) imediatamente em segundo plano
    // para que ao clicar a imagem já esteja 100% pronta e o download seja instantâneo
    let cupomImgPromise = null;
    if (rawPdfOptions && typeof window.buildVolleyCupomImage === "function") {
      cupomImgPromise = window.buildVolleyCupomImage(rawPdfOptions).then((res) => {
        if (res?.file) {
          cupomImgFile = res.file;
          if (res.dataUrl) cupomImgFile._dataUrl = res.dataUrl;
        }
        return cupomImgFile;
      }).catch((err) => {
        console.warn("Pré-geração da foto do cupom:", err);
        return null;
      });
    }

    function updateFileInfoDisplay(targetFile, formatType) {
      if (targetFile && (targetFile instanceof Blob || targetFile instanceof File)) {
        filenameEl.textContent = targetFile.name || (formatType === "cupom-img" ? "cupom.png" : "documento.pdf");
        const sizeKb = Math.round((targetFile.size || 0) / 1024);
        if (formatType === "cupom-img") {
          if (fileIconEl) fileIconEl.textContent = "🖼️";
          filesizeEl.textContent = sizeKb > 0 ? `${sizeKb} KB · Imagem PNG` : "Imagem PNG";
          if (deviceTitleEl) deviceTitleEl.textContent = "Compartilhar Foto";
          if (deviceSubEl) deviceSubEl.textContent = "Envia a foto para o WhatsApp ou app da impressora.";
          if (downloadTitleEl) downloadTitleEl.textContent = "Baixar Foto (PNG)";
          if (downloadSubEl) downloadSubEl.textContent = "Salva a foto do cupom no seu dispositivo.";
        } else if (formatType === "cupom") {
          if (fileIconEl) fileIconEl.textContent = "🧾";
          filesizeEl.textContent = sizeKb > 0 ? `${sizeKb} KB · Cupom 58mm pronto para envio` : "Cupom 58mm pronto para envio";
          if (deviceTitleEl) deviceTitleEl.textContent = "Compartilhar PDF";
          if (deviceSubEl) deviceSubEl.textContent = "Usa o compartilhamento nativo do seu celular/sistema.";
          if (downloadTitleEl) downloadTitleEl.textContent = "Baixar PDF";
          if (downloadSubEl) downloadSubEl.textContent = "Baixa o pdf no seu dispositivo.";
        } else {
          if (fileIconEl) fileIconEl.textContent = "📄";
          filesizeEl.textContent = sizeKb > 0 ? `${sizeKb} KB · Documento PDF pronto para envio` : "Documento PDF pronto para envio";
          if (deviceTitleEl) deviceTitleEl.textContent = "Compartilhar PDF";
          if (deviceSubEl) deviceSubEl.textContent = "Usa o compartilhamento nativo do seu celular/sistema.";
          if (downloadTitleEl) downloadTitleEl.textContent = "Baixar PDF";
          if (downloadSubEl) downloadSubEl.textContent = "Baixa o pdf no seu dispositivo.";
        }
        downloadBtn.hidden = false;
        textSubtext.textContent = "Copia o texto do resumo para a área de transferência.";
      } else {
        if (fileIconEl) fileIconEl.textContent = "📄";
        filenameEl.textContent = title || "Resumo do Vôlei Hub";
        filesizeEl.textContent = "Resumo completo formatado para compartilhamento";
        downloadBtn.hidden = true;
        textSubtext.textContent = "Copia os resultados e classificação para a área de transferência.";
      }
    }

    // Configuração do Seletor de Modelo (A4, Cupom PDF, Foto Cupom PNG)
    if (formatSelectorEl) {
      const canToggleFormat = Boolean(rawPdfOptions || a4File);
      formatSelectorEl.hidden = !canToggleFormat;

      // Reseta visual para A4 como padrão sempre ao abrir
      fmtA4Btn?.classList.add("is-active");
      fmtA4Btn?.setAttribute("aria-checked", "true");
      fmtCupomBtn?.classList.remove("is-active");
      fmtCupomBtn?.setAttribute("aria-checked", "false");
      fmtCupomImgBtn?.classList.remove("is-active");
      fmtCupomImgBtn?.setAttribute("aria-checked", "false");

      if (fmtA4Btn) {
        fmtA4Btn.onclick = () => {
          if (activeFormat === "a4") return;
          activeFormat = "a4";
          fmtA4Btn.classList.add("is-active");
          fmtA4Btn.setAttribute("aria-checked", "true");
          fmtCupomBtn?.classList.remove("is-active");
          fmtCupomBtn?.setAttribute("aria-checked", "false");
          fmtCupomImgBtn?.classList.remove("is-active");
          fmtCupomImgBtn?.setAttribute("aria-checked", "false");

          if (!a4File && rawPdfOptions && typeof window.buildVolleyPdf === "function") {
            const res = window.buildVolleyPdf({ ...rawPdfOptions, format: "a4" });
            a4File = res?.file;
          }

          if (a4File) {
            currentFile = a4File;
            updateFileInfoDisplay(currentFile, "a4");
          }
        };
      }

      if (fmtCupomBtn) {
        fmtCupomBtn.onclick = () => {
          if (activeFormat === "cupom") return;
          activeFormat = "cupom";
          fmtCupomBtn.classList.add("is-active");
          fmtCupomBtn.setAttribute("aria-checked", "true");
          fmtA4Btn?.classList.remove("is-active");
          fmtA4Btn?.setAttribute("aria-checked", "false");
          fmtCupomImgBtn?.classList.remove("is-active");
          fmtCupomImgBtn?.setAttribute("aria-checked", "false");

          if (!cupomFile && rawPdfOptions && typeof window.buildVolleyPdf === "function") {
            const res = window.buildVolleyPdf({ ...rawPdfOptions, format: "cupom" });
            cupomFile = res?.file;
          }

          if (cupomFile) {
            currentFile = cupomFile;
            updateFileInfoDisplay(currentFile, "cupom");
          }
        };
      }

      if (fmtCupomImgBtn) {
        fmtCupomImgBtn.onclick = async () => {
          activeFormat = "cupom-img";
          fmtCupomImgBtn.classList.add("is-active");
          fmtCupomImgBtn.setAttribute("aria-checked", "true");
          fmtA4Btn?.classList.remove("is-active");
          fmtA4Btn?.setAttribute("aria-checked", "false");
          fmtCupomBtn?.classList.remove("is-active");
          fmtCupomBtn?.setAttribute("aria-checked", "false");

          if (!cupomImgFile) {
            if (filesizeEl) filesizeEl.textContent = "Gerando foto do cupom...";
            if (cupomImgPromise) {
              await cupomImgPromise;
            } else if (rawPdfOptions && typeof window.buildVolleyCupomImage === "function") {
              const res = await window.buildVolleyCupomImage(rawPdfOptions);
              cupomImgFile = res?.file;
              if (res?.dataUrl && cupomImgFile) cupomImgFile._dataUrl = res.dataUrl;
            }
          }

          if (cupomImgFile) {
            currentFile = cupomImgFile;
            updateFileInfoDisplay(currentFile, "cupom-img");
            downloadPdfFile(currentFile, currentFile._dataUrl);
            feedbackEl.textContent = "Download da foto do cupom iniciado!";
            feedbackEl.className = "pdf-share-feedback is-success";
            feedbackEl.hidden = false;
          }
        };
      }
    }

    updateFileInfoDisplay(currentFile, "a4");

    // 1. Enviar Texto (copia o texto para a área de transferência)
    copyTextBtn.onclick = async () => {
      const message = whatsappText || text || `${title}\n\nDocumento gerado pelo Vôlei Hub.`;
      const ok = await copyTextToClipboard(message);
      if (ok) {
        feedbackEl.textContent = "Texto copiado para a área de transferência! Cole onde desejar.";
        feedbackEl.className = "pdf-share-feedback is-success";
        feedbackEl.hidden = false;
        setTimeout(() => closePdfModal(), 2000);
      } else {
        feedbackEl.innerHTML = `
          <div style="text-align:left; font-size:0.8rem; line-height:1.4;">
            <strong style="color:var(--ink);">Não foi possível copiar automaticamente no navegador.</strong>
            <p style="margin:4px 0 6px; color:var(--muted);">Selecione e copie o texto abaixo:</p>
            <textarea readonly style="width:100%; height:75px; font-size:0.75rem; border-radius:8px; border:1px solid var(--line); background:var(--card); color:var(--ink); padding:6px; box-sizing:border-box;">${message}</textarea>
          </div>
        `;
        feedbackEl.className = "pdf-share-feedback is-info";
        feedbackEl.hidden = false;
      }
    };

    // 2. Compartilhar Arquivo (compatível com PDF e Imagem PNG para impressoras térmicas)
    deviceBtn.onclick = async () => {
      feedbackEl.hidden = true;
      feedbackEl.textContent = "";

      const fileToShareNow = currentFile;
      const hasShareFile = Boolean(fileToShareNow && (fileToShareNow instanceof Blob || fileToShareNow instanceof File));

      if (hasShareFile && typeof navigator !== "undefined" && typeof navigator.share === "function") {
        try {
          let preparedFile = fileToShareNow;
          try {
            const isPng = (fileToShareNow.name || "").toLowerCase().endsWith(".png") || fileToShareNow.type === "image/png";
            const mime = isPng ? "image/png" : "application/pdf";
            const defaultName = isPng ? "VoleiHubCupom.png" : "VoleiHub.pdf";
            const cleanName = (fileToShareNow.name || defaultName).replace(/[^\w.-]/g, "_");
            preparedFile = new File([fileToShareNow], cleanName, { type: mime, lastModified: Date.now() });
          } catch (_) {
            preparedFile = fileToShareNow;
          }

          await navigator.share({
            title: title || (activeFormat === "cupom-img" ? "Vôlei Hub - Foto Cupom" : "Vôlei Hub"),
            files: [preparedFile]
          });
          closePdfModal();
          return;
        } catch (err) {
          if (err && (err.name === "AbortError" || err.code === 20)) {
            return;
          }
          console.warn("Falha no compartilhamento de arquivo:", err);

          try {
            await navigator.share({
              title: title || "Vôlei Hub",
              text: text || "Vôlei Hub"
            });
            closePdfModal();
            return;
          } catch (_) {}
        }
      }

      const isPng = currentFile && ((currentFile.name || "").toLowerCase().endsWith(".png") || currentFile.type === "image/png");
      feedbackEl.innerHTML = `
        <div style="text-align: left; line-height: 1.4;">
          <strong style="color:var(--ink);">Compartilhamento nativo indisponível</strong><br />
          <small style="color:var(--muted);">O menu do celular é bloqueado pelo navegador em conexões HTTP locais (requer HTTPS). Você pode abrir pelo WhatsApp ou baixar o arquivo:</small>
          <div style="margin-top: 8px; display: flex; gap: 8px;">
            <button id="pdf-fallback-wa" type="button" style="flex:1; padding: 8px 10px; border-radius: 8px; border: none; background: #25d366; color: #fff; cursor: pointer; font-size: 0.8rem; font-weight: 600;">Abrir WhatsApp</button>
            <button id="pdf-fallback-dl" type="button" style="flex:1; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--line); background: var(--soft-card); color: var(--ink); cursor: pointer; font-size: 0.8rem;">${isPng ? "Baixar Foto" : "Baixar PDF"}</button>
          </div>
        </div>
      `;
      feedbackEl.className = "pdf-share-feedback is-info";
      feedbackEl.hidden = false;

      const waBtn = feedbackEl.querySelector("#pdf-fallback-wa");
      if (waBtn) {
        waBtn.onclick = () => {
          const msg = whatsappText || text || `${title}\n\nDocumento gerado pelo Vôlei Hub.`;
          window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, "_blank");
        };
      }
      const dlBtn = feedbackEl.querySelector("#pdf-fallback-dl");
      if (dlBtn) {
        dlBtn.onclick = () => {
          if (currentFile) downloadPdfFile(currentFile, currentFile._dataUrl);
        };
      }
    };

    // 3. Baixar Arquivo (download direto no dispositivo)
    downloadBtn.onclick = () => {
      if (currentFile) {
        downloadPdfFile(currentFile, currentFile._dataUrl);
        const isPng = (currentFile.name || "").toLowerCase().endsWith(".png") || currentFile.type === "image/png";
        feedbackEl.textContent = isPng ? "Download da foto do cupom iniciado!" : "Download do PDF iniciado!";
        feedbackEl.className = "pdf-share-feedback is-success";
        feedbackEl.hidden = false;
        setTimeout(() => closePdfModal(), 1800);
      }
    };

    try {
      if (typeof modal.showModal === "function") {
        if (!modal.open) modal.showModal();
      } else {
        modal.setAttribute("open", "");
      }
    } catch (_) {
      modal.setAttribute("open", "");
    }
    lockBackground();
  };

  function formatVolleyPdfFileName(date = new Date()) {
    const value = new Date(date);
    const pad = (number) => String(number).padStart(2, "0");
    return `Volei Hub - ${pad(value.getDate())}-${pad(value.getMonth() + 1)}-${value.getFullYear()} ${pad(value.getHours())}h${pad(value.getMinutes())}.pdf`;
  }
  window.formatVolleyPdfFileName = formatVolleyPdfFileName;

  function formatVolleyRoundsText(options = {}) {
    const {
      schedule = [],
      scores = null,
      title = "Todas as rodadas",
      subtitle = "",
      date = new Date()
    } = options;

    if (!Array.isArray(schedule) || schedule.length === 0) return "";

    const dateStr = new Date(date).toLocaleString("pt-BR");
    let header = `🏐 *VÔLEI HUB · ${title.toUpperCase()}* 🏐\n📅 ${dateStr}`;
    if (subtitle) header += `\n${subtitle}`;
    header += "\n\n";

    const rounds = schedule.map((round, rIdx) => {
      const roundTitle = `*RODADA ${rIdx + 1}*`;
      const matches = (round.matches || []).map(([home, away], mIdx) => {
        let sc = null;
        const key = `${rIdx}-${mIdx}`;
        if (typeof scores?.get === "function") {
          sc = scores.get(key);
        } else if (Array.isArray(scores)) {
          const found = scores.find(([k]) => k === key);
          if (found) sc = found[1];
        } else if (typeof scores === "object" && scores !== null) {
          sc = scores[key];
        }

        let scoreStr = "x";
        if (Array.isArray(sc) && sc[0] !== "" && sc[1] !== "" && sc[0] != null && sc[1] != null) {
          scoreStr = `${sc[0]} x ${sc[1]}`;
        } else if (sc && typeof sc === "object" && sc.home != null && sc.away != null && sc.home !== "" && sc.away !== "") {
          scoreStr = `${sc.home} x ${sc.away}`;
        }

        return `• ${home}  ${scoreStr}  ${away}`;
      }).join("\n");

      const bye = round.bye ? `\n(Folga: ${round.bye})` : "";
      return `${roundTitle}\n${matches}${bye}`;
    }).join("\n\n");

    return header + rounds;
  }
  window.formatVolleyRoundsText = formatVolleyRoundsText;

  // Gerador de Foto do Cupom Térmico 58mm em Imagem Contínua (PNG de alta nitidez)
  function buildVolleyCupomImage(options = {}) {
    return new Promise((resolve) => {
      try {
        const standings = options.teamsOnly ? null : options.standings;
        const schedule = options.teamsOnly ? [] : (options.schedule || []);
        const topPlayers = (!options.teamsOnly && Array.isArray(options.topPlayers)) ? options.topPlayers : [];
        const showSaldo = options.showPointsBalance !== false;

        // 1. Participantes por Equipe
        const rawTeams = options.teams?.length
          ? options.teams
          : (standings && standings.length > 0 ? standings.map((s) => s.name) : []);

        const teamsWithPlayers = [];
        rawTeams.forEach((teamName, teamIdx) => {
          let rawMembers = [];
          if (Array.isArray(options.players) && options.players[teamIdx]) {
            rawMembers = Array.isArray(options.players[teamIdx]) ? options.players[teamIdx] : [options.players[teamIdx]];
          }
          const cleanMembers = rawMembers
            .map((p) => String(p || "").trim())
            .filter((p) => p !== "" && p !== "Vazio");

          if (cleanMembers.length > 0 || options.teamsOnly) {
            teamsWithPlayers.push({
              name: teamName,
              members: cleanMembers.length > 0 ? cleanMembers : ["Participantes não informados"]
            });
          }
        });

        // 2. Pontuações e Rodadas
        function resolveScore(roundIdx, matchIdx) {
          if (typeof options.getScore === "function") {
            return options.getScore(roundIdx, matchIdx);
          }
          if (!options.scores) return null;
          const key = `${roundIdx}-${matchIdx}`;
          let raw = null;
          if (options.scores instanceof Map) {
            raw = options.scores.get(key);
          } else if (Array.isArray(options.scores)) {
            const found = options.scores.find(([k]) => k === key);
            if (found) raw = found[1];
          } else if (typeof options.scores === "object") {
            raw = options.scores[key];
          }
          if (!raw) return null;
          if (Array.isArray(raw)) {
            if (raw[0] !== "" && raw[1] !== "" && raw[0] != null && raw[1] != null) {
              return { home: String(raw[0]), away: String(raw[1]), isPlayed: true };
            }
            return { home: "", away: "", isPlayed: false };
          }
          if (typeof raw === "object" && raw.home != null && raw.away != null && raw.home !== "" && raw.away !== "") {
            return { home: String(raw.home), away: String(raw.away), isPlayed: true };
          }
          return null;
        }

        const roundsToRender = [];
        schedule.forEach((round, roundIdx) => {
          const matchItems = [];
          (round.matches || []).forEach(([home, away], matchIdx) => {
            const scoreObj = resolveScore(roundIdx, matchIdx);
            const isPlayed = Boolean(scoreObj?.isPlayed);
            const scoreStr = isPlayed ? `${scoreObj.home} × ${scoreObj.away}` : "×";
            if (!options.onlyPlayed || isPlayed) {
              matchItems.push({ home, away, scoreStr, isPlayed });
            }
          });

          if (!options.onlyPlayed || matchItems.length > 0) {
            roundsToRender.push({
              roundIdx,
              matches: matchItems,
              bye: round.bye
            });
          }
        });

        const W = 384; // Padrão nativo 1:1 de impressoras térmicas 58mm (48mm a 203 DPI = 384 dots)
        const marginX = 4; // Margem lateral mínima (4px) para estender o conteúdo de borda a borda do cupom
        const printableW = W - 2 * marginX; // 376px de área útil total
        const endX = marginX + printableW; // 380px
        const centerX = W / 2; // 192px

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // Helper para quebra de texto
        function splitText(text, maxW, font) {
          ctx.font = font;
          const words = String(text || "").split(" ");
          const lines = [];
          let cur = words[0] || "";
          for (let i = 1; i < words.length; i++) {
            const w = words[i];
            if (ctx.measureText(cur + " " + w).width <= maxW) {
              cur += " " + w;
            } else {
              lines.push(cur);
              cur = w;
            }
          }
          if (cur) lines.push(cur);
          return lines;
        }

        // Helper para truncar texto mantendo dentro da largura máxima
        function fitText(txt, maxW, font) {
          ctx.font = font;
          let str = String(txt || "");
          if (ctx.measureText(str).width <= maxW) return str;
          while (ctx.measureText(str + "…").width > maxW && str.length > 2) {
            str = str.slice(0, -1);
          }
          return str + "…";
        }

        // Função de renderização (passo 1 mede a altura contínua exata, passo 2 desenha os pixels)
        function renderPass(isMeasuring) {
          let y = 16; // Margem superior compacta

          // Cabeçalho Principal: VÔLEI HUB (Grande e em negrito para destaque)
          if (!isMeasuring) {
            ctx.fillStyle = "#000000";
            ctx.font = "bold 28px Arial, Helvetica, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("VÔLEI HUB", centerX, y + 14);
          }
          y += 32;

          // Linha divisória grossa de ponta a ponta
          if (!isMeasuring) {
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(marginX, y);
            ctx.lineTo(endX, y);
            ctx.stroke();
          }
          y += 14;

          // Título do documento (visível e nítido)
          const titleText = String(options.title || "Resultado").toUpperCase();
          const titleFont = "bold 18px Arial, Helvetica, sans-serif";
          const titleLines = splitText(titleText, printableW, titleFont);
          if (!isMeasuring) {
            ctx.font = titleFont;
            ctx.fillStyle = "#000000";
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            titleLines.forEach((tl, i) => {
              ctx.fillText(tl, centerX, y + i * 24);
            });
          }
          y += titleLines.length * 24 + 4;

          // Subtítulo
          if (options.subtitle) {
            const subFont = "bold 13px Arial, Helvetica, sans-serif";
            const subLines = splitText(String(options.subtitle), printableW, subFont);
            if (!isMeasuring) {
              ctx.font = subFont;
              ctx.fillStyle = "#000000";
              ctx.textAlign = "center";
              ctx.textBaseline = "top";
              subLines.forEach((sl, i) => {
                ctx.fillText(sl, centerX, y + i * 18);
              });
            }
            y += subLines.length * 18 + 6;
          }

          // Linha divisória
          if (!isMeasuring) {
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(marginX, y);
            ctx.lineTo(endX, y);
            ctx.stroke();
          }
          y += 18;

          // Seção: Classificação Final (Faixa preta cheia de 376px)
          if (Array.isArray(standings) && standings.length > 0) {
            const secH = 30;
            if (!isMeasuring) {
              ctx.fillStyle = "#000000";
              ctx.fillRect(marginX, y, printableW, secH);
              ctx.fillStyle = "#ffffff";
              ctx.font = "bold 16px Arial, Helvetica, sans-serif";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText("CLASSIFICAÇÃO FINAL", centerX, y + secH / 2);
            }
            y += secH;

            const headers = showSaldo
              ? ["#", "Equipe", "V", "D", "Pts", "SG"]
              : ["#", "Equipe", "V", "D", "J"];
            const colWidths = showSaldo
              ? [32, 164, 44, 44, 46, 46]
              : [34, 198, 48, 48, 48];

            const headerH = 28;
            if (!isMeasuring) {
              ctx.fillStyle = "#dcdcdc";
              ctx.fillRect(marginX, y, printableW, headerH);
              let curX = marginX;
              headers.forEach((h, i) => {
                ctx.strokeStyle = "#000000";
                ctx.lineWidth = 1.5;
                ctx.strokeRect(curX, y, colWidths[i], headerH);
                ctx.fillStyle = "#000000";
                ctx.font = "bold 14px Arial, Helvetica, sans-serif";
                ctx.textBaseline = "middle";
                if (i === 1) {
                  ctx.textAlign = "left";
                  ctx.fillText(h, curX + 6, y + headerH / 2);
                } else {
                  ctx.textAlign = "center";
                  ctx.fillText(h, curX + colWidths[i] / 2, y + headerH / 2);
                }
                curX += colWidths[i];
              });
            }
            y += headerH;

            const rowH = 34;
            standings.forEach((team, idx) => {
              if (!isMeasuring) {
                const isEven = idx % 2 === 0;
                ctx.fillStyle = isEven ? "#ffffff" : "#f2f2f2";
                ctx.fillRect(marginX, y, printableW, rowH);

                const diffVal = team.difference != null ? Number(team.difference) : 0;
                const diffStr = diffVal >= 0 ? `+${diffVal}` : String(diffVal);

                const cells = showSaldo
                  ? [
                      `${idx + 1}º`,
                      String(team.name || `Equipe ${idx + 1}`),
                      String(team.wins ?? 0),
                      String(team.losses ?? 0),
                      String(team.points ?? 0),
                      diffStr
                    ]
                  : [
                      `${idx + 1}º`,
                      String(team.name || `Equipe ${idx + 1}`),
                      String(team.wins ?? 0),
                      String(team.losses ?? 0),
                      String(team.games ?? 0)
                    ];

                let curX = marginX;
                cells.forEach((val, i) => {
                  ctx.strokeStyle = "#000000";
                  ctx.lineWidth = 1.2;
                  ctx.strokeRect(curX, y, colWidths[i], rowH);
                  ctx.fillStyle = "#000000";
                  ctx.font = "bold 14px Arial, Helvetica, sans-serif";
                  ctx.textBaseline = "middle";
                  if (i === 1) {
                    ctx.textAlign = "left";
                    ctx.fillText(fitText(val, colWidths[i] - 10, "bold 14px Arial, Helvetica, sans-serif"), curX + 6, y + rowH / 2);
                  } else {
                    ctx.textAlign = "center";
                    ctx.fillText(val, curX + colWidths[i] / 2, y + rowH / 2);
                  }
                  curX += colWidths[i];
                });
              }
              y += rowH;
            });
            y += 18;

            if (options.exclusionAlert) {
              const alertFont = "bold 12px Arial, Helvetica, sans-serif";
              const alertLines = splitText(String(options.exclusionAlert), printableW - 16, alertFont);
              const alertH = alertLines.length * 18 + 12;
              if (!isMeasuring) {
                ctx.fillStyle = "#fef3c7";
                ctx.fillRect(marginX, y, printableW, alertH);
                ctx.strokeStyle = "#000000";
                ctx.lineWidth = 1.5;
                ctx.strokeRect(marginX, y, printableW, alertH);
                ctx.fillStyle = "#000000";
                ctx.font = alertFont;
                ctx.textAlign = "left";
                ctx.textBaseline = "top";
                alertLines.forEach((al, i) => {
                  ctx.fillText(al, marginX + 8, y + 6 + i * 18);
                });
              }
              y += alertH + 18;
            }
          }

          // Seção: Top Jogadores
          if (topPlayers.length > 0) {
            const secH = 30;
            if (!isMeasuring) {
              ctx.fillStyle = "#000000";
              ctx.fillRect(marginX, y, printableW, secH);
              ctx.fillStyle = "#ffffff";
              ctx.font = "bold 16px Arial, Helvetica, sans-serif";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText("TOP JOGADORES", centerX, y + secH / 2);
            }
            y += secH + 10;

            const top10 = topPlayers.slice(0, 10);
            top10.forEach((p, i) => {
              if (!isMeasuring) {
                ctx.fillStyle = "#000000";
                ctx.font = "bold 14px Arial, Helvetica, sans-serif";
                ctx.textAlign = "left";
                ctx.textBaseline = "middle";
                const itemText = `${i + 1}º ${p.name} (${p.team}) · ${p.points} pts`;
                ctx.fillText(itemText, marginX + 6, y + 11);
              }
              y += 22;
            });
            y += 14;
          }

          // Seção: Participantes por Equipe (fontes maiores e nomes destacados)
          if (teamsWithPlayers.length > 0) {
            const isTeamsOnly = Boolean(options.teamsOnly);
            const sectionH = isTeamsOnly ? 34 : 30;
            if (!isMeasuring) {
              ctx.fillStyle = "#000000";
              ctx.fillRect(marginX, y, printableW, sectionH);
              ctx.fillStyle = "#ffffff";
              ctx.font = isTeamsOnly ? "bold 18px Arial, sans-serif" : "bold 16px Arial, sans-serif";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText("EQUIPES E INTEGRANTES", centerX, y + sectionH / 2);
            }
            y += sectionH + 10;

            teamsWithPlayers.forEach((teamObj) => {
              const headerH = isTeamsOnly ? 34 : 28;
              if (!isMeasuring) {
                ctx.fillStyle = "#e0e0e0";
                ctx.fillRect(marginX, y, printableW, headerH);
                ctx.strokeStyle = "#000000";
                ctx.lineWidth = 1.5;
                ctx.strokeRect(marginX, y, printableW, headerH);
                ctx.fillStyle = "#000000";
                ctx.font = isTeamsOnly ? "bold 18px Arial, sans-serif" : "bold 16px Arial, sans-serif";
                ctx.textAlign = "left";
                ctx.textBaseline = "middle";
                ctx.fillText(teamObj.name, marginX + 8, y + headerH / 2);
              }
              y += headerH + 6;

              const memberH = isTeamsOnly ? 27 : 24;
              teamObj.members.forEach((member) => {
                const bulletText = `• ${member}`;
                const mLines = splitText(bulletText, printableW - 16, isTeamsOnly ? "bold 17px Arial, sans-serif" : "bold 15px Arial, sans-serif");
                if (!isMeasuring) {
                  ctx.fillStyle = "#000000";
                  ctx.font = isTeamsOnly ? "bold 17px Arial, sans-serif" : "bold 15px Arial, sans-serif";
                  ctx.textAlign = "left";
                  ctx.textBaseline = "middle";
                  mLines.forEach((ml, mi) => {
                    ctx.fillText(ml, marginX + 10, y + mi * memberH + memberH / 2);
                  });
                }
                y += mLines.length * memberH;
              });

              y += isTeamsOnly ? 10 : 8;
              if (!isMeasuring) {
                ctx.strokeStyle = "#aaaaaa";
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(marginX, y);
                ctx.lineTo(endX, y);
                ctx.stroke();
              }
              y += isTeamsOnly ? 14 : 12;
            });
            y += 8;
          }

          // Seção: Jogos por Rodada
          if (roundsToRender.length > 0) {
            if (!isMeasuring) {
              ctx.fillStyle = "#000000";
              ctx.fillRect(marginX, y, printableW, 30);
              ctx.fillStyle = "#ffffff";
              ctx.font = "bold 16px Arial, Helvetica, sans-serif";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(options.onlyPlayed ? "JOGOS REALIZADOS" : "JOGOS POR RODADA", centerX, y + 15);
            }
            y += 42;

            roundsToRender.forEach((roundData) => {
              const { roundIdx, matches, bye } = roundData;
              const headerH = 26;
              const matchLineH = 36;
              const byeH = bye ? 24 : 0;
              const cardH = headerH + matches.length * matchLineH + byeH + 6;

              if (!isMeasuring) {
                // Fundo branco do card
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(marginX, y, printableW, cardH);
                // Borda do card
                ctx.strokeStyle = "#000000";
                ctx.lineWidth = 2;
                ctx.strokeRect(marginX, y, printableW, cardH);

                // Topo cinza da rodada
                ctx.fillStyle = "#e0e0e0";
                ctx.fillRect(marginX, y, printableW, headerH);
                ctx.beginPath();
                ctx.moveTo(marginX, y + headerH);
                ctx.lineTo(endX, y + headerH);
                ctx.stroke();

                ctx.fillStyle = "#000000";
                ctx.font = "bold 15px Arial, Helvetica, sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(`Rodada ${roundIdx + 1}`, centerX, y + headerH / 2);

                let curMatchY = y + headerH + matchLineH / 2;
                matches.forEach(({ home, away, scoreStr }) => {
                  ctx.fillStyle = "#000000";
                  ctx.textBaseline = "middle";

                  // Time Mandante
                  ctx.font = "bold 15px Arial, Helvetica, sans-serif";
                  ctx.textAlign = "right";
                  ctx.fillText(fitText(home, 138, "bold 15px Arial, Helvetica, sans-serif"), centerX - 32, curMatchY);

                  // Placar central
                  ctx.font = "bold 18px Arial, Helvetica, sans-serif";
                  ctx.textAlign = "center";
                  ctx.fillText(scoreStr, centerX, curMatchY);

                  // Time Visitante
                  ctx.font = "bold 15px Arial, Helvetica, sans-serif";
                  ctx.textAlign = "left";
                  ctx.fillText(fitText(away, 138, "bold 15px Arial, Helvetica, sans-serif"), centerX + 32, curMatchY);

                  curMatchY += matchLineH;
                });

                if (bye) {
                  ctx.fillStyle = "#000000";
                  ctx.font = "bold 13px Arial, Helvetica, sans-serif";
                  ctx.textAlign = "center";
                  ctx.textBaseline = "middle";
                  ctx.fillText(`Folga: ${bye}`, centerX, curMatchY - 6);
                }
              }

              y += cardH + 14;
            });
            y += 6;
          }

          // Rodapé do Cupom
          let dateVal = new Date(options.date || Date.now());
          if (isNaN(dateVal.getTime())) dateVal = new Date();
          y += 6;
          if (!isMeasuring) {
            ctx.fillStyle = "#000000";
            ctx.font = "bold 13px Arial, Helvetica, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(`Emitido em: ${dateVal.toLocaleString("pt-BR")}`, centerX, y);
          }
          y += 20;

          if (!isMeasuring) {
            ctx.font = "bold 14px monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("- - - - - - - - - - - - - - - - - - - - - - -", centerX, y);
          }
          y += 30; // Margem para corte do papel

          return y;
        }

        // 1. Passo de medição para determinar altura contínua exata
        const calculatedH = renderPass(true);
        canvas.width = W;
        canvas.height = Math.max(250, Math.ceil(calculatedH));

        // Fundo 100% branco para contraste térmico
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. Passo de desenho com dimensões finais
        renderPass(false);

        // Nome do arquivo
        const pad = (n) => String(n).padStart(2, "0");
        let d = new Date(options.date || Date.now());
        if (isNaN(d.getTime())) d = new Date();
        const datePart = `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}h${pad(d.getMinutes())}`;
        const fileName = options.teamsOnly
          ? `Volei Hub - Times - Cupom 58mm - ${datePart}.png`
          : `Volei Hub - Cupom 58mm - ${datePart}.png`;

        const dataUrl = canvas.toDataURL("image/png");

        let resolved = false;
        function finish(blob) {
          if (resolved) return;
          resolved = true;
          let file = null;
          try {
            file = new File([blob], fileName, { type: "image/png", lastModified: Date.now() });
          } catch (_) {
            file = blob || {};
          }
          if (file) {
            file.name = fileName;
            file._pdfOptions = options;
            file._dataUrl = dataUrl;
          }
          resolve({ canvas, blob, file, fileName, dataUrl, options });
        }

        function fallbackBlob() {
          try {
            const arr = dataUrl.split(",");
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
              u8arr[n] = bstr.charCodeAt(n);
            }
            const blob = new Blob([u8arr], { type: "image/png" });
            finish(blob);
          } catch (e) {
            finish(null);
          }
        }

        if (typeof canvas.toBlob === "function") {
          try {
            canvas.toBlob((blob) => {
              if (blob) {
                finish(blob);
              } else {
                fallbackBlob();
              }
            }, "image/png");
          } catch (_) {
            fallbackBlob();
          }
        } else {
          fallbackBlob();
        }
      } catch (err) {
        console.warn("Erro ao gerar Foto do Cupom:", err);
        resolve({ canvas: null, blob: null, file: null, fileName: "" });
      }
    });
  }
  window.buildVolleyCupomImage = buildVolleyCupomImage;

  // Gerador de Cupom Térmico 58mm Contínuo (PDF)
  function buildVolleyCupomPdf(options = {}, Pdf) {
    try {
      const standings = options.teamsOnly ? null : options.standings;
      const schedule = options.teamsOnly ? [] : (options.schedule || []);
      const topPlayers = (!options.teamsOnly && Array.isArray(options.topPlayers)) ? options.topPlayers : [];
      const showSaldo = options.showPointsBalance !== false;

      // 1. Participantes por Equipe
      const rawTeams = options.teams?.length
        ? options.teams
        : (standings && standings.length > 0 ? standings.map((s) => s.name) : []);

      const teamsWithPlayers = [];
      rawTeams.forEach((teamName, teamIdx) => {
        let rawMembers = [];
        if (Array.isArray(options.players) && options.players[teamIdx]) {
          rawMembers = Array.isArray(options.players[teamIdx]) ? options.players[teamIdx] : [options.players[teamIdx]];
        }
        const cleanMembers = rawMembers
          .map((p) => String(p || "").trim())
          .filter((p) => p !== "" && p !== "Vazio");

        if (cleanMembers.length > 0 || options.teamsOnly) {
          teamsWithPlayers.push({
            name: teamName,
            members: cleanMembers.length > 0 ? cleanMembers : ["Participantes não informados"]
          });
        }
      });

      // 2. Pontuações e Rodadas
      function resolveScore(roundIdx, matchIdx) {
        if (typeof options.getScore === "function") {
          return options.getScore(roundIdx, matchIdx);
        }
        if (!options.scores) return null;
        const key = `${roundIdx}-${matchIdx}`;
        let raw = null;
        if (options.scores instanceof Map) {
          raw = options.scores.get(key);
        } else if (Array.isArray(options.scores)) {
          const found = options.scores.find(([k]) => k === key);
          if (found) raw = found[1];
        } else if (typeof options.scores === "object") {
          raw = options.scores[key];
        }
        if (!raw) return null;
        if (Array.isArray(raw)) {
          if (raw[0] !== "" && raw[1] !== "" && raw[0] != null && raw[1] != null) {
            return { home: String(raw[0]), away: String(raw[1]), isPlayed: true };
          }
          return { home: "", away: "", isPlayed: false };
        }
        if (typeof raw === "object" && raw.home != null && raw.away != null && raw.home !== "" && raw.away !== "") {
          return { home: String(raw.home), away: String(raw.away), isPlayed: true };
        }
        return null;
      }

      const roundsToRender = [];
      schedule.forEach((round, roundIdx) => {
        const matchItems = [];
        (round.matches || []).forEach(([home, away], matchIdx) => {
          const scoreObj = resolveScore(roundIdx, matchIdx);
          const isPlayed = Boolean(scoreObj?.isPlayed);
          const scoreStr = isPlayed ? `${scoreObj.home} × ${scoreObj.away}` : "×";
          if (!options.onlyPlayed || isPlayed) {
            matchItems.push({ home, away, scoreStr, isPlayed });
          }
        });

        if (!options.onlyPlayed || matchItems.length > 0) {
          roundsToRender.push({
            roundIdx,
            matches: matchItems,
            bye: round.bye
          });
        }
      });

      // 3. Estimativa de altura contínua em mm (para bobina 58mm com fontes ampliadas em negrito)
      let estH = 12;
      estH += 7; // VÔLEI HUB
      estH += 4; // linha
      estH += 8; // Título
      if (options.subtitle) estH += 8;
      estH += 5; // linha

      if (Array.isArray(standings) && standings.length > 0) {
        estH += 7.5; // Faixa de seção
        estH += 6.0; // Cabeçalho da tabela
        estH += standings.length * 5.2; // Linhas de classificação
        estH += 5.0;
        if (options.exclusionAlert) estH += 15.0;
      }

      if (topPlayers.length > 0) {
        estH += 7.5;
        estH += Math.min(topPlayers.length, 10) * 4.6;
        estH += 5.0;
      }

      if (teamsWithPlayers.length > 0) {
        const isTeamsOnly = Boolean(options.teamsOnly);
        estH += isTeamsOnly ? 9.5 : 7.5;
        teamsWithPlayers.forEach((team) => {
          estH += isTeamsOnly ? 6.6 : 5.2;
          estH += team.members.length * (isTeamsOnly ? 4.9 : 4.2);
          estH += 3.5;
        });
        estH += 4.5;
      }

      if (roundsToRender.length > 0) {
        estH += 7.5;
        roundsToRender.forEach((r) => {
          estH += 5.2;
          estH += r.matches.length * 5.6;
          if (r.bye) estH += 4.6;
          estH += 4.5;
        });
        estH += 4.0;
      }

      estH += 28; // Rodapé e corte
      const totalHeight = Math.max(90, Math.ceil(estH));

      // 4. Criação do documento contínuo em 58mm (otimizado para impressão térmica)
      const pdf = new Pdf({ unit: "mm", format: [58, totalHeight] });
      let y = 6.5;
      const marginX = 3.5;
      const printableWidth = 51;
      const endX = marginX + printableWidth; // 54.5mm
      const centerX = 29;

      // Cabeçalho Principal do Cupom
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12.0);
      pdf.setTextColor(0, 0, 0);
      pdf.text("VÔLEI HUB", centerX, y, { align: "center" });
      y += 5.0;

      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.4);
      pdf.line(marginX, y, endX, y);
      y += 4.0;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9.5);
      pdf.setTextColor(0, 0, 0);
      const titleLines = pdf.splitTextToSize(String(options.title || "Resultado").toUpperCase(), printableWidth);
      pdf.text(titleLines, centerX, y, { align: "center" });
      y += titleLines.length * 4.0 + 1.2;

      if (options.subtitle) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7.4);
        pdf.setTextColor(0, 0, 0);
        const subLines = pdf.splitTextToSize(String(options.subtitle), printableWidth);
        pdf.text(subLines, centerX, y, { align: "center" });
        y += subLines.length * 3.6 + 1.4;
      }

      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.35);
      pdf.line(marginX, y, endX, y);
      y += 4.5;

      // Seção: Classificação Final
      if (Array.isArray(standings) && standings.length > 0) {
        pdf.setFillColor(0, 0, 0);
        pdf.rect(marginX, y, printableWidth, 5.0, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8.0);
        pdf.text("CLASSIFICAÇÃO FINAL", centerX, y + 3.5, { align: "center" });
        y += 5.0;

        const headers = showSaldo
          ? ["#", "Equipe", "V", "D", "Pts", "SG"]
          : ["#", "Equipe", "V", "D", "J"];
        const colWidths = showSaldo
          ? [5, 22, 6, 6, 6, 6]
          : [5, 25, 7, 7, 7];

        let curHeaderX = marginX;
        const headerH = 4.8;
        pdf.setFillColor(235, 235, 235);
        pdf.rect(marginX, y, printableWidth, headerH, "F");

        headers.forEach((h, i) => {
          pdf.setDrawColor(0, 0, 0);
          pdf.setLineWidth(0.3);
          pdf.rect(curHeaderX, y, colWidths[i], headerH, "S");
          pdf.setTextColor(0, 0, 0);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(6.8);
          if (i === 1) {
            pdf.text(h, curHeaderX + 1.2, y + 3.3);
          } else {
            pdf.text(h, curHeaderX + colWidths[i] / 2, y + 3.3, { align: "center" });
          }
          curHeaderX += colWidths[i];
        });
        y += headerH;

        const rowH = 4.8;
        standings.forEach((team, idx) => {
          let rowX = marginX;
          const isEven = idx % 2 === 0;
          pdf.setFillColor(isEven ? 255 : 242, isEven ? 255 : 242, isEven ? 255 : 242);
          pdf.rect(marginX, y, printableWidth, rowH, "F");

          const diffVal = team.difference != null ? Number(team.difference) : 0;
          const diffStr = diffVal >= 0 ? `+${diffVal}` : String(diffVal);

          const cells = showSaldo
            ? [
                `${idx + 1}º`,
                String(team.name || `Equipe ${idx + 1}`),
                String(team.wins ?? 0),
                String(team.losses ?? 0),
                String(team.points ?? 0),
                diffStr
              ]
            : [
                `${idx + 1}º`,
                String(team.name || `Equipe ${idx + 1}`),
                String(team.wins ?? 0),
                String(team.losses ?? 0),
                String(team.games ?? 0)
              ];

          cells.forEach((val, i) => {
            pdf.setDrawColor(0, 0, 0);
            pdf.setLineWidth(0.25);
            pdf.rect(rowX, y, colWidths[i], rowH, "S");
            pdf.setTextColor(0, 0, 0);
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(7.0);

            if (i === 1) {
              const safeText = pdf.splitTextToSize(val, colWidths[i] - 1.5)[0] || "";
              pdf.text(safeText, rowX + 1.2, y + 3.3);
            } else {
              pdf.text(val, rowX + colWidths[i] / 2, y + 3.3, { align: "center" });
            }
            rowX += colWidths[i];
          });
          y += rowH;
        });
        y += 4.5;

        if (options.exclusionAlert) {
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(6.8);
          pdf.setTextColor(0, 0, 0);
          const alertLines = pdf.splitTextToSize(String(options.exclusionAlert), printableWidth - 3);
          const alertH = alertLines.length * 3.6 + 3.5;
          pdf.setFillColor(254, 243, 199);
          pdf.setDrawColor(0, 0, 0);
          pdf.setLineWidth(0.3);
          pdf.rect(marginX, y, printableWidth, alertH, "FD");
          pdf.text(alertLines, marginX + 1.5, y + 3.0);
          y += alertH + 4.0;
        }
      }

      // Seção: Top Jogadores
      if (topPlayers.length > 0) {
        pdf.setFillColor(0, 0, 0);
        pdf.rect(marginX, y, printableWidth, 5.0, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8.0);
        pdf.text("TOP JOGADORES", centerX, y + 3.5, { align: "center" });
        y += 6.0;

        const top10 = topPlayers.slice(0, 10);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7.4);
        pdf.setTextColor(0, 0, 0);

        top10.forEach((p, i) => {
          const itemText = `${i + 1}º ${p.name} (${p.team}) · ${p.points} pts`;
          const safeLine = pdf.splitTextToSize(itemText, printableWidth - 2)[0] || "";
          pdf.text(safeLine, marginX + 1.5, y);
          y += 4.2;
        });
        y += 3.0;
      }

      // Seção: Participantes por Equipe
      if (teamsWithPlayers.length > 0) {
        const isTeamsOnly = Boolean(options.teamsOnly);
        pdf.setFillColor(0, 0, 0);
        pdf.rect(marginX, y, printableWidth, isTeamsOnly ? 5.5 : 5.0, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(isTeamsOnly ? 9.0 : 8.0);
        pdf.text("EQUIPES E INTEGRANTES", centerX, y + (isTeamsOnly ? 3.8 : 3.5), { align: "center" });
        y += isTeamsOnly ? 6.6 : 6.0;

        teamsWithPlayers.forEach((teamObj) => {
          const headerH = isTeamsOnly ? 6.0 : 4.6;
          pdf.setFillColor(235, 235, 235);
          pdf.rect(marginX, y, printableWidth, headerH, "F");
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(isTeamsOnly ? 10.5 : 8.5);
          pdf.setTextColor(0, 0, 0);
          pdf.text(teamObj.name, marginX + 2.0, y + (isTeamsOnly ? 4.3 : 3.3));
          y += headerH + 0.8;

          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(isTeamsOnly ? 9.5 : 7.8);
          pdf.setTextColor(0, 0, 0);
          const memberH = isTeamsOnly ? 4.6 : 3.8;
          teamObj.members.forEach((member) => {
            const bulletText = `• ${member}`;
            const lines = pdf.splitTextToSize(bulletText, printableWidth - 3);
            pdf.text(lines, marginX + 2.5, y + (isTeamsOnly ? 3.4 : 2.8));
            y += lines.length * memberH;
          });
          y += isTeamsOnly ? 2.5 : 2.0;

          pdf.setDrawColor(180, 180, 180);
          pdf.setLineWidth(0.3);
          pdf.line(marginX, y, endX, y);
          y += isTeamsOnly ? 3.5 : 3.0;
        });
      }

      // Seção: Jogos por Rodada
      if (roundsToRender.length > 0) {
        pdf.setFillColor(0, 0, 0);
        pdf.rect(marginX, y, printableWidth, 5.0, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8.0);
        pdf.text(options.onlyPlayed ? "JOGOS REALIZADOS" : "JOGOS POR RODADA", centerX, y + 3.5, { align: "center" });
        y += 6.5;

        roundsToRender.forEach((roundData) => {
          const { roundIdx, matches, bye } = roundData;
          const headerH = 4.8;
          const matchLineH = 5.5;
          const byeH = bye ? 4.4 : 0;
          const cardH = headerH + matches.length * matchLineH + byeH + 2.2;

          // Caixa completa da rodada
          pdf.setDrawColor(0, 0, 0);
          pdf.setLineWidth(0.5);
          pdf.setFillColor(255, 255, 255);
          pdf.rect(marginX, y, printableWidth, cardH, "FD");

          // Campo que informa o número da rodada com borda espessa
          pdf.setFillColor(235, 235, 235);
          pdf.rect(marginX, y, printableWidth, headerH, "FD");
          pdf.line(marginX, y + headerH, endX, y + headerH);

          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(8.0);
          pdf.setTextColor(0, 0, 0);
          pdf.text(`Rodada ${roundIdx + 1}`, centerX, y + 3.4, { align: "center" });

          let currentMatchY = y + headerH + 3.9;
          matches.forEach(({ home, away, scoreStr }) => {
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(7.4);
            pdf.setTextColor(0, 0, 0);
            const safeHome = pdf.splitTextToSize(String(home), 18)[0] || "";
            pdf.text(safeHome, 22.2, currentMatchY, { align: "right" });

            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(8.2);
            pdf.setTextColor(0, 0, 0);
            pdf.text(scoreStr, centerX, currentMatchY, { align: "center" });

            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(7.4);
            pdf.setTextColor(0, 0, 0);
            const safeAway = pdf.splitTextToSize(String(away), 18)[0] || "";
            pdf.text(safeAway, 35.8, currentMatchY, { align: "left" });

            currentMatchY += matchLineH;
          });

          if (bye) {
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(7.0);
            pdf.setTextColor(0, 0, 0);
            pdf.text(`Folga: ${bye}`, centerX, currentMatchY - 0.5, { align: "center" });
          }

          y += cardH + 3.8;
        });
      }

      // Rodapé do Cupom
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.4);
      pdf.line(marginX, y, endX, y);
      y += 4.0;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8.5);
      pdf.setTextColor(0, 0, 0);
      pdf.text("VÔLEI HUB", centerX, y, { align: "center" });
      y += 3.8;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.0);
      pdf.setTextColor(0, 0, 0);
      pdf.text("voleihub.app · Sistema de Gestão", centerX, y, { align: "center" });
      y += 3.6;

      const dateVal = new Date(options.date || new Date());
      pdf.text(`Emitido em: ${dateVal.toLocaleString("pt-BR")}`, centerX, y, { align: "center" });
      y += 4.0;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.0);
      pdf.setTextColor(0, 0, 0);
      pdf.text("- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -", centerX, y, { align: "center" });

      const pad = (n) => String(n).padStart(2, "0");
      const d = dateVal;
      const datePart = `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}h${pad(d.getMinutes())}`;
      let fileName = options.teamsOnly
        ? `Volei Hub - Times - Cupom 58mm - ${datePart}.pdf`
        : `Volei Hub - Cupom 58mm - ${datePart}.pdf`;

      let file = null;
      try {
        file = new File([pdf.output("blob")], fileName, { type: "application/pdf" });
      } catch (_) {
        file = pdf.output("blob");
        if (file) file.name = fileName;
      }
      if (file) file._pdfOptions = options;

      return { pdf, file, fileName, options };
    } catch (err) {
      console.warn("Erro ao gerar Cupom 58mm:", err);
      return { pdf: null, file: null, fileName: "" };
    }
  }

  window.buildVolleyPdf = function (options = {}) {
    if (options.format === "cupom-img" || options.format === "image" || options.format === "png") {
      return buildVolleyCupomImage(options);
    }

    const Pdf = window.jspdf?.jsPDF;
    if (!Pdf) {
      console.warn("jsPDF não carregado.");
      return { pdf: null, file: null, fileName: "" };
    }

    if (options.format === "cupom" || options.format === "58mm") {
      return buildVolleyCupomPdf(options, Pdf);
    }

    try {
      const pdf = new Pdf({ unit: "mm", format: "a4" });
      let y = 18;

      // 1. Cabeçalho Principal (Página 1)
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(30, 41, 59);
      pdf.text("VÔLEI HUB", 18, y);
      y += 6;

      pdf.setFontSize(18);
      pdf.text(options.title || "Resultado de partida", 18, y);
      y += 5.5;

      if (options.subtitle) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9.5);
        pdf.setTextColor(71, 85, 105);
        const subLines = pdf.splitTextToSize(String(options.subtitle), 174);
        pdf.text(subLines, 18, y);
        y += subLines.length * 4.6 + 2;
      } else {
        y += 2;
      }

      // 2. Classificação Final (Página 1)
      const standings = options.teamsOnly ? null : options.standings;
      if (Array.isArray(standings) && standings.length > 0) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(13);
        pdf.setTextColor(30, 41, 59);
        pdf.text("Classificação final", 18, y);
        y += 5;

        const showSaldo = options.showPointsBalance !== false;
        // Ordem especificada: vitorias, derrotas, jogos, pontos e saldos
        const headers = showSaldo
          ? ["#", "Equipe", "Vit.", "Der.", "Jogos", "Pontos", "Saldo"]
          : ["#", "Equipe", "Vit.", "Der.", "Jogos"];
        const colWidths = showSaldo
          ? [12, 62, 20, 20, 20, 20, 20]
          : [14, 70, 30, 30, 30];

        // Cabeçalho da tabela destacado (#1e293b)
        const headerHeight = 7.5;
        let curHeaderX = 18;
        pdf.setFillColor(30, 41, 59);
        pdf.rect(18, y, 174, headerHeight, "F");

        headers.forEach((h, i) => {
          pdf.setDrawColor(203, 213, 225);
          pdf.rect(curHeaderX, y, colWidths[i], headerHeight, "S");
          pdf.setTextColor(255, 255, 255);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(8);
          if (i === 1) {
            pdf.text(h, curHeaderX + 2.5, y + 4.9);
          } else {
            pdf.text(h, curHeaderX + colWidths[i] / 2, y + 4.9, { align: "center" });
          }
          curHeaderX += colWidths[i];
        });
        y += headerHeight;

        // Linhas de equipes da tabela
        const rowHeight = 7.2;
        standings.forEach((team, idx) => {
          let rowX = 18;
          const isEven = idx % 2 === 0;
          pdf.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
          pdf.rect(18, y, 174, rowHeight, "F");

          const diffVal = team.difference != null ? Number(team.difference) : 0;
          const diffStr = diffVal >= 0 ? `+${diffVal}` : String(diffVal);

          const cells = showSaldo
            ? [
                `${idx + 1}º`,
                String(team.name || `Equipe ${idx + 1}`),
                String(team.wins ?? 0),
                String(team.losses ?? 0),
                String(team.games ?? 0),
                String(team.points ?? 0),
                diffStr
              ]
            : [
                `${idx + 1}º`,
                String(team.name || `Equipe ${idx + 1}`),
                String(team.wins ?? 0),
                String(team.losses ?? 0),
                String(team.games ?? 0)
              ];

          cells.forEach((val, i) => {
            pdf.setDrawColor(203, 213, 225);
            pdf.rect(rowX, y, colWidths[i], rowHeight, "S");
            pdf.setTextColor(30, 41, 59);
            pdf.setFont("helvetica", i === 2 ? "bold" : "normal");
            pdf.setFontSize(8);

            if (i === 1) {
              const safeText = pdf.splitTextToSize(val, colWidths[i] - 4)[0] || "";
              pdf.text(safeText, rowX + 2.5, y + 4.7);
            } else {
              pdf.text(val, rowX + colWidths[i] / 2, y + 4.7, { align: "center" });
            }
            rowX += colWidths[i];
          });
          y += rowHeight;
        });
        y += 6;

        // Alerta de equilíbrio por exclusão
        if (options.exclusionAlert) {
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(8);
          pdf.setTextColor(180, 83, 9);
          const alertLines = pdf.splitTextToSize(String(options.exclusionAlert), 170);
          const alertH = alertLines.length * 4.2 + 4;
          pdf.setFillColor(254, 243, 199);
          pdf.setDrawColor(251, 191, 36);
          pdf.rect(18, y, 174, alertH, "FD");
          pdf.text(alertLines, 20, y + 3.8);
          y += alertH + 4;
        }
      }

      // 3. Top 10 Jogadores (opcional)
      if (!options.teamsOnly && Array.isArray(options.topPlayers) && options.topPlayers.length > 0) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.setTextColor(30, 41, 59);
        pdf.text("Top 10 jogadores", 18, y);
        y += 4.5;

        const top10 = options.topPlayers.slice(0, 10);
        const half = Math.ceil(top10.length / 2);
        const leftCol = top10.slice(0, half);
        const rightCol = top10.slice(half);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(51, 65, 85);
        const startTopY = y;
        leftCol.forEach((p, i) => {
          pdf.text(`${i + 1}º ${p.name} · ${p.team} · ${p.points} pts`, 18, startTopY + i * 4.2);
        });
        rightCol.forEach((p, i) => {
          pdf.text(`${half + i + 1}º ${p.name} · ${p.team} · ${p.points} pts`, 105, startTopY + i * 4.2);
        });
        y = startTopY + Math.max(leftCol.length, rightCol.length) * 4.2 + 4;
      }

      // 4. Participantes por Equipe (integrantes um abaixo do outro)
      const rawTeams = options.teams?.length
        ? options.teams
        : (standings && standings.length > 0 ? standings.map((s) => s.name) : []);

      const teamsWithPlayers = [];
      rawTeams.forEach((teamName, teamIdx) => {
        let rawMembers = [];
        if (Array.isArray(options.players) && options.players[teamIdx]) {
          rawMembers = Array.isArray(options.players[teamIdx]) ? options.players[teamIdx] : [options.players[teamIdx]];
        }
        const cleanMembers = rawMembers
          .map((p) => String(p || "").trim())
          .filter((p) => p !== "" && p !== "Vazio");

        if (cleanMembers.length > 0 || options.teamsOnly) {
          teamsWithPlayers.push({
            name: teamName,
            members: cleanMembers.length > 0 ? cleanMembers : ["Participantes não informados"]
          });
        }
      });

      if (teamsWithPlayers.length > 0) {
        const isTeamsOnly = Boolean(options.teamsOnly);
        y += isTeamsOnly ? 6 : 4;
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(isTeamsOnly ? 16 : 13);
        pdf.setTextColor(30, 41, 59);
        pdf.text(isTeamsOnly ? "Equipes e Integrantes" : "Participantes por equipe", 18, y);
        y += isTeamsOnly ? 8 : 6;

        // Quando for envio de times (teamsOnly), usamos no máximo 2 colunas para fontes amplas e nítidas
        const numCols = isTeamsOnly
          ? (teamsWithPlayers.length <= 1 ? 1 : 2)
          : (teamsWithPlayers.length <= 2 ? teamsWithPlayers.length : teamsWithPlayers.length <= 4 ? 2 : 3);
        const colWidth = (174 - (numCols - 1) * 8) / numCols;

        for (let i = 0; i < teamsWithPlayers.length; i += numCols) {
          const rowTeams = teamsWithPlayers.slice(i, i + numCols);
          const rowStartY = y;
          let maxColHeight = 0;

          rowTeams.forEach((teamObj, colIdx) => {
            const colX = 18 + colIdx * (colWidth + 8);
            let curY = rowStartY;

            // Nome da equipe
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(isTeamsOnly ? 13.0 : 9.5);
            pdf.setTextColor(30, 41, 59);
            pdf.text(`${teamObj.name}:`, colX, curY);
            curY += isTeamsOnly ? 6.0 : 4.5;

            // Integrantes um abaixo do outro
            pdf.setFont("helvetica", isTeamsOnly ? "bold" : "normal");
            pdf.setFontSize(isTeamsOnly ? 11.0 : 8.5);
            pdf.setTextColor(isTeamsOnly ? 15 : 51, isTeamsOnly ? 23 : 65, isTeamsOnly ? 42 : 85);

            const memberLineH = isTeamsOnly ? 5.2 : 3.8;
            teamObj.members.forEach((member) => {
              const bulletText = `• ${member}`;
              const lines = pdf.splitTextToSize(bulletText, colWidth - 2);
              pdf.text(lines, colX + 1.5, curY);
              curY += lines.length * memberLineH;
            });

            const colHeight = curY - rowStartY;
            if (colHeight > maxColHeight) maxColHeight = colHeight;
          });

          y = rowStartY + maxColHeight + (isTeamsOnly ? 6.5 : 3.5);
        }
      }

      // 5. Jogos por Rodada - A PARTIR DA PÁGINA 2
      const schedule = options.teamsOnly ? [] : (options.schedule || []);
      if (schedule.length > 0) {
        // Resolver pontuação
        function resolveScore(roundIdx, matchIdx) {
          if (typeof options.getScore === "function") {
            return options.getScore(roundIdx, matchIdx);
          }
          if (!options.scores) return null;
          const key = `${roundIdx}-${matchIdx}`;
          let raw = null;
          if (options.scores instanceof Map) {
            raw = options.scores.get(key);
          } else if (Array.isArray(options.scores)) {
            const found = options.scores.find(([k]) => k === key);
            if (found) raw = found[1];
          } else if (typeof options.scores === "object") {
            raw = options.scores[key];
          }
          if (!raw) return null;
          if (Array.isArray(raw)) {
            if (raw[0] !== "" && raw[1] !== "" && raw[0] != null && raw[1] != null) {
              return { home: String(raw[0]), away: String(raw[1]), isPlayed: true };
            }
            return { home: "", away: "", isPlayed: false };
          }
          if (typeof raw === "object" && raw.home != null && raw.away != null && raw.home !== "" && raw.away !== "") {
            return { home: String(raw.home), away: String(raw.away), isPlayed: true };
          }
          return null;
        }

        const roundsToRender = [];
        schedule.forEach((round, roundIdx) => {
          const matchItems = [];
          (round.matches || []).forEach(([home, away], matchIdx) => {
            const scoreObj = resolveScore(roundIdx, matchIdx);
            const isPlayed = Boolean(scoreObj?.isPlayed);
            const scoreStr = isPlayed ? `${scoreObj.home}   ×   ${scoreObj.away}` : "×";
            if (!options.onlyPlayed || isPlayed) {
              matchItems.push({ home, away, scoreStr, isPlayed });
            }
          });

          if (!options.onlyPlayed || matchItems.length > 0) {
            roundsToRender.push({
              roundIdx,
              matches: matchItems,
              bye: round.bye
            });
          }
        });

        if (roundsToRender.length > 0) {
          const hasPriorContent = (Array.isArray(standings) && standings.length > 0) || teamsWithPlayers.length > 0 || (Array.isArray(options.topPlayers) && options.topPlayers.length > 0);
          if (hasPriorContent) {
            // Os jogos por rodada iniciam OBRIGATORIAMENTE a partir da página 2 quando há classificação ou participantes
            pdf.addPage();
            y = 18;
          } else {
            y += 2;
          }

          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(15);
          pdf.setTextColor(30, 41, 59);
          pdf.text("Jogos por rodada", 105, y, { align: "center" });
          y += 8;

          const cardWidth = 166;
          const cardX = (210 - cardWidth) / 2; // 22mm (centralizado horizontalmente)

          roundsToRender.forEach((roundData) => {
            const { roundIdx, matches, bye } = roundData;
            const headerHeight = 7.5;
            const matchLineHeight = 6.2;
            const byeHeight = bye ? 5.5 : 0;
            const cardHeight = headerHeight + matches.length * matchLineHeight + byeHeight + 3.2;

            if (y + cardHeight > 280) {
              pdf.addPage();
              y = 18;
            }

            // Borda quadrada ao redor da rodada com cor mais escura
            pdf.setDrawColor(100, 116, 139);
            pdf.setLineWidth(0.45);
            pdf.setFillColor(255, 255, 255);
            pdf.rect(cardX, y, cardWidth, cardHeight, "FD");

            // Divisória do cabeçalho da rodada com a mesma cor de fundo branco
            pdf.line(cardX, y + headerHeight, cardX + cardWidth, y + headerHeight);
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(10);
            pdf.setTextColor(30, 41, 59);
            pdf.text(`Rodada ${roundIdx + 1}`, 105, y + 5.2, { align: "center" });

            // Jogos com o nome dos times mais separados do centro
            let currentMatchY = y + headerHeight + 4.7;
            matches.forEach(({ home, away, scoreStr }) => {
              // Mandante afastado do centro, alinhado à direita
              pdf.setFont("helvetica", "normal");
              pdf.setFontSize(9);
              pdf.setTextColor(30, 41, 59);
              const safeHome = pdf.splitTextToSize(String(home), 48)[0] || "";
              pdf.text(safeHome, 75, currentMatchY, { align: "right" });

              // Placar centralizado no centro (X=105mm)
              pdf.setFont("helvetica", "bold");
              pdf.setFontSize(9.5);
              pdf.setTextColor(30, 41, 59);
              pdf.text(scoreStr, 105, currentMatchY, { align: "center" });

              // Visitante afastado do centro, alinhado à esquerda
              pdf.setFont("helvetica", "normal");
              pdf.setFontSize(9);
              pdf.setTextColor(30, 41, 59);
              const safeAway = pdf.splitTextToSize(String(away), 48)[0] || "";
              pdf.text(safeAway, 135, currentMatchY, { align: "left" });

              currentMatchY += matchLineHeight;
            });

            if (bye) {
              pdf.setFont("helvetica", "italic");
              pdf.setFontSize(8.5);
              pdf.setTextColor(100, 116, 139);
              pdf.text(`Folga: ${bye}`, 105, currentMatchY - 0.5, { align: "center" });
            }

            y += cardHeight + 5;
          });
        }
      }

      // 6. Geração do arquivo e download
      let fileName = formatVolleyPdfFileName(options.date || new Date());
      if (options.teamsOnly) {
        const pad = (n) => String(n).padStart(2, "0");
        const d = new Date(options.date || new Date());
        fileName = `Volei Hub - Times - ${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}h${pad(d.getMinutes())}.pdf`;
      }
      let file = null;
      try {
        file = new File([pdf.output("blob")], fileName, { type: "application/pdf" });
      } catch (_) {
        file = pdf.output("blob");
        if (file) file.name = fileName;
      }
      if (file) file._pdfOptions = options;

      return { pdf, file, fileName, options };
    } catch (err) {
      console.warn("Erro ao gerar PDF padronizado:", err);
      return { pdf: null, file: null, fileName: "" };
    }
  };
})();
