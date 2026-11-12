/**
 * Som do minigame do pato: música de batalha 8-bit + efeitos, tudo sintetizado na hora
 * com Web Audio (nenhum arquivo de áudio é baixado).
 *
 *  - Sequenciador agendado pelo próprio loop do jogo (`tick()` a cada quadro), com
 *    "lookahead" no relógio do AudioContext: sem setInterval/setTimeout.
 *  - Canais estilo console 8-bit: 2 pulsos (melodia/harmonia), triângulo (baixo),
 *    pulso fino (arpejo) e ruído (bateria).
 *  - Música: uma faixa por fase (`musicUrls[0]` = fase 1, `[1]` = 2º chefe, `[2]` = 3º chefe),
 *    cada uma em loop; ao trocar de fase a faixa atual some num fade e a nova começa do início
 *    (se duas fases usam a mesma URL, a música só continua).
 *    Fase sem faixa (ou que não carregou) usa a da fase anterior; se nenhuma carregar,
 *    entra a trilha 8-bit sintetizada, que ganha camadas a cada fase.
 *  - Cada arma tem um som próprio (nave, ovos do mecha, laser do pato, olhos-laser,
 *    esferas do núcleo, bolhas da piranha, faíscas do drone...).
 */

const BPM = 152;
const STEP = 60 / BPM / 4; // semicolcheia

