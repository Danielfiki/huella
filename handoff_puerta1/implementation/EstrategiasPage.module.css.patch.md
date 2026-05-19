# EstrategiasPage.module.css · patch

## Única clase nueva: `.sectionLblText`

El stylesheet `EstrategiasPage.module.css` ya define `.sectionLbl` y `.dotDot`. El brief de Puerta 1 menciona explícitamente que **el label de sección usa `.sectionLblText`** — pero esa clase no existe hoy en el módulo: el texto se inserta directamente como hijo del `.sectionLbl`. Para que `<PuertaUnoSection>` pueda envolver solo el texto en su propio span (sin tocar el espaciado del label), agregamos esa clase.

---

## Localizar el final del archivo (línea ~11):

```css
.dotDot { width: 6px; height: 6px; border-radius: 50%; background: var(--color-tangerine); }
```

## Agregar inmediatamente después:

```css
.sectionLblText {
  /* Idéntico al estilo que .sectionLbl le venía dando al texto directo.
     Sólo lo extraemos en una clase propia para que pueda envolverse en un <span>. */
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}
```

## ⚠️ Nota sobre tokens

El archivo actual usa `var(--color-tangerine)` y `var(--color-muted)` (líneas 6 y 11). El brief de Puerta 1 **no permite tocar tokens en `index.css`**, pero la decisión de proyecto es que los aliases viejos están migrados a los nuevos (`--color-primary`, `--color-text-muted`).

- Si tu `index.css` actual **ya tiene los aliases viejos definidos** (`--color-tangerine`, `--color-muted` mapeados a sus equivalentes nuevos) → todo funciona, no tocar nada más.
- Si **no los tiene** → la clase `.sectionLbl` original ya está rota antes de este patch. **NO la arreglo dentro de este bundle** (el brief lo excluye explícitamente: "No tocar `EstrategiasPage.module.css` salvo en las clases específicas del bloque Puerta 1"). Lo registro en OBSERVACIONES — fuera de alcance.

**Nada más se toca en este archivo.**
`.page` queda igual.
`.body` queda igual.
`.section` queda igual.
`.sectionLbl` queda igual.
`.dotDot` queda igual.
