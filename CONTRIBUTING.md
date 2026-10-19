# Contribuir a PedigrAPP

Las contribuciones científicas y técnicas son bienvenidas una vez que el proyecto se encuentre abierto a colaboración pública.

## Antes de contribuir

PedigrAPP se utiliza en un contexto relacionado con genética clínica. Por ello:

**No incluya datos reales de pacientes o familiares en el repositorio.**

No deben aparecer datos identificables en:

- commits;
- archivos de ejemplo;
- issues;
- pull requests;
- capturas de pantalla;
- trazas de errores;
- comentarios de código.

Utilice siempre casos sintéticos.

## Tipos de contribución

Son especialmente útiles:

- correcciones de errores;
- nuevos casos de prueba;
- revisión de nomenclatura de pedigree;
- mejoras de accesibilidad;
- mejoras de interoperabilidad;
- validación en distintos navegadores;
- documentación;
- propuestas de casos clínicos complejos expresados mediante ejemplos sintéticos;
- revisión metodológica.

## Flujo de ramas

El proyecto mantiene actualmente:

- `main`: entorno principal de desarrollo;
- `online`: edición estática ejecutada en navegador.

Una modificación de `main` no implica automáticamente su incorporación a `online`.

## Cambios en nomenclatura

Las propuestas que modifiquen símbolos, relaciones o convenciones deberán:

1. identificar claramente el escenario que se pretende representar;
2. indicar la referencia normativa o bibliográfica utilizada;
3. incluir uno o más casos sintéticos reproducibles;
4. describir cómo afecta el cambio a pedigrees existentes;
5. mantener, siempre que sea razonable, compatibilidad con archivos previos.

## Pruebas

Todo cambio funcional debe incluir una comprobación del escenario afectado.

Para cambios de layout deben evaluarse también escenarios relacionados, especialmente:

- múltiples uniones;
- fratrías;
- medio hermanos;
- adopción;
- consanguinidad;
- gemelos y gestaciones múltiples;
- reproducción asistida;
- árboles multigeneracionales.

## Estilo de commits

Se recomiendan mensajes descriptivos, por ejemplo:

```text
PedigrAPP v0.7.xx - corrección de uniones múltiples
```

o, para la edición web:

```text
PedigrAPP online v0.7.xx - mejora de almacenamiento local
```

## Licencia de contribuciones

La licencia pública del proyecto está pendiente de autorización institucional.

Hasta que se publique una licencia definitiva, no se aceptarán contribuciones externas que requieran una cesión o relicenciamiento incompatible con la futura política del proyecto.
