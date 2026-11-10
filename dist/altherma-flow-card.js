/*
 * Altherma flow card — schemat Daikin Altherma 3 (ESPAltherma):
 * jednostka zewnętrzna, hydrobox (wymiennik, BUH, pompa, zawór 3-drogowy),
 * zasobnik CWU i pętla podłogówki z animowanym przepływem.
 * Użycie: type: custom:altherma-flow-card   (opcjonalnie: title, entities: {klucz: encja})
 */
const CARD_VERSION = "1.0.0";
const AFC_DEFAULTS = {
  outdoor: 'sensor.altherma_r1t_outdoor_air_temp',
  refrig: 'sensor.altherma_refrig_temp_liquid_side_r3t',
  lwt_before: 'sensor.altherma_leaving_water_temp_before_buh_r1t',
  lwt_after: 'sensor.altherma_leaving_water_temp_after_buh_r2t',
  inlet: 'sensor.altherma_inlet_water_temp_r4t',
  lw_setpoint: 'sensor.altherma_lw_setpoint_main',
  dhw_temp: 'sensor.altherma_dhw_tank_temp_r5t',
  dhw_setpoint: 'sensor.altherma_dhw_setpoint',
  room_temp: 'sensor.altherma_indoor_ambient_temp_r1t',
  room_setpoint: 'sensor.altherma_rt_setpoint',
  flow: 'sensor.altherma_flow_sensor_l_min',
  pressure: 'sensor.altherma_water_pressure',
  pump: 'sensor.water_pump_signal',
  cop: 'sensor.altherma_cop',
  cop_cool: 'sensor.altherma_cooling_cop_n',
  cop_daily: 'sensor.altherma_cop_dobowy',
  heat_power: 'sensor.altherma_moc_cieplna',
  elec_power: 'sensor.altherma_moc_elektryczna',
  heat_today: 'sensor.altherma_cieplo_dzis',
  elec_today: 'sensor.altherma_prad_dzis',
  buh1_today: 'sensor.altherma_buh1_czas_dzis',
  buh2_today: 'sensor.altherma_buh2_czas_dzis',
  bsh_today: 'sensor.altherma_bsh_czas_dzis',
  buh1_starts: 'sensor.altherma_buh1_starty_dzis',
  buh2_starts: 'sensor.altherma_buh2_starty_dzis',
  bsh_starts: 'sensor.altherma_bsh_starty_dzis',
  op_mode: 'sensor.altherma_operation_mode',
  iu_mode: 'sensor.altherma_i_u_operation_mode',
  compressor: 'binary_sensor.altherma_thermostat_on_off',
  current: 'sensor.altherma_inv_primary_current_a',
  fan1: 'sensor.altherma_fan_1_step',
  fan2: 'sensor.altherma_fan_2_step',
  defrost: 'binary_sensor.altherma_defrost_operation',
  buh1: 'binary_sensor.altherma_buh_step1',
  buh2: 'binary_sensor.altherma_buh_step2',
  bsh: 'binary_sensor.altherma_bsh',
  silent: 'binary_sensor.altherma_silent_mode',
  alarm: 'binary_sensor.altherma_alarm_output',
  connection: 'sensor.none_althermasensors',
};

const AFC_MODES = {
  'Heating': 'Grzanie', 'Cooling': 'Chłodzenie', 'DHW': 'CWU',
  'Heating + DHW': 'Grzanie + CWU', 'Cooling + DHW': 'Chłodzenie + CWU',
  'Fan Only': 'Postój', 'Stop': 'Stop', 'Auto': 'Auto',
};

const afcSeg = (cls, parts) =>
  `<g class="seg ${cls}">${parts.map(([k, d]) => `<path class="p ${k}" d="${d}"/>`).join('')}` +
  `${parts.map(([, d]) => `<path class="f" d="${d}"/>`).join('')}</g>`;

class AlthermaFlowCard extends HTMLElement {
  static getStubConfig() { return {}; }

