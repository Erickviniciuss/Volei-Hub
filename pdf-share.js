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
            <h2>Enviar PDF</h2>
          </div>
          <button id="pdf-share-close" class="dialog-close" type="button" aria-label="Fechar">×</button>
        </header>

        <div class="pdf-share-file-info">
          <span class="pdf-file-icon" aria-hidden="true">📄</span>
          <div class="pdf-file-details">
            <strong id="pdf-share-filename">documento.pdf</strong>
            <small id="pdf-share-filesize">Documento PDF pronto para envio</small>
          </div>
        </div>

        <div class="pdf-share-options">
          <button id="pdf-opt-whatsapp" class="pdf-share-opt opt-whatsapp" type="button">
            <span class="pdf-opt-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.03-1.25-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.34-.76-1.84-.2-.49-.4-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.77 2.71 4.3 3.8 2.52 1.09 2.52.73 2.98.69.45-.04 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.07-.1-.23-.16-.48-.29"/>
              </svg>
            </span>
            <div class="pdf-opt-text">
              <strong>Enviar ou compartilhar no WhatsApp</strong>
              <small>Abre o WhatsApp com o resumo e baixa o PDF para anexar.</small>
            </div>
          </button>

          <button id="pdf-opt-device" class="pdf-share-opt opt-device" type="button">
            <span class="pdf-opt-icon" aria-hidden="true">↗</span>
            <div class="pdf-opt-text">
              <strong>Compartilhar no dispositivo</strong>
              <small>Usa o menu de compartilhamento do seu sistema.</small>
            </div>
          </button>

          <button id="pdf-opt-download" class="pdf-share-opt opt-download" type="button">
            <span class="pdf-opt-icon" aria-hidden="true">⬇</span>
            <div class="pdf-opt-text">
              <strong>Apenas Baixar PDF</strong>
              <small>Salva o arquivo diretamente no seu computador ou celular.</small>
            </div>
          </button>
        </div>

        <p id="pdf-share-feedback" class="pdf-share-feedback" hidden></p>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector("#pdf-share-close").addEventListener("click", closePdfModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closePdfModal();
    });

    return modal;
  }

  function closePdfModal() {
    const modal = document.querySelector("#pdf-share-modal");
    if (modal) {
      if (typeof modal.close === "function") modal.close();
      else modal.removeAttribute("open");
    }
  }

  function downloadPdfFile(file) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(file);
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 2000);
  }

  window.openPdfShareModal = function (options) {
    const { file, title = "Vôlei Hub - PDF", text = "", whatsappText = "" } = options;
    if (!file) return;

    const modal = getOrCreatePdfModal();
    const filenameEl = modal.querySelector("#pdf-share-filename");
    const filesizeEl = modal.querySelector("#pdf-share-filesize");
    const deviceBtn = modal.querySelector("#pdf-opt-device");
    const feedbackEl = modal.querySelector("#pdf-share-feedback");

    feedbackEl.hidden = true;
    feedbackEl.textContent = "";
    filenameEl.textContent = file.name;

    const sizeKb = Math.round(file.size / 1024);
    filesizeEl.textContent = sizeKb > 0 ? `${sizeKb} KB · Documento PDF pronto para envio` : "Documento PDF formatado";

    // Show device share button only if supported
    const canShareFiles = typeof navigator !== "undefined" && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
    deviceBtn.hidden = !canShareFiles && typeof navigator?.share !== "function";

    // WhatsApp action
    const whatsappBtn = modal.querySelector("#pdf-opt-whatsapp");
    whatsappBtn.onclick = async () => {
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile && canShareFiles) {
        try {
          await navigator.share({
            title: title,
            text: whatsappText || text,
            files: [file]
          });
          closePdfModal();
          return;
        } catch (err) {
          if (err.name === "AbortError") return;
        }
      }

      // Download PDF and open WhatsApp
      downloadPdfFile(file);
      const message = whatsappText || text || `${title}\n\nO PDF completo foi baixado no dispositivo para envio.`;
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
      window.open(waUrl, "_blank", "noopener,noreferrer");

      feedbackEl.textContent = "O PDF foi baixado! Agora basta anexá-lo na conversa do WhatsApp.";
      feedbackEl.className = "pdf-share-feedback is-info";
      feedbackEl.hidden = false;

      setTimeout(() => closePdfModal(), 2800);
    };

    // Device Share action
    deviceBtn.onclick = async () => {
      if (navigator.share) {
        try {
          const shareData = { title, text: text || title };
          if (canShareFiles) shareData.files = [file];
          await navigator.share(shareData);
          closePdfModal();
        } catch (err) {
          if (err.name !== "AbortError") {
            downloadPdfFile(file);
            closePdfModal();
          }
        }
      }
    };

    // Direct download action
    const downloadBtn = modal.querySelector("#pdf-opt-download");
    downloadBtn.onclick = () => {
      downloadPdfFile(file);
      closePdfModal();
    };

    if (typeof modal.showModal === "function") {
      modal.showModal();
    } else {
      modal.setAttribute("open", "");
    }
  };
})();
