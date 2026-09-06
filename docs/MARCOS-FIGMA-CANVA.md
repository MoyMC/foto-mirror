# Brief de marcos (Figma / Canva) — FotoMirror

Documento para diseñar y exportar marcos de impresión de tiras fotográficas.
Usalo como brief o pégalo (sección “Prompt”) en Figma AI / Canva Magic Design / un diseñador.

---

## Contexto del producto

- Impresora: **DNP DS-RX1**, papel **4×6" (10×15 cm)** a **300 dpi**.
- Modos:
  - **Tira 2:** media hoja (dos tiras caben en una hoja).
  - **Tira 3:** hoja completa.
- El **texto del evento** (letrero del wizard, p. ej. “Punshis & Punchis” o “Ana & Luis · 2026”) **no va dibujado fijo en el PNG**. El software lo inserta en una zona reservada del marco.
- Las **fotos** se insertan en ventanas transparentes (agujeros) del PNG.

---

## Prompt para Figma / Canva (copiar y pegar)

```
Diseña un MARCO de tira fotográfica tipo photobooth para impresión dye-sub 4×6" a 300 dpi.

REQUISITOS TÉCNICOS
- Exportar PNG-24 con transparencia (canal alpha).
- Las áreas donde van las FOTOS deben ser TOTALMENTE TRANSPARENTES (agujeros limpios, sin relleno gris ni blanco).
- NO escribir el nombre del evento como texto final en el archivo. En su lugar, dejar una ZONA DE TEXTO DINÁMICO vacía (o con placeholder gris muy suave “EVENT TEXT”) que el software reemplazará.
- Bordes de las ventanas de foto limpios, rectos o con radio suave (máx. 8–12 px a 300 dpi).
- Evitar texto menor a ~18–20 px de alto en el diseño decorativo (se pierde en dye-sub).
- No usar efectos que dependan de blur extremo o tramas muy finas (moaré en impresión).

VARIANTES A ENTREGAR (una por archivo)

A) TIRA 2 — media hoja
   Lienzo: 700 × 1800 px (más ancha que 600 px a propósito: marcos actuales se ven delgados).
   Contenido vertical:
   - 2 ventanas de foto apiladas (retrato, aspect ~ 2:3 o ligeramente más altas).
   - 1 zona de texto dinámico ABAJO (footer), altura útil ≥ 220 px.
   - Márgenes laterales del marco ≥ 48 px (para que el marco se sienta “ancho”, no una línea fina).
   - Separación entre fotos ≥ 24 px.

B) TIRA 3 — hoja completa
   Lienzo: 1200 × 1800 px.
   Contenido:
   - 3 ventanas de foto apiladas en el centro.
   - Zonas de texto dinámico en laterales (bandas izq/der) O un footer inferior + laterales decorativos.
   - Laterales ≥ 140–180 px de ancho útil para tipografía vertical o branding.
   - Márgenes generosos: el marco debe verse sustancial, no delgado.

TEXTO DINÁMICO (muy importante)
- El software inyectará 1–3 líneas de texto definidas en un wizard (ejemplos según tipo de evento abajo).
- Reservar un rectángulo claro llamado “sign_slot” sin ilustraciones que tapen letras.
- Tipografía del diseño DECORATIVO puede ser fancy; la zona sign_slot debe pensarse para fuentes elegibles en app:
  - Serif display (tipo Playfair)
  - Script (tipo Great Vibes)
  - Sans bold condensed (tipo Bebas / Outfit)
  - Display (tipo Monoton / neon)
- Asumir texto blanco o color acento sobre fondo oscuro del marco, O texto oscuro sobre fondo cream — según variante.
- Dejar “aire” alrededor del sign_slot: el texto puede ser largo (hasta ~28 caracteres por línea × 3 líneas).

TIPOS DE EVENTO (preparar marcos para TODOS estos usos)
Preparar un set de marcos cubriendo estas categorías. Cada categoría = al menos 1 variante tira2 + 1 tira3 (misma geometría de slots, distinto look). El texto del wizard cambia por evento; el marco debe funcionar con nombres largos o cortos.

1) BODAS
   Mood: romántico, elegante, atemporal.
   Paleta: ivory/cream, blush, oro rosa, negro + dorado, verde oliva suave.
   Motivos: líneas finas, botánica sutil, arcos, monograma vacío (no texto fijo).
   Ej. texto dinámico: “Ana & Luis”, “Sofía & Marco · 14.06.2026”, “Nuestra boda”.

2) XV AÑOS / QUINCEAÑERAS
   Mood: celebratorio, glitter sin exceso, princesa moderna o fiesta bold.
   Paleta: rosa, lila, plata, dorado, negro + fucsia.
   Motivos: corona sutil, estrellas, mariposas ligeras, brillos contenidos.
   Ej. texto: “XV años · Valeria”, “Mis XV · Camila”, “Valeria 15”.

3) FIESTAS / CUMPLEAÑOS / FESTA
   Mood: alegre, colorido, photobooth divertido (sin parecer infantil barato).
   Paleta: navy + gold + teal, neón, confetti, contraste alto.
   Motivos: confetti, film strip, estrellas, cámara stylized.
   Ej. texto: “Gary’s Festa”, “Punshis & Punchis”, “Happy Birthday · Leo”, “Fiesta 30”.

4) EVENTOS DE GALA / BLACK TIE / PREMIOS
   Mood: lujo, noche, formal.
   Paleta: negro, charcoal, oro, plata, burdeos.
   Motivos: filetes metalizados, geometría limpia, art deco suave, sin doodles.
   Ej. texto: “Gala 2026”, “Noche de premios”, “Black Tie · Acme”.

5) EMPRESARIALES / CORPORATIVOS / CONFERENCIAS
   Mood: limpio, premium, brand-friendly (poco “fiesta”).
   Paleta: navy, gris, blanco, un acento corporativo (azul/teal).
   Motivos: tipografía clara, líneas mínimas, espacio para logo pequeño opcional.
   Ej. texto: “Summit 2026”, “Acme Corp · Kickoff”, “Team Day”.

6) OTROS (opcionales, si hay cupo)
   - Baby shower / bautizo: pasteles suaves, crema, celeste/rosa muted.
   - Graduación: academic light (navy + oro), sin clichés pesados.
   - Navidad / seasonal: solo si se pide; evitar saturación.

ESTILO Y DIRECCIÓN POR VARIANTE
- Photobooth premium para eventos reales (impresión física que se guarda).
- UNA dirección clara por archivo (no mezclar boda + neón festa en el mismo marco).
- Variantes mínimas sugeridas del catálogo:
  1) Boda — classic cream + gold
  2) Boda — dark romantic (negro + dorado)
  3) XV — blush + silver / gold
  4) Fiesta — navy + gold + confetti (tipo Gary’s Festa)
  5) Fiesta — neon night
  6) Gala — black tie gold
  7) Corporativo — navy minimal
- El marco puede incluir adornos propios del tipo de evento, logo pequeño opcional, PERO nada dentro de los agujeros de foto ni tapando el sign_slot.
- No quemar nombres de novios, “XV”, fechas ni logos de cliente en el PNG de producción (van en el sign_slot o se omiten).

ENTREGABLES
- PNG transparente por variante (ideal: tira2 + tira3 por cada estilo del catálogo).
- Capa o guía con las coordenadas de:
  - cada ventana de foto (x, y, width, height en px)
  - sign_slot (x, y, width, height)
- Nombre de archivo: marco-{modo}-{categoria}-{estilo}.png
  ej. marco-strip2-boda-cream-gold.png, marco-strip3-xv-blush.png, marco-strip2-gala-blacktie.png, marco-strip3-corp-navy.png
```

