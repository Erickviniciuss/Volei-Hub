/**
 * bluetooth-printer.js
 * Integração Nativa Web Bluetooth com Impressoras Térmicas Portáteis (ESC/POS & BLE)
 * Suporte completo a MY-7779 (Fun Print), Cat Printers, POS-58, Goojprt, MPT e compatíveis.
 */
(function () {
  'use strict';

  // UUIDs de serviços comuns em impressoras térmicas Bluetooth BLE
  const KNOWN_SERVICES = [
    'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Fun Print / WalkPrint / MY-7779 / Cat Printer
    '000018f0-0000-1000-8000-00805f9b34fb', // Standard POS BLE Printer
    '0000ae30-0000-1000-8000-00805f9b34fb', // Generic POS-58 BLE
    '0000ff00-0000-1000-8000-00805f9b34fb', // Common BLE UART
    '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Transparent UART
    '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service (NUS)
    '0000fee7-0000-1000-8000-00805f9b34fb', // Tencent / Custom BLE
    '0000af30-0000-1000-8000-00805f9b34fb',
    '0000e7ff-0000-1000-8000-00805f9b34fb'
  ];

  // Helper para normalização de acentos em português para compatibilidade com impressoras térmicas
  function cleanPtText(str) {
    if (!str) return '';
    return String(str)
      .replace(/[áàâãä]/gi, 'a')
      .replace(/[éèêë]/gi, 'e')
      .replace(/[íìîï]/gi, 'i')
      .replace(/[óòôõö]/gi, 'o')
      .replace(/[úùûü]/gi, 'u')
      .replace(/[ç]/gi, 'c')
      .replace(/[ñ]/gi, 'n')
      .replace(/[º°]/g, 'o.')
      .replace(/[ª]/g, 'a.')
      .replace(/[×✕]/g, 'x')
      .replace(/[•]/g, '-')
      .replace(/[^\x20-\x7E\n\r\t]/g, ' '); // Mantém apenas ASCII imprimível seguro
  }

  // Builder ESC/POS
  class EscPosBuilder {
    constructor(paperWidth = 58) {
      this.paperWidth = paperWidth;
      this.maxCols = paperWidth >= 80 ? 48 : 32;
      this.buffer = [];
      this.init();
    }

    init() {
      // ESC @ (Reset/Init)
      this.buffer.push(0x1b, 0x40);
      return this;
    }

    align(mode = 'left') {
      // ESC a n (0=Left, 1=Center, 2=Right)
      const val = mode === 'center' ? 1 : mode === 'right' ? 2 : 0;
      this.buffer.push(0x1b, 0x61, val);
      return this;
    }

    bold(enable = true) {
      // ESC E n
      this.buffer.push(0x1b, 0x45, enable ? 1 : 0);
      return this;
    }

    size(large = false) {
      // GS ! n (0=Normal, 0x11=Double Width & Height)
      this.buffer.push(0x1d, 0x21, large ? 0x11 : 0x00);
      return this;
    }

    text(str) {
      const clean = cleanPtText(str);
      for (let i = 0; i < clean.length; i++) {
        this.buffer.push(clean.charCodeAt(i));
      }
      return this;
    }

    line(str = '') {
      if (str) this.text(str);
      this.buffer.push(0x0a);
      return this;
    }

    divider(char = '-') {
      this.align('center');
      this.line(char.repeat(this.maxCols));
      this.align('left');
      return this;
    }

    row(left, right) {
      const l = cleanPtText(left);
      const r = cleanPtText(right);
      const space = Math.max(1, this.maxCols - l.length - r.length);
      this.line(l + ' '.repeat(space) + r);
      return this;
    }

    feed(lines = 3) {
      // ESC d n
      this.buffer.push(0x1b, 0x64, Math.max(1, Math.min(10, lines)));
      return this;
    }

    cut() {
      // GS V 66 0 (Corte parcial com avanço)
      this.buffer.push(0x1d, 0x56, 0x42, 0x00);
      return this;
    }

    // Raster Monochrome Bit Image (GS v 0) a partir de um Canvas
    rasterCanvas(canvas) {
      if (!canvas) return this;
      const ctx = canvas.getContext('2d');
      const targetW = this.paperWidth >= 80 ? 576 : 384;
      const scale = targetW / canvas.width;
      const targetH = Math.round(canvas.height * scale);

      // Canvas redimensionado em escala exata da cabeça térmica
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = targetW;
      tempCanvas.height = targetH;
      const tCtx = tempCanvas.getContext('2d');
      tCtx.fillStyle = '#ffffff';
      tCtx.fillRect(0, 0, targetW, targetH);
      tCtx.drawImage(canvas, 0, 0, targetW, targetH);

      const imgData = tCtx.getImageData(0, 0, targetW, targetH);
      const pixels = imgData.data;
      const widthBytes = Math.ceil(targetW / 8);

      // GS v 0 0 xL xH yL yH
      const xL = widthBytes & 0xff;
      const xH = (widthBytes >> 8) & 0xff;
      const yL = targetH & 0xff;
      const yH = (targetH >> 8) & 0xff;

      this.align('center');
      this.buffer.push(0x1d, 0x76, 0x30, 0x00, xL, xH, yL, yH);

      for (let y = 0; y < targetH; y++) {
        for (let b = 0; b < widthBytes; b++) {
          let byteVal = 0;
          for (let bit = 0; bit < 8; bit++) {
            const x = b * 8 + bit;
            if (x < targetW) {
              const idx = (y * targetW + x) * 4;
              // Luminância (0 a 255)
              const lum = pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114;
              // Ponto preto se luminância < 155
              if (lum < 155) {
                byteVal |= (0x80 >> bit);
              }
            }
          }
          this.buffer.push(byteVal);
        }
      }
      this.feed(2);
      return this;
    }

    toBytes() {
      return new Uint8Array(this.buffer);
    }
  }

  // Gerenciador Principal de Conexão Bluetooth
  class BluetoothPrinterManager {
    constructor() {
      this.device = null;
      this.server = null;
      this.characteristic = null;
      this.isConnecting = false;
      this.listeners = new Set();

      this._loadSavedSettings();
    }

    _loadSavedSettings() {
      try {
        const raw = localStorage.getItem('volei_hub_bt_printer_settings');
        this.settings = raw ? JSON.parse(raw) : { paperWidth: 58, printMode: 'escpos', lineFeed: 4 };
      } catch (_) {
        this.settings = { paperWidth: 58, printMode: 'escpos', lineFeed: 4 };
      }
    }

    saveSettings(newSettings = {}) {
      this.settings = { ...this.settings, ...newSettings };
      try {
        localStorage.setItem('volei_hub_bt_printer_settings', JSON.stringify(this.settings));
      } catch (_) {}
      this._emitStatus();
    }

    isSupported() {
      return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
    }

    isConnected() {
      return Boolean(this.device && this.device.gatt?.connected && this.characteristic);
    }

    getDeviceName() {
      if (this.isConnected()) return this.device.name || 'Impressora Bluetooth';
      const saved = this.getSavedDevice();
      return saved ? saved.name : null;
    }

    getSavedDevice() {
      try {
        const raw = localStorage.getItem('volei_hub_bt_printer');
        return raw ? JSON.parse(raw) : null;
      } catch (_) {
        return null;
      }
    }

    onStatusChange(fn) {
      if (typeof fn === 'function') {
        this.listeners.add(fn);
        fn(this.getStatus());
      }
      return () => this.listeners.delete(fn);
    }

    _emitStatus() {
      const status = this.getStatus();
      this.listeners.forEach((fn) => {
        try { fn(status); } catch (_) {}
      });
    }

    getStatus() {
      return {
        supported: this.isSupported(),
        connected: this.isConnected(),
        deviceName: this.getDeviceName(),
        settings: { ...this.settings }
      };
    }

    async connect() {
      if (!this.isSupported()) {
        throw new Error('Seu navegador não suporta conexão Bluetooth direta. Use o Google Chrome, Edge ou Android.');
      }

      if (this.isConnected()) {
        return { ok: true, deviceName: this.getDeviceName() };
      }

      this.isConnecting = true;
      this._emitStatus();

      try {
        // Solicita ao usuário selecionar a impressora Bluetooth
        const device = await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: KNOWN_SERVICES
        });

        if (!device) throw new Error('Nenhuma impressora foi selecionada.');

        this.device = device;
        device.addEventListener('gattserverdisconnected', () => {
          this.characteristic = null;
          this.server = null;
          this._emitStatus();
        });

        // Conecta ao servidor GATT
        const server = await device.gatt.connect();
        this.server = server;

        // Descoberta do serviço e característica gravável
        const characteristic = await this._findWritableCharacteristic(server);
        if (!characteristic) {
          throw new Error('A impressora foi conectada, mas não foi encontrada a porta de envio (característica gravável).');
        }

        this.characteristic = characteristic;

        // Salva informações do dispositivo para conveniência
        try {
          localStorage.setItem('volei_hub_bt_printer', JSON.stringify({
            id: device.id,
            name: device.name || 'Impressora Bluetooth'
          }));
        } catch (_) {}

        this.isConnecting = false;
        this._emitStatus();
        return { ok: true, deviceName: device.name || 'Impressora Térmica' };
      } catch (err) {
        this.isConnecting = false;
        this._emitStatus();
        if (err.name === 'NotFoundError') {
          throw new Error('Busca cancelada: nenhuma impressora selecionada.');
        }
        throw err;
      }
    }

    async _findWritableCharacteristic(server) {
      // 1. Tenta encontrar entre os serviços conhecidos de impressoras térmicas
      for (const serviceUuid of KNOWN_SERVICES) {
        try {
          const service = await server.getPrimaryService(serviceUuid);
          if (service) {
            const characteristics = await service.getCharacteristics();
            for (const char of characteristics) {
              if (char.properties.write || char.properties.writeWithoutResponse) {
                return char;
              }
            }
          }
        } catch (_) {
          // Continua para o próximo serviço conhecido
        }
      }

      // 2. Fallback universal: varre todos os serviços primários expostos pelo dispositivo
      try {
        const allServices = await server.getPrimaryServices();
        for (const service of allServices) {
          try {
            const characteristics = await service.getCharacteristics();
            for (const char of characteristics) {
              if (char.properties.write || char.properties.writeWithoutResponse) {
                return char;
              }
            }
          } catch (_) {}
        }
      } catch (_) {}

      return null;
    }

    async disconnect() {
      if (this.device && this.device.gatt?.connected) {
        try { this.device.gatt.disconnect(); } catch (_) {}
      }
      this.characteristic = null;
      this.server = null;
      this.device = null;
      try { localStorage.removeItem('volei_hub_bt_printer'); } catch (_) {}
      this._emitStatus();
    }

    // Envia dados brutos em pacotes (MTU chunking) para evitar estouro de buffer
    async sendRawData(uint8Data, onProgress) {
      if (!this.isConnected()) {
        await this.connect();
      }
      if (!this.characteristic) {
        throw new Error('Impressora não conectada ou canal de envio indisponível.');
      }

      // 64 bytes por pacote com 20ms de intervalo garante 100% de estabilidade na MY-7779 e POS-58
      const CHUNK_SIZE = 64;
      const total = uint8Data.length;
      let sent = 0;

      for (let offset = 0; offset < total; offset += CHUNK_SIZE) {
        const slice = uint8Data.slice(offset, offset + CHUNK_SIZE);
        try {
          if (this.characteristic.properties.writeWithoutResponse && typeof this.characteristic.writeValueWithoutResponse === 'function') {
            await this.characteristic.writeValueWithoutResponse(slice);
          } else if (typeof this.characteristic.writeValueWithResponse === 'function') {
            await this.characteristic.writeValueWithResponse(slice);
          } else {
            await this.characteristic.writeValue(slice);
          }
        } catch (err) {
          // Se falhou writeWithoutResponse, tenta write padrão
          try {
            await this.characteristic.writeValue(slice);
          } catch (retryErr) {
            throw new Error(`Erro ao enviar pacote para impressora: ${retryErr.message || retryErr}`);
          }
        }

        sent += slice.length;
        if (typeof onProgress === 'function') {
          onProgress(Math.min(100, Math.round((sent / total) * 100)));
        }

        // Pequena pausa entre pacotes para processamento da cabeça térmica
        await new Promise((r) => setTimeout(r, 20));
      }

      return true;
    }

    // Imprime um cupom de teste para validar o alinhamento e contraste
    async printTestTicket() {
      const builder = new EscPosBuilder(this.settings.paperWidth);
      const now = new Date();

      builder
        .align('center')
        .size(true)
        .line('VOLEI HUB')
        .size(false)
        .line('TESTE DE IMPRESSAO')
        .line(now.toLocaleString('pt-BR'))
        .divider('=')
        .align('left')
        .bold(true)
        .line('Status da Conexao:')
        .bold(false)
        .line('• Bluetooth BLE: OK')
        .line(`• Dispositivo: ${cleanPtText(this.getDeviceName() || 'Padrao')}`)
        .line(`• Bobina: ${this.settings.paperWidth}mm (${builder.maxCols} colunas)`)
        .divider('-')
        .align('center')
        .bold(true)
        .line('TESTE DE COLUNAS')
        .bold(false)
        .align('left')
        .row('#  EQUIPE', 'V  D  PTS')
        .row('1  Equipe Ouro', '3  0    6')
        .row('2  Equipe Prata', '2  1    4')
        .row('3  Equipe Bronze', '1  2    2')
        .divider('-')
        .align('center')
        .line('Volei Hub - 100% Pronto!')
        .feed(this.settings.lineFeed || 4)
        .cut();

      return this.sendRawData(builder.toBytes());
    }

    // Constrói e imprime o cupom nativo a partir dos dados do jogo/PDF
    async printTicketFromOptions(options = {}, onProgress) {
      if (!options || typeof options !== 'object') {
        throw new Error('Dados do cupom não informados.');
      }

      // Se a preferência for Gráfico Completo e existir canvas/gerador
      if (this.settings.printMode === 'raster' && typeof window.buildVolleyCupomImage === 'function') {
        const res = await window.buildVolleyCupomImage(options);
        if (res?.canvas) {
          const builder = new EscPosBuilder(this.settings.paperWidth);
          builder.rasterCanvas(res.canvas);
          builder.feed(this.settings.lineFeed || 4).cut();
          return this.sendRawData(builder.toBytes(), onProgress);
        }
      }

      // Modo ESC/POS Nativo: máxima nitidez, texto preto denso, tabelas perfeitamente alinhadas
      const builder = new EscPosBuilder(this.settings.paperWidth);
      const title = options.title || 'VOLEI HUB';
      const subtitle = options.subtitle || '';
      let dateVal = new Date(options.date || Date.now());
      if (isNaN(dateVal.getTime())) dateVal = new Date();

      // 1. Cabeçalho Principal
      builder
        .align('center')
        .size(true)
        .bold(true)
        .line('VOLEI HUB')
        .size(false)
        .bold(true)
        .line(cleanPtText(title.toUpperCase()))
        .bold(false);

      if (subtitle) {
        builder.line(cleanPtText(subtitle));
      }
      builder.line(`Data: ${dateVal.toLocaleString('pt-BR')}`);
      builder.divider('=');

      // 2. Equipes e Integrantes
      const rawTeams = options.teams?.length
        ? options.teams
        : (options.standings && options.standings.length > 0 ? options.standings.map((s) => s.name) : []);

      if (Array.isArray(rawTeams) && rawTeams.length > 0) {
        builder.align('center').bold(true).line('EQUIPES E INTEGRANTES').bold(false).divider('-');
        builder.align('left');

        rawTeams.forEach((teamName, teamIdx) => {
          let rawMembers = [];
          if (Array.isArray(options.players) && options.players[teamIdx]) {
            rawMembers = Array.isArray(options.players[teamIdx]) ? options.players[teamIdx] : [options.players[teamIdx]];
          }
          const cleanMembers = rawMembers
            .map((p) => String(p || '').trim())
            .filter((p) => p !== '' && p !== 'Vazio');

          builder.bold(true).line(`[ ${cleanPtText(teamName).toUpperCase()} ]`).bold(false);

          if (cleanMembers.length > 0) {
            cleanMembers.forEach((m) => {
              builder.line(` * ${cleanPtText(m)}`);
            });
          } else {
            builder.line('  (Sem integrantes informados)');
          }
          builder.line('');
        });
        builder.divider('-');
      }

      // 3. Classificação Final (se houver)
      if (!options.teamsOnly && Array.isArray(options.standings) && options.standings.length > 0) {
        const showSaldo = options.showPointsBalance !== false;
        builder.align('center').bold(true).line('CLASSIFICACAO FINAL').bold(false).divider('-');
        builder.align('left');

        if (showSaldo) {
          builder.row('# EQUIPE', 'V  D  SG  PTS');
          builder.line('-'.repeat(builder.maxCols));
          options.standings.forEach((st, idx) => {
            const pos = `${idx + 1}`;
            const name = cleanPtText(st.name || `Equipe ${idx + 1}`).substring(0, 14);
            const stats = `${String(st.wins || 0).padStart(2)} ${String(st.losses || 0).padStart(2)} ${String(st.setBalance ?? st.pointBalance ?? 0).padStart(3)} ${String(st.points || 0).padStart(4)}`;
            builder.row(`${pos} ${name}`, stats);
          });
        } else {
          builder.row('# EQUIPE', 'V  D  JOGOS');
          builder.line('-'.repeat(builder.maxCols));
          options.standings.forEach((st, idx) => {
            const pos = `${idx + 1}`;
            const name = cleanPtText(st.name || `Equipe ${idx + 1}`).substring(0, 16);
            const stats = `${String(st.wins || 0).padStart(2)} ${String(st.losses || 0).padStart(2)} ${String((st.wins || 0) + (st.losses || 0)).padStart(5)}`;
            builder.row(`${pos} ${name}`, stats);
          });
        }
        builder.divider('-');
      }

      // 4. Rodadas e Partidas (se houver)
      if (!options.teamsOnly && Array.isArray(options.schedule) && options.schedule.length > 0) {
        builder.align('center').bold(true).line('RODADAS DO JOGO').bold(false).divider('-');
        builder.align('left');

        options.schedule.forEach((round, rIdx) => {
          builder.bold(true).line(`RODADA ${rIdx + 1}`).bold(false);
          const matches = round.matches || [];
          matches.forEach(([home, away], mIdx) => {
            let scoreStr = 'vs';
            const key = `${rIdx}-${mIdx}`;
            if (options.scores) {
              let sc = null;
              if (options.scores instanceof Map) sc = options.scores.get(key);
              else if (typeof options.scores === 'object') sc = options.scores[key];
              if (Array.isArray(sc) && sc[0] !== '' && sc[1] !== '') {
                scoreStr = `${sc[0]} x ${sc[1]}`;
              }
            }
            builder.row(`${cleanPtText(home)} ${scoreStr}`, cleanPtText(away));
          });
          if (round.bye) {
            builder.line(` (Folga: ${cleanPtText(round.bye)})`);
          }
          builder.line('');
        });
        builder.divider('-');
      }

      // 5. Rodapé
      builder
        .align('center')
        .line('Volei Hub - RST Cipher')
        .line('www.voleihub.com')
        .feed(this.settings.lineFeed || 4)
        .cut();

      return this.sendRawData(builder.toBytes(), onProgress);
    }
  }

  // Instância global acessível em toda a aplicação
  window.bluetoothPrinter = new BluetoothPrinterManager();
  window.EscPosBuilder = EscPosBuilder;
})();
