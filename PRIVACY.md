# Privacidad y tratamiento de datos

## Principio general

La edición online de PedigrAPP está diseñada para funcionar íntegramente en el navegador del usuario.

PedigrAPP no proporciona un backend para recibir o almacenar árboles genealógicos y no pretende actuar como repositorio de información clínica.

## Datos guardados en el navegador

La opción **Guardar** utiliza almacenamiento local del navegador.

Esto significa que:

- los datos permanecen asociados al navegador y al origen web desde el que se ejecuta PedigrAPP;
- PedigrAPP no recibe una copia de esos datos;
- borrar los datos del navegador puede eliminar los casos guardados localmente;
- cambiar de navegador, dispositivo, dominio o puerto puede dar lugar a un almacenamiento local diferente.

Para conservación y traslado de casos se recomienda utilizar la exportación JSON y custodiar el archivo resultante de acuerdo con las políticas locales de protección de datos.

## Importación y exportación

Los archivos JSON y PED se leen localmente mediante las capacidades del navegador.

Los archivos JSON, PED, SVG y PNG se generan localmente.

La generación de PDF se realiza mediante el navegador y su función de impresión/guardado como PDF.

## Tráfico de red

La arquitectura objetivo de la edición online no requiere transmitir a PedigrAPP:

- nombres;
- identificadores;
- relaciones familiares;
- información clínica;
- información genética;
- archivos importados;
- árboles exportados.

Los recursos estáticos de la propia aplicación pueden descargarse desde el servidor que hospede PedigrAPP, como ocurre con cualquier aplicación web.

## Responsabilidad del usuario

PedigrAPP es una herramienta de representación. El usuario o la institución que la utiliza es responsable de:

- determinar qué información puede introducir;
- aplicar las políticas de confidencialidad correspondientes;
- custodiar los archivos exportados;
- aplicar las medidas de seguridad exigidas por su organización y por la normativa aplicable.

## Desarrollo y soporte

No deben enviarse datos clínicos identificables mediante:

- issues de GitHub;
- pull requests;
- correos de soporte;
- capturas de pantalla;
- archivos de ejemplo.

Los casos necesarios para reproducir un error deben ser sintéticos o estar adecuadamente desidentificados.

## Contacto

Para cuestiones relacionadas con privacidad:

**José Miguel Lezana Rosales**  
josemiguel.lezana@salud.madrid.org