---

## Tamaños de lienzo (resumen)

| Modo | Lienzo sugerido | Notas |
|------|-----------------|--------|
| **Tira 2** | **700 × 1800 px** | Más ancha que 600 px (media hoja “estricta”); se puede centrar/recortar al componer. Si preferís exacto media hoja: 600 × 1800. |
| **Tira 3** | **1200 × 1800 px** | Hoja 4×6" completa @ 300 dpi. |
| Individual (futuro) | 1200×1800 (retrato) o 1800×1200 (apaisado) | Opcional; no prioritario ahora. |

**Por qué más anchos en tira 2:** a 600 px el marco + padding deja ventanas muy “magras”. 700 px da más carne al marco; en software se puede letterbox o escalar a la mitad de hoja.

Si Figma/Canva pide pulgadas: **tira2 ≈ 2.33 × 6 in**, **tira3 = 4 × 6 in**, ambos a 300 dpi.

---

## Zona de texto del wizard (`sign_slot`)

El texto **no** es parte del PNG final de diseño: es variable por evento.

### Qué dejar en el diseño
- Un rectángulo vacío (o placeholder tenue) etiquetado `sign_slot`.
- Fondo del slot coherente con el marco (mismo color de placa).
- Sin logos ni ilustraciones encima.

### Capacidades del texto en app (para tipografía)
- 1 a 3 líneas.
- Fuentes aproximadas disponibles / planeadas: **Playfair Display**, **Great Vibes**, **Bebas Neue**, **Outfit**, **Monoton**.
- El color puede seguir el acento del marco (dorado, neón, cream).

### Dónde ponerlo
| Modo | Ubicación recomendada |
|------|------------------------|
| Tira 2 | **Footer inferior** bajo las 2 fotos (como cartel). |
| Tira 3 | **Bandas laterales** (texto vertical) y/o footer; priorizar laterales anchos. |

