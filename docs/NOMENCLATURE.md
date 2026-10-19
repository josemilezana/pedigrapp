# Nomenclatura de pedigree utilizada como referencia

## Alcance

PedigrAPP pretende representar árboles genealógicos de utilidad en genética clínica mediante una nomenclatura coherente con las recomendaciones estandarizadas de la National Society of Genetic Counselors (NSGC) y sus revisiones.

PedigrAPP no reproduce las figuras originales de las publicaciones. Los símbolos de la aplicación se generan mediante código propio.

## Bennett et al., 1995

La publicación de 1995 propuso recomendaciones estandarizadas para reducir la variabilidad existente en la representación de pedigrees y facilitar la comunicación clínica y científica.

Constituye la base histórica de la nomenclatura implementada.

Referencia:

Bennett RL, Steinhaus KA, Uhrich SB, et al. *Recommendations for Standardized Human Pedigree Nomenclature*. **American Journal of Human Genetics**. 1995;56:745–752.

## Bennett et al., 2008

La revisión de 2008 evaluó el uso del estándar de 1995 y propuso cambios principalmente estilísticos, manteniendo la nomenclatura como referencia ampliamente reconocida.

Entre los elementos relevantes para PedigrAPP se encuentran:

- definición de líneas de relación y descendencia;
- consanguinidad;
- gemelos y gestaciones múltiples;
- adopción;
- ausencia de descendencia e infertilidad;
- embarazo, SAB, TOP y ECT;
- reproducción asistida;
- documentación de información clínica y genética.

Referencia:

Bennett RL, French KS, Resta RG, Doyle DL. *Standardized Human Pedigree Nomenclature: Update and Assessment of the Recommendations of the National Society of Genetic Counselors*. **Journal of Genetic Counseling**. 2008;17:424–433. doi:10.1007/s10897-008-9169-9.

## Bennett et al., 2022

La revisión focalizada de 2022 mantuvo gran parte de la nomenclatura previa y actualizó de forma especial la representación y terminología relacionadas con sexo y género.

Aspectos relevantes:

- el símbolo representa la identidad de género;
- pueden anotarse AMAB, AFAB o UAAB cuando corresponda;
- el diamante puede utilizarse cuando género y/o sexo no se conocen o no son relevantes;
- se revisa la representación de portadores;
- se mantienen las líneas de relación convencionales;
- se amplían ejemplos de reproducción asistida.

Referencia:

Bennett RL, French KS, Resta RG, Austin J. *Practice resource-focused revision: Standardized pedigree nomenclature update centered on sex and gender inclusivity: A practice resource of the National Society of Genetic Counselors*. **Journal of Genetic Counseling**. 2022;31:1238–1248. doi:10.1002/jgc4.1621.

## Corrección de 2025

La corrección de 2025 modifica y aclara aspectos de la revisión de 2022, en particular la terminología y representación de reproducción asistida.

PedigrAPP debe aplicar como referencia la versión corregida en caso de discrepancia.

Puntos relevantes:

- se diferencia explícitamente entre **portadora gestacional** y **surrogate**;
- se utiliza `G` para identificar a la portadora gestacional;
- se corrigen ejemplos de reproducción asistida;
- se corrige el símbolo de embarazo ectópico para recuperar la barra que figuraba en las recomendaciones de 2008.

Referencia:

Steinhaus French K, Bennett R, Resta R. *Correction to: Practice resource-focused revision: Standardized pedigree nomenclature update centered on sex and gender inclusivity: A practice resource of the National Society of Genetic Counselors*. **Journal of Genetic Counseling**. 2025;34:e2020. doi:10.1002/jgc4.2020.

## Principio de implementación

Cuando una convención haya cambiado entre publicaciones:

1. se utilizará la recomendación más reciente que corrija o sustituya explícitamente a la anterior;
2. la decisión se documentará;
3. se añadirá un caso sintético de validación;
4. se comprobará la compatibilidad con pedigrees creados con versiones anteriores cuando sea posible.

## Limitaciones

La existencia de una convención publicada no garantiza que todos los escenarios familiares o reproductivos actuales estén completamente cubiertos.

Cuando PedigrAPP represente un escenario no resuelto de manera inequívoca por las referencias:

- deberá evitar inventar una convención que pueda confundirse con una estandarizada;
- la solución deberá documentarse;
- deberá identificarse como extensión, decisión de implementación o limitación;
- se solicitará revisión clínica antes de considerarla estable.
