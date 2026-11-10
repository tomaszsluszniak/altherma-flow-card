# Altherma flow card

[![HACS: Custom](https://img.shields.io/badge/HACS-Custom-orange)](https://hacs.xyz/docs/faq/custom_repositories/)
[![Wydanie](https://img.shields.io/github/v/release/tomaszsluszniak/altherma-flow-card)](https://github.com/tomaszsluszniak/altherma-flow-card/releases/latest)
[![Licencja: MIT](https://img.shields.io/github/license/tomaszsluszniak/altherma-flow-card)](LICENSE)

Karta Home Assistant z żywym schematem pompy ciepła **Daikin Altherma 3**: jednostka zewnętrzna,
hydrobox (wymiennik, grzałka BUH, pompa obiegowa, zawór 3-drogowy), zasobnik CWU i pętla podłogówki
z animowanym przepływem wody i czynnika. Pod schematem kafelki z COP, mocą, energią, przepływem,
ciśnieniem i pracą grzałek.

*Home Assistant dashboard card showing a live diagram of a Daikin Altherma 3 heat pump
(data from [ESPAltherma](https://github.com/raomin/ESPAltherma)). The card's interface and
documentation are in Polish.*

<!-- ![Schemat pompy ciepła](docs/karta.png) -->

> [!NOTE]
> Projekt niezależny, niezwiązany z firmą Daikin. Karta nie zawiera logo ani grafik producenta.

## Wymagania

- Home Assistant **2024.1** lub nowszy,
- dane z pompy przez [ESPAltherma](https://github.com/raomin/ESPAltherma) (MQTT),
- opcjonalnie własne sensory szablonowe (COP, moc, energia, czasy pracy grzałek) — patrz niżej.

## Instalacja

Przez [HACS](https://hacs.xyz):

[![Otwórz repozytorium w HACS w swoim Home Assistant.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=tomaszsluszniak&repository=altherma-flow-card&category=plugin)

Albo ręcznie w HACS: menu ⋮ → **Custom repositories** → wklej
`https://github.com/tomaszsluszniak/altherma-flow-card`, wybierz typ **Dashboard**, potem **Download**.

Po instalacji odśwież przeglądarkę (w aplikacji mobilnej: zamknij i otwórz aplikację).

<details>
<summary>Instalacja ręczna</summary>

1. Pobierz `altherma-flow-card.js` z [najnowszego wydania](https://github.com/tomaszsluszniak/altherma-flow-card/releases/latest).
2. Skopiuj do `/config/www/`.
3. Ustawienia → Panele → ⋮ → Zasoby → Dodaj `/local/altherma-flow-card.js`, typ *Moduł JavaScript*.

</details>

## Konfiguracja

```yaml
type: custom:altherma-flow-card
title: Daikin Altherma 3   # opcjonalnie
entities:                  # opcjonalnie — tylko te, które różnią się od domyślnych
  outdoor: sensor.moja_temperatura_zewnetrzna
```

Klucz ustawiony na pustą wartość wyłącza dany odczyt.

### Encje

Z ESPAltherma (nazwy domyślne przy prefiksie `altherma`):

| Klucz | Domyślna encja | Na schemacie |
|---|---|---|
| `outdoor` | `sensor.altherma_r1t_outdoor_air_temp` | temperatura zewnętrzna |
| `refrig` | `sensor.altherma_refrig_temp_liquid_side_r3t` | R3T czynnika |
| `lwt_before` | `sensor.altherma_leaving_water_temp_before_buh_r1t` | R1T przed grzałką |
| `lwt_after` | `sensor.altherma_leaving_water_temp_after_buh_r2t` | R2T zasilanie |
| `inlet` | `sensor.altherma_inlet_water_temp_r4t` | R4T powrót |
| `lw_setpoint` | `sensor.altherma_lw_setpoint_main` | zadana zasilania |
| `dhw_temp` | `sensor.altherma_dhw_tank_temp_r5t` | temperatura CWU |
| `dhw_setpoint` | `sensor.altherma_dhw_setpoint` | zadana CWU |
| `room_temp` | `sensor.altherma_indoor_ambient_temp_r1t` | temperatura pokoju |
| `room_setpoint` | `sensor.altherma_rt_setpoint` | zadana pokoju |
| `flow` | `sensor.altherma_flow_sensor_l_min` | przepływ |
| `pressure` | `sensor.altherma_water_pressure` | ciśnienie |
| `cop_cool` | `sensor.altherma_cooling_cop_n` | EER przy chłodzeniu |
| `op_mode` | `sensor.altherma_operation_mode` | tryb jednostki zewnętrznej |
| `iu_mode` | `sensor.altherma_i_u_operation_mode` | tryb i zawór 3-drogowy |
| `compressor` | `binary_sensor.altherma_thermostat_on_off` | sprężarka |
| `current` | `sensor.altherma_inv_primary_current_a` | prąd inwertera |
| `fan1`, `fan2` | `sensor.altherma_fan_1_step`, `sensor.altherma_fan_2_step` | wentylator |
| `defrost` | `binary_sensor.altherma_defrost_operation` | odszranianie |
| `buh1`, `buh2` | `binary_sensor.altherma_buh_step1`, `…_step2` | grzałka BUH |
| `bsh` | `binary_sensor.altherma_bsh` | grzałka zasobnika |
| `silent` | `binary_sensor.altherma_silent_mode` | tryb cichy |
| `alarm` | `binary_sensor.altherma_alarm_output` | alarm |
| `connection` | `sensor.none_althermasensors` | status połączenia (LWT) |

Własne (sensory szablonowe, liczniki `history_stats`, `utility_meter` itp.):

| Klucz | Domyślna encja | Znaczenie |
|---|---|---|
| `pump` | `sensor.water_pump_signal` | wysterowanie pompy, % |
| `cop` | `sensor.altherma_cop` | COP chwilowy |
| `cop_daily` | `sensor.altherma_cop_dobowy` | COP dzisiejszy |
| `heat_power` | `sensor.altherma_moc_cieplna` | moc cieplna, kW |
| `elec_power` | `sensor.altherma_moc_elektryczna` | moc elektryczna, W |
| `heat_today`, `elec_today` | `sensor.altherma_cieplo_dzis`, `sensor.altherma_prad_dzis` | energia dziś, kWh |
| `buh1_today`, `buh2_today`, `bsh_today` | `sensor.altherma_buh1_czas_dzis`… | czas pracy grzałek dziś, h |
| `buh1_starts`, `buh2_starts`, `bsh_starts` | `sensor.altherma_buh1_starty_dzis`… | liczba startów dziś |

Brakująca encja nie psuje karty — zamiast wartości pojawia się „–”.

## Wydanie nowej wersji

1. Podbij `CARD_VERSION` w `dist/altherma-flow-card.js` i dopisz sekcję w `CHANGELOG.md`.
2. `git tag v1.1.0 && git push origin main v1.1.0` — workflow utworzy wydanie, które HACS zainstaluje.

## Licencja

[MIT](LICENSE)
