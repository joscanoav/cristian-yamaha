# Cristian Yamaha

Aplicación web para aprender a tocar el piano con un Yamaha P-145BT de 88 teclas.

## Convención de octavas

El proyecto utiliza la **notación científica de afinación**, la misma que emplea el estándar MIDI:

- **Do4 = MIDI 60** (el do central del piano, C4 en notación anglosajona).
- **La4 = MIDI 69 = 440 Hz** (afinación de referencia internacional).
- El teclado completo abarca desde **La0 (MIDI 21)** hasta **Do8 (MIDI 108)**: 88 teclas.
- La octava aumenta en 1 al pasar de Si a Do (por ejemplo, Si3 → Do4).

Las utilidades de conversión están en `src/lib/notes.ts`:

| Función | Descripción |
| --- | --- |
| `frequencyFromMidi(midi)` | MIDI → frecuencia (Hz) |
| `midiFromFrequency(freq)` | Frecuencia → MIDI (fraccionario) |
| `noteFromMidi(midi)` | MIDI → nombre español, octava y etiqueta (p. ej. `Do4`) |
| `midiFromNoteName(nombre, octava)` | Nombre español + octava → MIDI |
| `nearestNoteFromFrequency(freq)` | Frecuencia → nota más cercana + desviación en cents |
| `isWithinTolerance(cents)` | Comprueba si la afinación está dentro de la tolerancia (±50 cents) |

Los nombres de nota en español son: Do, Do#, Re, Re#, Mi, Fa, Fa#, Sol, Sol#, La, La#, Si.

## Comandos

- `npm run dev` — servidor de desarrollo.
- `npm run build` — compilación de producción.
- `npm test` — ejecuta las pruebas unitarias con Vitest.
- `npm run test:watch` — pruebas en modo vigilancia.
- `npm run lint` — análisis estático con Oxlint.

---

# Plantilla original de Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