  setConfig(config) {
    this._cfg = config || {};
    this._e = Object.assign({}, AFC_DEFAULTS, this._cfg.entities || {});
    if (this.shadowRoot) this._build();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._built) this._build();
    this._update();
  }

  getCardSize() { return 8; }
  getGridOptions() { return { columns: 12, min_columns: 6, max_columns: 12, rows: 'auto' }; }

  _build() {
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    const title = this._cfg.title || 'Daikin Altherma 3';
    this.shadowRoot.innerHTML = `
<style>
  :host { display:block; max-width:500px; margin:0 auto; }
  ha-card { padding:12px 12px 10px; overflow:hidden;
    --hot:#f06a3a; --mid:#f2a03d; --cold:#3d8fe0; --ref:#9b6ad6;
    --idle:var(--divider-color, rgba(127,127,127,.35)); }
  ha-card.cool { --hot:#3d9be9; --mid:#5fb8e8; --cold:#f0a050; }
  .head { display:flex; align-items:center; gap:8px; margin-bottom:6px; flex-wrap:wrap; }
  .title { font-size:16px; font-weight:500; flex:1; min-width:120px; }
  .tag { font-size:12px; padding:3px 10px; border-radius:12px; background:var(--secondary-background-color); cursor:pointer; white-space:nowrap; }
  .tag.heat { background:color-mix(in srgb, var(--hot) 18%, transparent); color:var(--hot); }
  .tag.dhw { background:rgba(61,143,224,.18); color:#3d8fe0; }
  .tag.warn { background:rgba(229,57,53,.2); color:#e53935; }
  .tag.off { opacity:.6; }
  .hide { display:none !important; }
  svg { width:100%; height:auto; display:block; }
  text { fill:var(--primary-text-color); font-family:inherit; paint-order:stroke;
    stroke:var(--ha-card-background, var(--card-background-color, #fff)); stroke-width:3px; stroke-linejoin:round; }
  .big { font-size:18px; font-weight:600; }
  .sm { font-size:11px; }
  .xs { font-size:9.5px; fill:var(--secondary-text-color); }
  .xs.v { fill:var(--primary-text-color); font-weight:500; }
  .clk { cursor:pointer; }
  .unit { fill:var(--secondary-background-color, rgba(127,127,127,.08)); stroke:var(--idle); stroke-width:1.2; }
  .p { fill:none; stroke-width:5; stroke-linecap:round; stroke-linejoin:round; stroke:var(--idle); transition:stroke .4s; }
  .ref .p { stroke-width:3; }
  .f { fill:none; stroke-width:1.6; stroke:rgba(255,255,255,.9); stroke-dasharray:3 9; stroke-linecap:round; opacity:0; }
  .act .p.hot { stroke:var(--hot); } .act .p.mid { stroke:var(--mid); } .act .p.cold { stroke:var(--cold); }
  .ref.act .p { stroke:var(--ref); }
  .act.run .f { opacity:1; animation:afcdash .9s linear infinite; }
  @keyframes afcdash { to { stroke-dashoffset:-12; } }
  .hex { fill:var(--card-background-color, #fff); stroke:var(--idle); stroke-width:1.2; }
  .hexz { fill:none; stroke:var(--ref); stroke-width:1.5; opacity:.6; }
  .buh rect { fill:var(--card-background-color, #fff); stroke:var(--idle); stroke-width:1.2; transition:fill .3s; }
  .buh.on rect { fill:rgba(229,57,53,.85); stroke:#e53935; }
  .buh.on text { fill:#fff; stroke:none; }
  .valve polygon { fill:var(--idle); transition:fill .3s; }
  .valve polygon.in { fill:var(--secondary-text-color); }
  .valve polygon.open { fill:var(--hot); }
  .valve.idle polygon.open { fill:var(--secondary-text-color); }
  .fanring { fill:none; stroke:var(--idle); stroke-width:1.2; }
  #fan path, #fan circle { fill:var(--secondary-text-color); }
  #fan.spin { animation:afcspin 1.4s linear infinite; transform-box:view-box; transform-origin:48px 140px; }
  #imp { transform-box:view-box; transform-origin:186px 270px; }
  #imp.spin { animation:afcspin 1s linear infinite; }
  #imp path { fill:var(--secondary-text-color); }
  .pumpc { fill:var(--card-background-color, #fff); stroke:var(--idle); stroke-width:1.5; }
  .pumpc.on { stroke:var(--cold); }
  @keyframes afcspin { to { transform:rotate(360deg); } }
  .tank { fill:none; stroke:var(--idle); stroke-width:1.5; }
  #tankfill, #floorbg { transition:fill .6s; }
  .defrost rect { fill:#3d8fe0; } .defrost text { fill:#fff; stroke:none; font-size:9px; font-weight:600; }
  .bsh { font-size:9.5px; font-weight:600; fill:var(--secondary-text-color); }
  .bsh.on { fill:#e53935; }
  .chips { display:grid; grid-template-columns:repeat(auto-fill, minmax(96px, 1fr)); gap:6px; margin-top:8px; }
  .chip { background:var(--secondary-background-color, rgba(127,127,127,.08)); border-radius:10px; padding:6px 8px; cursor:pointer; min-width:0; }
  .chip .l { font-size:11px; color:var(--secondary-text-color); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .chip .val { font-size:14px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .chip.warn { background:rgba(229,57,53,.15); } .chip.warn .val { color:#e53935; }
  .chip.on .val { color:var(--hot); }
  .chip .sub { font-size:11px; color:var(--secondary-text-color); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
</style>
<ha-card>
  <div class="head">
    <div class="title">${title}</div>
    <span class="tag hide" id="h-alarm" data-k="alarm">⚠ Alarm</span>
    <span class="tag hide" id="h-conn" data-k="connection">Offline</span>
    <span class="tag" id="h-mode" data-k="iu_mode">–</span>
  </div>
  <svg viewBox="0 0 420 300" role="img" aria-label="Schemat pompy ciepła">
    <defs><clipPath id="afc-tank"><rect x="300" y="18" width="70" height="132" rx="26"/></clipPath></defs>

    <!-- jednostka zewnętrzna -->
    <g class="clk" data-k="outdoor">
      <text x="48" y="62" class="xs" text-anchor="middle">Na zewnątrz</text>
      <text x="48" y="84" class="big" id="t-outdoor" text-anchor="middle">–</text>
    </g>
    <rect x="6" y="95" width="84" height="110" rx="10" class="unit"/>
    <circle cx="48" cy="140" r="27" class="fanring"/>
    <g id="fan" class="clk" data-k="fan1">
      <path d="M48 140 C40 128 42 116 48 113 C54 116 56 128 48 140Z"/>
      <path d="M48 140 C60 132 72 134 75 140 C72 146 60 148 48 140Z"/>
      <path d="M48 140 C56 152 54 164 48 167 C42 164 40 152 48 140Z"/>
      <path d="M48 140 C36 148 24 146 21 140 C24 134 36 132 48 140Z"/>
      <circle cx="48" cy="140" r="4"/>
    </g>
    <g class="defrost hide" id="g-defrost" data-k="defrost">
      <rect x="16" y="99" width="64" height="13" rx="6.5"/>
      <text x="48" y="108.5" text-anchor="middle">❄ DEFROST</text>
    </g>
    <g class="clk" data-k="compressor">
      <text x="48" y="184" class="sm" text-anchor="middle">Sprężarka</text>
      <text x="48" y="197" id="t-comp" class="xs v" text-anchor="middle"></text>
    </g>


    <!-- hydrobox -->
    <rect x="112" y="10" width="126" height="280" rx="10" class="unit"/>
    <text x="120" y="286" class="xs">Hydrobox</text>

    <!-- czynnik chłodniczy -->
    ${afcSeg('ref', [['', 'M90 118 H122'], ['', 'M122 182 H90']])}
    <g class="clk" data-k="refrig"><text x="48" y="222" class="xs" text-anchor="middle" id="t-refrig"></text></g>

    ${afcSeg('g-sup', [['hot', 'M135 100 V50 H160'], ['hot', 'M196 50 H206']])}
    ${afcSeg('g-dhw', [['hot', 'M222 50 H286 V74 H300'],
      ['mid', 'M300 74 H352 Q362 74 362 81 Q362 88 352 88 H318 Q308 88 308 95 Q308 102 318 102 H352 Q362 102 362 109 Q362 116 352 116 H318 Q308 116 308 123 Q308 130 318 130 H370'],
      ['cold', 'M370 130 H402 V270 H258']])}
    ${afcSeg('g-floor', [['hot', 'M214 58 V170 H258'],
      ['mid', 'M258 170 H384 V188 H270 V206 H384 V224 H258'],
      ['cold', 'M258 224 V270']])}
    ${afcSeg('g-ret', [['cold', 'M258 270 H198'], ['cold', 'M174 270 H135 V200']])}

    <rect x="122" y="100" width="26" height="100" rx="4" class="hex"/>
    <g class="clk" data-k="heat_power"><text x="141" y="214" class="xs v" id="t-hp"></text></g>
    <path class="hexz" d="M126 110 L144 120 L126 130 L144 140 L126 150 L144 160 L126 170 L144 180 L126 190"/>

    <g class="buh clk" id="g-buh" data-k="buh1">
      <rect x="160" y="38" width="36" height="24" rx="4"/>
      <text x="178" y="54" class="sm" text-anchor="middle" id="t-buh">BUH</text>
    </g>
    <g class="valve" id="g-valve">
      <polygon class="in" points="206,43 214,50 206,57"/>
      <polygon id="v-dhw" points="222,43 214,50 222,57"/>
      <polygon id="v-floor" points="207,58 214,50 221,58"/>
    </g>

    <g class="clk" data-k="lwt_before"><text x="141" y="84" class="xs">R1T <tspan class="v" id="t-r1t">–</tspan></text></g>
    <g class="clk" data-k="lwt_after"><text x="178" y="31" class="xs" text-anchor="middle">R2T <tspan class="v" id="t-r2t">–</tspan></text></g>
    <g class="clk" data-k="lw_setpoint">
      <text x="219" y="110" class="xs">zad.</text>
      <text x="219" y="122" class="xs v" id="t-lwsp">–</text>
    </g>

    <circle cx="186" cy="270" r="12" class="pumpc" id="c-pump" />
    <g id="imp" class="clk" data-k="pump">
      <path d="M186 270 L186 260 A10 10 0 0 1 194 265Z"/>
      <path d="M186 270 L195 274 A10 10 0 0 1 187 280Z"/>
      <path d="M186 270 L177 276 A10 10 0 0 1 177 263Z"/>
    </g>
    <g class="clk" data-k="pump"><text x="186" y="252" class="xs v" text-anchor="middle" id="t-pump"></text></g>
    <g class="clk" data-k="flow"><text x="202" y="263" class="xs" id="t-flow"></text></g>
    <g class="clk" data-k="inlet"><text x="320" y="285" class="xs" text-anchor="middle">R4T powrót <tspan class="v" id="t-r4t">–</tspan></text></g>

    <!-- zasobnik CWU -->
    <text x="335" y="12" class="xs" text-anchor="middle">Zasobnik CWU</text>
    <rect id="tankfill" x="300" y="18" width="70" height="132" clip-path="url(#afc-tank)" fill="none" opacity=".3"/>
    <rect x="300" y="18" width="70" height="132" rx="26" class="tank"/>
    <g class="clk" data-k="dhw_temp"><text x="335" y="50" class="big" text-anchor="middle" id="t-dhw">–</text></g>
    <g class="clk" data-k="bsh"><text x="335" y="145" class="bsh" text-anchor="middle" id="t-bsh">BSH</text></g>
    <g class="clk" data-k="dhw_setpoint"><text x="335" y="65" class="xs" text-anchor="middle">zad. <tspan class="v" id="t-dhwsp">–</tspan></text></g>

    <!-- podłogówka -->
    <rect id="floorbg" x="248" y="160" width="146" height="72" rx="6" fill="none" opacity=".18"/>
    <g class="clk" data-k="room_temp"><text x="321" y="251" class="sm" text-anchor="middle">Podłogówka · <tspan id="t-room" font-weight="600">–</tspan><tspan class="xs" id="t-roomsp"></tspan></text></g>
  </svg>
  <div class="chips">
    <div class="chip" data-k="cop_daily"><div class="l">COP dziś</div><div class="val" id="c-copd">–</div></div>
    <div class="chip" data-k="cop"><div class="l" id="l-cop">COP chwilowy</div><div class="val" id="c-cop">–</div></div>
    <div class="chip" data-k="heat_power"><div class="l">Moc cieplna</div><div class="val" id="c-heat">–</div></div>
    <div class="chip" data-k="elec_power"><div class="l">Moc elektr. (szac.)</div><div class="val" id="c-elec">–</div></div>
    <div class="chip" data-k="heat_today"><div class="l">Ciepło / prąd dziś</div><div class="val" id="c-energy">–</div></div>
    <div class="chip" data-k="lwt_after"><div class="l">ΔT zasil./powrót</div><div class="val" id="c-dt">–</div></div>
    <div class="chip" data-k="flow"><div class="l">Przepływ</div><div class="val" id="c-flow">–</div></div>
    <div class="chip" data-k="pressure" id="ch-press"><div class="l">Ciśnienie</div><div class="val" id="c-press">–</div></div>
    <div class="chip" data-k="op_mode"><div class="l">Jedn. zewn.</div><div class="val" id="c-op">–</div></div>
    <div class="chip" data-k="buh1" id="ch-buh"><div class="l">Grzałka BUH</div><div class="val" id="c-buh">–</div></div>
    <div class="chip" data-k="buh1_starts" id="ch-buh1t"><div class="l">BUH 1 dziś</div><div class="val" id="c-buh1t">–</div><div class="sub" id="s-buh1t"></div></div>
    <div class="chip hide" data-k="buh2_starts" id="ch-buh2t"><div class="l">BUH 2 dziś</div><div class="val" id="c-buh2t">–</div><div class="sub" id="s-buh2t"></div></div>
    <div class="chip" data-k="bsh_starts" id="ch-bsht"><div class="l">BSH dziś</div><div class="val" id="c-bsht">–</div><div class="sub" id="s-bsht"></div></div>
    <div class="chip" data-k="silent" id="ch-silent"><div class="l">Tryb cichy</div><div class="val" id="c-silent">–</div></div>
    <div class="chip" data-k="alarm" id="ch-alarm"><div class="l">Alarm</div><div class="val" id="c-alarm">–</div></div>
  </div>
</ha-card>`;
    this.shadowRoot.querySelectorAll('[data-k]').forEach((el) =>
      el.addEventListener('click', (ev) => { ev.stopPropagation(); this._more(el.dataset.k); }));
    this._built = true;
  }

  _more(k) {
    const entityId = this._e[k];
    if (!entityId) return;
    const ev = new Event('hass-more-info', { bubbles: true, composed: true });
    ev.detail = { entityId };
    this.dispatchEvent(ev);
  }

  _st(k) { const id = this._e[k]; const s = id && this._hass.states[id]; return s ? s.state : undefined; }
  _num(k) { const v = parseFloat(this._st(k)); return Number.isFinite(v) ? v : null; }
  _on(k) { return this._st(k) === 'on'; }
  _$(id) { return this.shadowRoot.getElementById(id); }
  _txt(id, v) { const el = this._$(id); if (el && el.textContent !== v) el.textContent = v; }
  _cls(sel, cls, on) { this.shadowRoot.querySelectorAll(sel).forEach((el) => el.classList.toggle(cls, !!on)); }

  _update() {
    if (!this._hass || !this._built) return;
    const T = (v) => (v == null ? '–' : `${Math.round(v * 10) / 10}°`);
    const tempColor = (t, lo, hi) => {
      if (t == null) return 'none';
      const x = Math.min(1, Math.max(0, (t - lo) / (hi - lo)));
      return `hsl(${Math.round(215 - 205 * x)}, 75%, 52%)`;
    };

    const iu = this._st('iu_mode') || '';
    const op = this._st('op_mode') || '';
    const dhw = /DHW/.test(iu);
    // 'Cooling + DHW' = sezon chlodzenia, ale zawor na CWU i woda grzana -> kolory grzania
    const cooling = !dhw && (/cool/i.test(iu) || /cool/i.test(op));
    const space = /Heat|Cool/i.test(iu);
    const flow = this._num('flow');
    const pump = this._num('pump');
    const running = (pump != null && pump > 0) || (flow != null && flow > 1);
    const current = this._num('current');
    const comp = this._on('compressor') || (current != null && current > 0);
    const fanOn = (this._num('fan1') || 0) > 0 || (this._num('fan2') || 0) > 0;
    const defrost = this._on('defrost');
    const buh1 = this._on('buh1');
    const buh2 = this._on('buh2');
    const alarm = this._on('alarm');
    const conn = this._st('connection');
    const offline = conn !== undefined && conn !== 'Online';

    const card = this.shadowRoot.querySelector('ha-card');
    card.classList.toggle('cool', cooling);

    // nagłówek
    const modeEl = this._$('h-mode');
    // I/U mode pamieta ostatni tryb/polozenie zaworu takze na postoju -> 'Postoj' gdy brak przeplywu
    const idle = !running && !comp;
    const valveLbl = dhw ? 'zawór: CWU' : 'zawór: podłoga';
    modeEl.textContent = idle ? `Postój · ${valveLbl}` : (AFC_MODES[iu] || iu || '–');
    modeEl.className = `tag ${idle ? 'off' : dhw ? 'dhw' : space ? 'heat' : 'off'}`;
    this._cls('#h-alarm', 'hide', !alarm);
    this._cls('#h-conn', 'hide', !offline);

    // przepływy: obieg wspólny zawsze kolorowy gdy pompa pracuje, gałęzie wg zaworu 3-drogowego
    // Zawor 3-drogowy: kazdy tryb z DHW ('DHW', 'Heating + DHW') = grzanie zasobnika,
    // podlogowka wtedy stoi. 'Heating' w nazwie oznacza tylko tryb ogolny (nie chlodzenie).
    // Obiegi kolorowane tylko przy faktycznym przeplywie; zawor pokazuje polozenie zawsze.
    const dhwBranch = dhw && running;
    const floorBranch = !dhw && running;
    this._cls('.g-sup, .g-ret', 'act', running);
    this._cls('.g-dhw', 'act', dhwBranch);
    this._cls('.g-floor', 'act', floorBranch);
    this._cls('.seg', 'run', running);
    this._cls('.ref', 'act', comp);
    this._cls('.ref', 'run', comp);
    this._cls('#v-dhw', 'open', dhw);
    this._cls('#v-floor', 'open', !dhw);
    this._cls('#g-valve', 'idle', !running);

    // jednostka zewnętrzna
    this._txt('t-outdoor', T(this._num('outdoor')));
    this._cls('#fan', 'spin', fanOn);
    this._cls('#g-defrost', 'hide', !defrost);
    this._txt('t-comp', comp ? (current ? `praca · ${current} A` : 'praca') : 'postój');
    const r3t = this._num('refrig');
    this._txt('t-refrig', r3t == null ? '' : `R3T ${T(r3t)}`);

    // hydrobox
    const r1t = this._num('lwt_before');
    const r2t = this._num('lwt_after');
    const r4t = this._num('inlet');
    this._txt('t-r1t', T(r1t));
    this._txt('t-r2t', T(r2t));
    this._txt('t-r4t', T(r4t));
    this._txt('t-lwsp', T(this._num('lw_setpoint')));
    this._cls('#g-buh', 'on', buh1 || buh2);
    this._txt('t-buh', buh2 ? 'BUH 2' : buh1 ? 'BUH 1' : 'BUH');
    this._cls('#imp', 'spin', running);
    this._cls('#c-pump', 'on', running);
    this._txt('t-pump', pump == null ? '' : `${Math.round(pump)}%`);
    this._txt('t-flow', flow == null ? '' : `${flow} l/min`);

    // CWU
    const dhwT = this._num('dhw_temp');
    this._txt('t-dhw', T(dhwT));
    this._txt('t-dhwsp', T(this._num('dhw_setpoint')));
    this._$('tankfill').setAttribute('fill', tempColor(dhwT, 25, 55));
    this._cls('#t-bsh', 'on', this._on('bsh'));
    this._txt('t-bsh', this._on('bsh') ? 'BSH ON' : 'BSH');

    // podłogówka
    this._$('floorbg').setAttribute('fill', floorBranch ? tempColor(r2t, 18, 45) : 'none');
    this._txt('t-room', T(this._num('room_temp')));
    const rsp = this._num('room_setpoint');
    this._txt('t-roomsp', rsp == null ? '' : ` / ${T(rsp)}`);

    // kafelki
    const cop = this._num(cooling ? 'cop_cool' : 'cop');
    this._txt('l-cop', cooling ? 'EER chwilowy' : 'COP chwilowy');
    this._txt('c-cop', cop == null ? '–' : cop.toFixed(2));
    const copd = this._num('cop_daily');
    this._txt('c-copd', copd == null ? '–' : copd.toFixed(2));
    const hp = this._num('heat_power');
    const ep = this._num('elec_power');
    this._txt('c-heat', hp == null ? '–' : `${hp.toFixed(1)} kW`);
    this._txt('c-elec', ep == null ? '–' : `${Math.round(ep)} W`);
    const ht = this._num('heat_today');
    const et = this._num('elec_today');
    this._txt('c-energy', ht == null && et == null ? '–' : `${ht == null ? '–' : ht.toFixed(1)} / ${et == null ? '–' : et.toFixed(1)} kWh`);
    this._txt('t-hp', hp ? `${hp.toFixed(1)} kW` : '');
    this._txt('c-dt', r2t != null && r4t != null ? `${(r2t - r4t).toFixed(1)} K` : '–');
    this._txt('c-flow', flow == null ? '–' : `${flow} l/min`);
    const press = this._num('pressure');
    this._txt('c-press', press == null ? '–' : `${press} bar`);
    this._cls('#ch-press', 'warn', press != null && (press < 1 || press > 2.8));
    this._txt('c-op', AFC_MODES[op] || op || '–');
    this._txt('c-buh', buh1 && buh2 ? 'Stopień 1+2' : buh1 ? 'Stopień 1' : buh2 ? 'Stopień 2' : 'Wył.');
    this._cls('#ch-buh', 'on', buh1 || buh2);
    const dur = (h) => {
      if (h == null) return '–';
      const m = Math.round(h * 60);
      return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;
    };
    // licznik startow z odmiana: 1 start, 2-4 starty, 0/5+ startow (12-14 -> startow)
    const starts = (n) => {
      if (n == null) return '';
      n = Math.round(n);
      if (n === 0) return 'brak startów';
      if (n === 1) return '1 start';
      const d = n % 10, dd = n % 100;
      return `${n} ${d >= 2 && d <= 4 && (dd < 12 || dd > 14) ? 'starty' : 'startów'}`;
    };
    const heaterChip = (key, timeK, startsK) => {
      const h = this._num(timeK);
      const n = this._num(startsK);
      const active = Math.round((h || 0) * 60) > 0 || (n || 0) > 0;
      this._txt(`c-${key}`, active ? dur(h) : 'nie pracowała');
      this._txt(`s-${key}`, active ? starts(n) : '');
      this._cls(`#ch-${key}`, 'on', active);
      return active;
    };
    heaterChip('buh1t', 'buh1_today', 'buh1_starts');
    const buh2Active = heaterChip('buh2t', 'buh2_today', 'buh2_starts');
    this._cls('#ch-buh2t', 'hide', !buh2Active);
    heaterChip('bsht', 'bsh_today', 'bsh_starts');
    this._txt('c-silent', this._on('silent') ? 'Wł.' : 'Wył.');
    this._txt('c-alarm', alarm ? 'AKTYWNY' : 'Brak');
    this._cls('#ch-alarm', 'warn', alarm);
  }
}

console.info(`%c ALTHERMA-FLOW-CARD %c ${CARD_VERSION} `, 'color:#fff;background:#3d8fe0;font-weight:700', 'color:#3d8fe0');

if (!customElements.get('altherma-flow-card')) {
  customElements.define('altherma-flow-card', AlthermaFlowCard);
}
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'altherma-flow-card',
  name: 'Altherma flow card',
  description: 'Schemat Daikin Altherma 3 z obiegiem CWU i podłogówki (ESPAltherma)',
  preview: true,
});
