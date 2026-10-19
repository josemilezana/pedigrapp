# Plan de validación de PedigrAPP

## 1. Objetivo

Demostrar que PedigrAPP representa de forma reproducible y comprensible estructuras familiares relevantes para genética clínica, preserva la información al guardar/importar casos y genera salidas útiles sin modificar el significado del pedigree.

Este documento define un plan prospectivo. No implica que todas las pruebas descritas se hayan completado.

## 2. Fuentes normativas

La validación de nomenclatura se basará principalmente en:

- Bennett et al., 1995.
- Bennett et al., 2008.
- Bennett et al., 2022.
- Steinhaus French et al., 2025, corrección de la revisión de 2022.

## 3. Bloques de validación

### A. Símbolos básicos

Evaluar:

- hombre;
- mujer;
- género no especificado;
- género diverso;
- fallecimiento;
- probando;
- consultante;
- múltiples individuos;
- mortinato;
- embarazo;
- SAB;
- TOP;
- ECT.

### B. Estados clínicos y condiciones

Evaluar:

- una condición;
- múltiples condiciones;
- diferentes patrones de relleno;
- portadores;
- estados desconocidos;
- información clínica adicional;
- leyenda generada automáticamente.

Criterio principal: el significado representado debe conservarse tras guardar, exportar e importar.

### C. Relaciones familiares

Evaluar:

- pareja;
- separación o ruptura;
- consanguinidad;
- progenitor-hijo;
- hermanos;
- medio hermanos;
- múltiples uniones;
- familias reconstituidas;
- relaciones entre ramas diferentes.

### D. Adopción

Evaluar:

- adopción hacia dentro;
- adopción hacia fuera;
- filiación biológica;
- filiación adoptiva;
- adopción intrafamiliar;
- coexistencia de líneas biológicas y adoptivas.

### E. Gemelos y gestaciones múltiples

Evaluar:

- monocigóticos;
- dicigóticos;
- cigosis desconocida;
- trillizos;
- múltiples agrupaciones dentro de una fratría.

### F. Reproducción

Evaluar:

- ausencia de descendencia;
- infertilidad;
- motivo de infertilidad;
- donación de esperma;
- donación de óvulos;
- doble donación;
- gestación por portadora gestacional;
- escenarios en los que una persona aporta gametos y gesta.

Los escenarios de reproducción asistida deben revisarse específicamente frente a la corrección de 2025.

### G. Layout

Evaluar:

- orden de hermanos;
- cadenas de múltiples uniones;
- ascendencia añadida a miembros de cadenas de unión;
- árboles de varias generaciones;
- ramas asimétricas;
- cruces evitables;
- alineación de descendencia;
- estabilidad tras editar un individuo o relación.

Debe distinguirse entre:

- error semántico: una línea representa una relación incorrecta;
- error geométrico: la relación es correcta pero la disposición dificulta su lectura;
- limitación estética: el resultado es correcto pero mejorable.

### H. Persistencia y formatos

Probar:

1. crear pedigree;
2. guardar;
3. recargar página;
4. cargar caso;
5. comprobar identidad semántica.

Repetir con:

- exportación/importación JSON;
- exportación/importación PED cuando el escenario sea representable en PED.

El formato PED no puede representar toda la semántica de PedigrAPP. Las pérdidas o simplificaciones deben advertirse al usuario y no ocultarse.

### I. Exportación gráfica

Comprobar:

- SVG;
- PNG;
- impresión/guardado como PDF.

Criterios:

- no desaparecen individuos o líneas;
- la leyenda se mantiene legible;
- los patrones clínicos siguen siendo distinguibles;
- los textos no quedan truncados de forma que cambie el significado.

### J. Privacidad

Con herramientas de desarrollo del navegador:

- crear un pedigree con datos sintéticos;
- guardar, cargar, exportar e imprimir;
- revisar la pestaña Network;
- confirmar que no se transmiten datos del pedigree a un backend de PedigrAPP.

Deben documentarse las peticiones de recursos estáticos esperadas.

### K. Compatibilidad de navegadores

Antes de una versión pública estable, probar al menos versiones actuales de:

- Chrome/Chromium;
- Firefox;
- Edge.

Safari deberá añadirse cuando se disponga de entorno de prueba.

## 4. Validación independiente

Los escenarios clínicos prioritarios deberían ser revisados por más de una persona del Servicio de Genética.

Para cada caso se registrará:

- identificador de prueba;
- objetivo;
- estructura esperada;
- resultado observado;
- revisores;
- discrepancias;
- resolución;
- versión de PedigrAPP.

## 5. Casos sintéticos

Todos los casos incorporados al repositorio deben ser sintéticos.

Los casos derivados de situaciones reales solo podrán utilizarse si se transforman de forma suficiente para impedir la identificación y si su utilización es compatible con las normas institucionales aplicables.

## 6. Matriz de validación propuesta

| ID | Área | Escenario | Resultado esperado | Estado | Revisores |
|---|---|---|---|---|---|
| V01 | Básico | Familia nuclear | Relaciones correctas | Pendiente | |
| V02 | Fratría | Hermanos y orden | Lectura inequívoca | Pendiente | |
| V03 | Multiunión | Tres o más parejas | Sin relaciones falsas | Pendiente | |
| V04 | Consanguinidad | Unión consanguínea | Doble línea correcta | Pendiente | |
| V05 | Adopción | Biológica + adoptiva | Líneas diferenciadas | Pendiente | |
| V06 | Gemelos | MZ/DZ/desconocido | Simbología correcta | Pendiente | |
| V07 | Reproducción | Donante de esperma | Filiación correcta | Pendiente | |
| V08 | Reproducción | Donante de óvulos | Filiación correcta | Pendiente | |
| V09 | Reproducción | Portadora gestacional | Convención 2025 correcta | Pendiente | |
| V10 | Persistencia | Guardar/cargar | Sin pérdida semántica | Pendiente | |
| V11 | JSON | Round-trip | Sin pérdida semántica | Pendiente | |
| V12 | PDF | Informe complejo | Completo y legible | Pendiente | |
| V13 | Privacidad | Network | Sin envío de datos clínicos | Pendiente | |

Esta matriz se ampliará con los casos de regresión ya utilizados durante el desarrollo.

## 7. Evidencia para publicación

Para una futura publicación se conservarán:

- versión exacta del software;
- tag Git;
- conjunto de casos sintéticos de validación;
- resultados de la matriz;
- incidencias detectadas y resueltas;
- navegadores probados;
- fecha de ejecución;
- identidad o código de los revisores;
- documentación de limitaciones conocidas.