### Placeholder de ejemplo (solo en mockup, no en export final)
```
EVENT TEXT
(1–3 lines)
```

En el PNG de entrega: slot vacío, no el placeholder.

---

## Guía de ventanas de foto (punto de partida)

Valores orientativos para empezar el layout (ajustables):

### Tira 2 — lienzo 700 × 1800
| Elemento | x | y | w | h |
|----------|---|---|---|---|
| Foto 1 | 70 | 50 | 560 | 640 |
| Foto 2 | 70 | 720 | 560 | 640 |
| sign_slot | 70 | 1400 | 560 | 320 |

### Tira 3 — lienzo 1200 × 1800
| Elemento | x | y | w | h |
|----------|---|---|---|---|
| Lateral izq (branding) | 0 | 0 | 160 | 1800 |
| Foto 1 | 180 | 40 | 840 | 540 |
| Foto 2 | 180 | 610 | 840 | 540 |
| Foto 3 | 180 | 1180 | 840 | 540 |
| Lateral der / sign | 1040 | 0 | 160 | 1800 |

*(Si el texto va solo en laterales, el “sign_slot” puede ser la banda derecha o ambas.)*

Entregar también un JSON junto al PNG:

```json
{
  "id": "classic-gold",
  "kind": "strip2",
  "width": 700,
  "height": 1800,
  "file": "marco-strip2-classic-gold.png",
  "slots": [
    { "id": "pose1", "x": 70, "y": 50, "w": 560, "h": 640 },
    { "id": "pose2", "x": 70, "y": 720, "w": 560, "h": 640 }
  ],
  "signSlot": { "x": 70, "y": 1400, "w": 560, "h": 320, "align": "center", "maxLines": 3 }
}
```

---

## Checklist de exportación

- [ ] PNG con alpha real (no JPEG renombrado).
- [ ] Agujeros de foto 100% transparentes (verificar esquina del agujero: alpha = 0).
- [ ] `sign_slot` vacío y medido.
- [ ] Sin texto de evento “quemado” (salvo mockup aparte).
- [ ] Nombre de archivo claro + JSON de coordenadas.
- [ ] Mockup aparte (opcional) con fotos de ejemplo + texto de ejemplo, **no** sustituye al PNG de producción.

---

## Sugerencias de diseño / producto

1. **Catálogo por tipo de evento:** bodas, XV, fiestas, gala, corporativo (mínimo 1 look cada uno); baby/grad como extra.
2. **Misma geometría de slots** entre variantes del mismo modo (`strip2` / `strip3`): cambia el look, no las medidas. Así el crop de la web y el compositor no se vuelven un caos.
3. **Marcos más anchos / más “carne”:** bordes 48–80 px se leen mejor en físico que filetes de 8–12 px.
4. **Safe area:** dejar ~3 mm (~36 px @ 300 dpi) libres del borde físico del papel (corte / grip de la impresora).
5. **Contraste del sign_slot:** texto del wizard debe leerse sí o sí; evitar fondos busy detrás del slot.
6. **Logo de marca (Gary’s Festa):** pequeño, en esquina o sobre el footer, nunca tapando fotos ni el letrero del evento.
7. **No espejar tipografía compleja** en laterales de tira 3 si el texto dinámico va vertical: el software rota el texto; el marco solo deja la banda limpia.
8. **Canva tip:** crear el lienzo en px exactos; exportar “PNG” + “Fondo transparente”.
9. **Figma tip:** Frame al tamaño final; fotos = rectángulos en capa `holes` que se borran / exportan con “Ignore overlapping” o máscara; export 1× (ya estamos a 300 dpi en px).
10. **Prueba rápida:** imprimir un marco de prueba con rectángulos de color en los slots antes de fotos reales.
11. **Prioridad de entrega:** primero 1 boda + 1 fiesta + 1 gala/corp; luego XV y el resto.

---

## Prompt corto (si el largo no cabe)

```
Marco photobooth PNG transparente 300 dpi para eventos: bodas, XV años, fiestas/cumpleaños, gala/black tie y corporativos (también baby/grad si hay cupo).
Tira2: 700×1800, 2 fotos + footer vacío “sign_slot” (texto dinámico 1–3 líneas).
Tira3: 1200×1800, 3 fotos + laterales anchos para texto dinámico.
Agujeros 100% transparentes. Sin nombres/fechas fijos en el PNG. Bordes generosos.
Al menos 1 estilo tira2+tira3 por categoría (boda cream/gold, boda dark, XV blush, fiesta navy-gold, neon, gala blacktie, corp navy).
Entregar PNG + coordenadas x,y,w,h de fotos y sign_slot. Nombre: marco-{modo}-{categoria}-{estilo}.png
```