const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const freq = (name) => {
  const m = /^([A-G][#b]?)(\d)$/.exec(name);
  const midi = (Number(m[2]) + 1) * 12 + NOTE[m[1]];
  return 440 * 2 ** ((midi - 69) / 12);
};
/** "D5:4 A4:2 -:2" -> lista de [nota|null, duração em semicolcheias] */
const seq = (s) => s.trim().split(/\s+/).map((t) => {
  const [n, d] = t.split(':');
  return [n === '-' ? null : n, Number(d)];
});

/* ---------- trilha: "Batalha do Doutor Insano" (ré menor, 152 bpm) ---------- */
// cada compasso = 16 semicolcheias; acordes por compasso (fundamental do baixo + tríade do arpejo)
const CHORDS = {
  Dm: ['D2', ['D4', 'F4', 'A4']],
  Bb: ['Bb1', ['Bb3', 'D4', 'F4']],
  C: ['C2', ['C4', 'E4', 'G4']],
  A: ['A1', ['A3', 'C#4', 'E4']],
  Gm: ['G1', ['G3', 'Bb3', 'D4']],
  F: ['F1', ['F3', 'A3', 'C4']],
};
const SECTIONS = {
  A: {
    chords: ['Dm', 'Bb', 'C', 'A'],
    lead: seq('D5:4 A4:2 D5:2 F5:4 E5:2 D5:2  F5:6 G5:2 F5:2 E5:2 D5:4  E5:4 C5:2 E5:2 G5:4 F5:2 E5:2  C#5:6 D5:2 E5:8'),
  },
  A2: {
    chords: ['Dm', 'Bb', 'C', 'A'],
    lead: seq('D5:4 A4:2 D5:2 F5:4 E5:2 D5:2  F5:6 G5:2 F5:2 E5:2 D5:4  E5:4 C5:2 E5:2 G5:4 F5:2 E5:2  A5:4 G5:2 F5:2 E5:4 C#5:4'),
  },
  B: {
    chords: ['Gm', 'Dm', 'Bb', 'A'],
    lead: seq('G5:4 A5:2 Bb5:2 A5:4 G5:4  F5:4 E5:2 F5:2 D5:8  D5:2 F5:2 Bb5:4 A5:2 G5:2 F5:4  E5:4 F5:2 G5:2 A5:8'),
  },
  C: {
    // ponte grave e tensa (só toca a partir da fase 2)
    chords: ['Bb', 'C', 'Dm', 'A'],
    lead: seq('F4:2 -:2 F4:2 G4:2 A4:4 Bb4:4  G4:2 -:2 G4:2 A4:2 Bb4:4 C5:4  D5:2 C5:2 A4:2 D5:2 F5:4 E5:2 D5:2  C#5:4 E5:4 A5:8'),
  },
};
const SONG = ['A', 'A2', 'B', 'A', 'C', 'A2'];

/* ---------- formas de onda de pulso (duty 12,5% / 25%) ---------- */
function pulseWave(ctx, duty) {
  const n = 40;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  for (let k = 1; k < n; k++) {
    real[k] = (2 / (k * Math.PI)) * Math.sin(2 * Math.PI * k * duty);
    imag[k] = (2 / (k * Math.PI)) * (1 - Math.cos(2 * Math.PI * k * duty));
  }
  return ctx.createPeriodicWave(real, imag);
}

export function createDuckAudio({ muted = false, musicUrls = [] } = {}) {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  let ctx;
  try {
    ctx = new AC();
  } catch {
    return null;
  }
  const master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.42;
  const comp = ctx.createDynamicsCompressor(); // evita estourar quando tudo toca junto
  comp.threshold.value = -14;
  comp.ratio.value = 4;
  master.connect(comp).connect(ctx.destination);
  const musicBus = ctx.createGain();
  musicBus.gain.value = 0.55;
  musicBus.connect(master);
  const sfxBus = ctx.createGain();
  sfxBus.gain.value = 0.9;
  sfxBus.connect(master);

  const P12 = pulseWave(ctx, 0.125);
  const P25 = pulseWave(ctx, 0.25);
  const noiseBuf = (() => {
    const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  })();

  /* ---------- vozes básicas ---------- */
  function osc(type, out, t, dur, f0, f1, vol, { attack = 0.004, curve = 'exp', vib = 0 } = {}) {
    const o = ctx.createOscillator();
    if (type === 'p12') o.setPeriodicWave(P12);
    else if (type === 'p25') o.setPeriodicWave(P25);
    else o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) {
      if (curve === 'exp') o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
      else o.frequency.linearRampToValueAtTime(f1, t + dur);
    }
    if (vib) {
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      lfo.frequency.value = vib;
      lg.gain.value = f0 * 0.03;
      lfo.connect(lg).connect(o.frequency);
      lfo.start(t);
      lfo.stop(t + dur + 0.05);
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  function noise(out, t, dur, vol, { type = 'bandpass', f0 = 2000, f1 = 0, q = 0.8, attack = 0.002 } = {}) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    s.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    if (f1) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(out);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.02);
  }

  /* ---------- música em arquivo (stream pelo <audio>, sem decodificar tudo na memória) ---------- */
  // uma faixa por fase; cada uma com seu ganho para trocar com crossfade
  const byUrl = new Map(); // mesma URL em duas fases = mesma faixa (continua tocando sem recomeçar)
  const tracks = musicUrls.map((url) => {
    if (!url) return null;
    if (byUrl.has(url)) return byUrl.get(url);
    try {
      const el = new Audio();
      el.preload = 'auto'; // as dos chefes já baixam no início, para a troca de fase não engasgar
      el.loop = true; // acabou, recomeça do início
      el.src = url;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      ctx.createMediaElementSource(el).connect(gain).connect(musicBus); // passa pelo mudo e pelo compressor
      const tr = { el, gain, ok: true };
      el.addEventListener('error', () => {
        tr.ok = false;
        if (tr === track) pickTrack(); // não carregou: cai para a faixa anterior ou para a sintetizada
      });
      byUrl.set(url, tr);
      return tr;
    } catch {
      return null;
    }
  });
  let track = null; // faixa tocando agora
  let useTrack = tracks.some(Boolean);
  let wantMusic = false;
  let starting = false;
  const playTrack = () => {
    if (!track || !useTrack || !wantMusic || starting || ctx.state !== 'running' || !track.el.paused) return;
    starting = true;
    track.el.play().then(
      () => (starting = false),
      () => (starting = false),
    );
  };
  /** pausa a faixa depois de um fade (contado pelo relógio do áudio, sem setTimeout) */
  const fadeOutTrack = (tr, fade) => {
    const t = ctx.currentTime;
    tr.gain.gain.cancelScheduledValues(t);
    tr.gain.gain.setValueAtTime(tr.gain.gain.value, t);
    tr.gain.gain.linearRampToValueAtTime(0.0001, t + fade);
    if (tr.el.paused) return;
    const stopAt = t + fade;
    const check = () => {
      if (tr === track && wantMusic) return; // voltou a ser a faixa atual
      if (ctx.currentTime >= stopAt || ctx.state !== 'running') tr.el.pause();
      else requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  };
  /** escolhe a faixa da fase atual (ou a da fase anterior mais próxima que carregou) */
  function pickTrack() {
    let next = null;
    for (let i = Math.min(layer, tracks.length) - 1; i >= 0 && !next; i--) if (tracks[i]?.ok) next = tracks[i];
    if (next === track) return;
    const prev = track;
    track = next;
    if (prev) fadeOutTrack(prev, 0.4);
    if (!track) {
      useTrack = false;
      if (wantMusic) startSynth();
      return;
    }
    useTrack = true;
    playing = false; // se a sintetizada estava tocando, para
    track.el.currentTime = 0; // cada música começa do início
    const t = ctx.currentTime;
    track.gain.gain.cancelScheduledValues(t);
    track.gain.gain.setValueAtTime(0.0001, t);
    track.gain.gain.linearRampToValueAtTime(1, t + (prev ? 0.25 : 0.05));
    playTrack();
  }

  /* ---------- música sintetizada (reserva) ---------- */
  let playing = false;
  let layer = 1; // 1 = fase 1, 2 = fase 2, 3 = Doutor Insano
  let nextT = 0;
  let songPos = 0; // índice em SONG
  let step = 0; // 0..63 dentro da seção
  let leadIdx = 0;
  let leadLeft = 0;

  function scheduleStep(t) {
    const sec = SECTIONS[SONG[songPos]];
    const bar = Math.floor(step / 16);
    const s16 = step % 16;
    const [root, triad] = CHORDS[sec.chords[bar]];
    const rootF = freq(root);

    // baixo (triângulo): colcheias alternando oitava, galope na fase 3
    if (s16 % 2 === 0 || (layer >= 3 && s16 % 4 === 3)) {
      const up = (s16 / 2) % 2 === 1;
      osc('triangle', musicBus, t, STEP * 1.7, up ? rootF * 2 : rootF, 0, 0.5, { attack: 0.002 });
    }
    // bateria (ruído + bumbo senoidal)
    const kick = s16 === 0 || s16 === 8 || (layer >= 2 && s16 === 10) || (layer >= 3 && s16 === 14);
    if (kick) osc('sine', musicBus, t, 0.16, 150, 40, 0.75);
    if (s16 === 4 || s16 === 12) noise(musicBus, t, 0.14, 0.32, { f0: 1800, q: 0.6 });
    if (s16 % (layer >= 3 ? 1 : 2) === 0) noise(musicBus, t, 0.035, s16 % 4 === 2 ? 0.12 : 0.07, { type: 'highpass', f0: 7000 });
    // arpejo (pulso fino) a partir da fase 2
    if (layer >= 2) {
      const n = triad[s16 % 3];
      osc('p12', musicBus, t, STEP * 0.9, freq(n) * (layer >= 3 && bar % 2 ? 2 : 1), 0, 0.07);
    }
    // melodia (pulso 25%) + eco/harmonia na fase 3
    if (leadLeft <= 0) {
      const ev = sec.lead[leadIdx];
      if (ev) {
        const [note, len] = ev;
        if (note) {
          const f = freq(note);
          const dur = len * STEP * 0.92;
          osc('p25', musicBus, t, dur, f, 0, 0.16, { attack: 0.006, vib: len >= 6 ? 6 : 0 });
          if (layer >= 3) osc('square', musicBus, t, dur, f / 2, 0, 0.05); // dobra uma oitava abaixo
          if (layer >= 2) osc('p12', musicBus, t + STEP * 1.5, dur * 0.8, f, 0, 0.035); // eco
        }
        leadLeft = len;
        leadIdx++;
      }
    }
    leadLeft--;

    step++;
    if (step >= 64) {
      step = 0;
      leadIdx = 0;
      leadLeft = 0;
      do {
        songPos = (songPos + 1) % SONG.length;
      } while (SONG[songPos] === 'C' && layer < 2); // a ponte só entra com a batalha esquentando
    }
  }

  function tick() {
    if (!playing || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    if (nextT < now - 0.2) nextT = now + 0.05; // voltou de pausa: não tenta "recuperar" notas perdidas
    while (nextT < now + 0.12) {
      scheduleStep(nextT);
      nextT += STEP;
    }
  }

  /* ---------- efeitos ---------- */
  const lastAt = {};
  const throttle = (name, gap) => {
    const now = ctx.currentTime;
    if (lastAt[name] && now - lastAt[name] < gap) return false;
    lastAt[name] = now;
    return true;
  };
  let flip = false;

  const FX = {
    // nave do jogador: "piu" curto e agudo, alternando o tom
    shoot(t) {
      flip = !flip;
      osc('p25', sfxBus, t, 0.07, flip ? 1500 : 1320, 520, 0.09);
    },
    // tiro acertou o chefe: estalo metálico curtinho
    hit(t) {
      if (!throttle('hit', 0.06)) return;
      osc('square', sfxBus, t, 0.035, 240, 160, 0.06);
    },
    // escudo bloqueou
    shield(t) {
      if (!throttle('shield', 0.08)) return;
      osc('triangle', sfxBus, t, 0.12, 1900, 1500, 0.12);
      osc('sine', sfxBus, t, 0.12, 2850, 2300, 0.05);
    },
    // Mecha Pato: ovos de chocolate ("ploc" grave)
    egg(t) {
      if (!throttle('egg', 0.07)) return;
      osc('triangle', sfxBus, t, 0.14, 300, 90, 0.35);
      noise(sfxBus, t, 0.05, 0.08, { f0: 900 });
    },
    // pato na prancha: laser fino descendente
    duckLaser(t) {
      if (!throttle('duckLaser', 0.05)) return;
      osc('sawtooth', sfxBus, t, 0.13, 1700, 260, 0.08);
    },
    // anel de disparos: varredura subindo
    ring(t) {
      osc('p12', sfxBus, t, 0.35, 180, 1100, 0.12);
      noise(sfxBus, t, 0.3, 0.06, { f0: 600, f1: 4000 });
    },
    // investida (dash) do mecha / do pato
    dash(t) {
      noise(sfxBus, t, 0.45, 0.22, { f0: 300, f1: 2600, q: 1.2 });
      osc('sawtooth', sfxBus, t, 0.4, 70, 140, 0.12);
    },
    // lacaio aparece
    minion(t) {
      if (!throttle('minion', 0.05)) return;
      osc('square', sfxBus, t, 0.06, 900, 1400, 0.05);
    },
    // inimigo pequeno destruído
    pop(t) {
      if (!throttle('pop', 0.04)) return;
      noise(sfxBus, t, 0.2, 0.22, { type: 'lowpass', f0: 3500, f1: 300 });
      osc('square', sfxBus, t, 0.1, 400, 90, 0.07);
    },
    // explosão grande
    explode(t) {
      if (!throttle('explode', 0.09)) return;
      noise(sfxBus, t, 0.9, 0.5, { type: 'lowpass', f0: 2400, f1: 80, q: 0.5 });
      osc('sine', sfxBus, t, 0.7, 110, 30, 0.6);
    },
    // jogador atingido
    playerHit(t) {
      osc('square', sfxBus, t, 0.28, 520, 70, 0.16);
      noise(sfxBus, t, 0.18, 0.18, { f0: 1200, f1: 300 });
    },
    // Doutor Insano: carregando os olhos-laser
    eyeCharge(t) {
      osc('sawtooth', sfxBus, t, 0.85, 160, 1400, 0.09, { curve: 'exp', attack: 0.3 });
      osc('sine', sfxBus, t, 0.85, 320, 2800, 0.05, { attack: 0.3 });
    },
    // Doutor Insano: raio contínuo dos olhos (zumbido grosso)
    eyeBeam(t, dur = 1.6) {
      osc('sawtooth', sfxBus, t, dur, 98, 92, 0.13, { attack: 0.02, curve: 'lin', vib: 9 });
      osc('sawtooth', sfxBus, t, dur, 101, 96, 0.1, { attack: 0.02, curve: 'lin' });
      noise(sfxBus, t, dur, 0.09, { type: 'highpass', f0: 3000, attack: 0.02 });
    },
    // Doutor Insano: rajada curta dos olhos
    eyeBolt(t) {
      if (!throttle('eyeBolt', 0.05)) return;
      osc('sawtooth', sfxBus, t, 0.09, 2400, 700, 0.08);
      osc('square', sfxBus, t, 0.06, 1200, 500, 0.04);
    },
    // núcleo do pato: esferas de energia ("buuum" redondo)
    orb(t) {
      if (!throttle('orb', 0.07)) return;
      osc('sine', sfxBus, t, 0.22, 420, 120, 0.22);
      osc('p12', sfxBus, t, 0.12, 840, 300, 0.04);
    },
    // esfera grande que se divide
    bigOrb(t) {
      osc('sine', sfxBus, t, 0.6, 90, 260, 0.35, { vib: 14 });
      osc('triangle', sfxBus, t, 0.6, 180, 520, 0.12);
    },
    // soco-foguete: aviso (motor enchendo)
    punchWind(t) {
      noise(sfxBus, t, 0.55, 0.2, { f0: 200, f1: 1800, q: 2 });
      osc('square', sfxBus, t, 0.55, 55, 110, 0.1, { curve: 'lin' });
    },
    // soco-foguete: disparo
    punch(t) {
      noise(sfxBus, t, 0.5, 0.35, { f0: 2400, f1: 200, q: 0.7 });
      osc('sawtooth', sfxBus, t, 0.45, 160, 45, 0.22);
    },
    // piranha-robô: bolhas
    bubble(t) {
      if (!throttle('bubble', 0.06)) return;
      osc('sine', sfxBus, t, 0.09, 380, 1100, 0.18);
      osc('sine', sfxBus, t + 0.05, 0.07, 520, 1300, 0.1);
    },
    // drone-garra: faísca elétrica
    bolt(t) {
      if (!throttle('bolt', 0.06)) return;
      osc('square', sfxBus, t, 0.07, 2600, 1300, 0.05);
      noise(sfxBus, t, 0.05, 0.1, { type: 'highpass', f0: 5000 });
    },
    // inimigo grande chega
    bigEnemy(t) {
      osc('p25', sfxBus, t, 0.25, 220, 330, 0.08);
      osc('p25', sfxBus, t + 0.12, 0.25, 330, 440, 0.08);
    },
    // gargalhada do Doutor Insano: "HA-HA-HA-HA" em pulsos com formante
    laugh(t) {
      for (let i = 0; i < 7; i++) {
        const tt = t + i * 0.13;
        const f = 260 - i * 14;
        const o = ctx.createOscillator();
        o.setPeriodicWave(P25);
        o.frequency.setValueAtTime(f * 1.15, tt);
        o.frequency.exponentialRampToValueAtTime(f, tt + 0.1);
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 900;
        bp.Q.value = 2;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, tt);
        g.gain.linearRampToValueAtTime(0.5, tt + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.11);
        o.connect(bp).connect(g).connect(sfxBus);
        o.start(tt);
        o.stop(tt + 0.13);
      }
    },
    // tremor e o chefe se erguendo
    rise(t) {
      noise(sfxBus, t, 2.6, 0.3, { type: 'lowpass', f0: 160, q: 0.4, attack: 0.6 });
      osc('sawtooth', sfxBus, t, 2.6, 40, 80, 0.12, { attack: 0.8, curve: 'lin' });
    },
    // pato caindo (apito descendo)
    fall(t) {
      osc('square', sfxBus, t, 1.1, 1400, 120, 0.08, { curve: 'exp' });
    },
    // conserto da nave (+HP)
    // coração coletado (+1 HP): duas notas subindo, brilhantes
    heart(t) {
      osc('p25', sfxBus, t, 0.1, freq('E6'), 0, 0.12);
      osc('p25', sfxBus, t + 0.08, 0.18, freq('B6'), 0, 0.12);
      osc('triangle', sfxBus, t, 0.26, freq('E5'), 0, 0.2);
    },
    heal(t) {
      ['C5', 'E5', 'G5', 'C6'].forEach((n, i) => osc('p25', sfxBus, t + i * 0.07, 0.12, freq(n), 0, 0.1));
    },
    // vidro do aquário quebrando
    shatter(t) {
      noise(sfxBus, t, 0.5, 0.3, { type: 'highpass', f0: 4000, q: 1 });
      for (let i = 0; i < 6; i++) osc('triangle', sfxBus, t + i * 0.04, 0.15, 3000 + Math.random() * 2000, 1500, 0.05);
    },
    victory(t) {
      seq('C5:2 E5:2 G5:2 C6:4 G5:2 C6:8').reduce((acc, [n, d]) => {
        osc('p25', sfxBus, acc, d * 0.09, freq(n), 0, 0.14);
        osc('triangle', sfxBus, acc, d * 0.09, freq(n) / 2, 0, 0.3);
        return acc + d * 0.09;
      }, t);
    },
    defeat(t) {
      seq('A4:3 G#4:3 G4:3 F#4:9').reduce((acc, [n, d]) => {
        osc('p25', sfxBus, acc, d * 0.11, freq(n), 0, 0.13, { vib: d > 4 ? 7 : 0 });
        return acc + d * 0.11;
      }, t);
    },
  };

  function startSynth() {
    playing = true;
    songPos = 0;
    step = 0;
    leadIdx = 0;
    leadLeft = 0;
    nextT = ctx.currentTime + 0.08;
  }

  let isMuted = muted;
  const api = {
    play(name, ...args) {
      if (isMuted || ctx.state !== 'running' || !FX[name]) return;
      FX[name](ctx.currentTime + 0.005, ...args);
    },
    startMusic() {
      wantMusic = true;
      musicBus.gain.cancelScheduledValues(ctx.currentTime);
      musicBus.gain.setValueAtTime(useTrack ? 0.6 : 0.55, ctx.currentTime);
      if (tracks.some((tr) => tr?.ok)) {
        const cur = track;
        track = null;
        if (cur) fadeOutTrack(cur, 0.01);
        pickTrack();
        if (track) return;
      }
      startSynth();
    },
    stopMusic(fade = 0.6) {
      wantMusic = false;
      playing = false;
      const t = ctx.currentTime;
      musicBus.gain.cancelScheduledValues(t);
      musicBus.gain.setValueAtTime(musicBus.gain.value, t);
      musicBus.gain.linearRampToValueAtTime(0.0001, t + fade);
      if (track) fadeOutTrack(track, fade);
    },
    setLayer(n) {
      if (n === layer) return;
      layer = n;
      if (wantMusic) pickTrack(); // novo chefe, nova música
    },
    tick() {
      if (useTrack) playTrack(); // garante que a faixa volte depois de um desbloqueio/pausa
      else tick();
    },
    // (a trilha sintetizada é iniciada por startSynth)
    get muted() {
      return isMuted;
    },
    setMuted(m) {
      isMuted = m;
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setTargetAtTime(m ? 0 : 0.42, t, 0.03);
    },
    /** navegadores só liberam o som depois de um gesto: chamar em pointerdown/keydown */
    unlock() {
      if (ctx.state === 'suspended') ctx.resume().then(playTrack, () => {});
      else playTrack();
    },
    pause() {
      track?.el.pause();
      if (ctx.state === 'running') ctx.suspend().catch(() => {});
    },
    resume() {
      if (ctx.state === 'suspended') ctx.resume().then(playTrack, () => {});
    },
    close() {
      playing = false;
      wantMusic = false;
      tracks.forEach((tr) => {
        if (!tr) return;
        tr.el.pause();
        tr.el.removeAttribute('src'); // libera o download/stream
        tr.el.load();
      });
      ctx.close().catch(() => {});
    },
  };
  api.unlock();
  return api;
}
