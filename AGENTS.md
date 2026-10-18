# PROYECTO: CRISTIAN-YAMAHA — Aplicación web para aprender piano

Actúa como un ingeniero de software sénior especializado en aplicaciones web educativas, audio digital, reconocimiento de notas musicales y diseño responsive para móviles.

Quiero desarrollar una aplicación llamada **Cristian-YAMAHA**, inspirada en la experiencia de aprendizaje progresivo de aplicaciones como Floky, pero sin vídeos. Debe enseñar a tocar el piano mediante notas en un pentagrama, un teclado visual y ejercicios interactivos.

Soy el propietario de un piano digital Yamaha P-145BT de 88 teclas y tengo un móvil Samsung Android para probar la aplicación.

Soy principiante en el desarrollo de este proyecto. Necesito que trabajes de forma ordenada, que tomes decisiones técnicas razonables y que me expliques cada paso con instrucciones claras.

## 1. OBJETIVO PRINCIPAL

Crear una aplicación web que pueda ejecutar en mi ordenador, publicar en internet y abrir desde el navegador de mi Samsung Android mediante un enlace HTTPS.

La aplicación debe permitir practicar piano mostrando la nota que hay que tocar, escuchando el sonido mediante el micrófono del móvil y avanzando automáticamente cuando se detecte la nota correcta.

Quiero que el proyecto sea gratuito para desarrollar y utilizar, sin servicios de pago obligatorios, sin suscripciones, sin API de IA de pago y sin necesidad de crear una cuenta de usuario.

No quiero generar vídeos ni utilizar vídeos pregrabados.

## 2. TECNOLOGÍAS

Utiliza estas tecnologías:

- React.
- TypeScript.
- Vite.
- HTML y CSS responsive.
- Web Audio API para procesar el sonido localmente.
- SVG para dibujar el pentagrama y sus notas.
- LocalStorage para guardar el progreso básico, si resulta necesario.
- Vitest para pruebas unitarias cuando sea apropiado.

No añadas backend, base de datos remota ni dependencias innecesarias en la primera versión.

La detección de notas debe realizarse en el propio navegador. No se debe grabar, almacenar ni transmitir audio del usuario a servidores.

Utiliza versiones estables y compatibles de las dependencias.

## 3. FUNCIONES DE LA PRIMERA VERSIÓN (MVP)

### A. Interfaz

Diseña una interfaz moderna, limpia, agradable y fácil de utilizar, con textos en español.

Debe funcionar tanto en ordenador como en móvil.

Incluye:
- Nombre y logotipo textual PianoLab.
- Pantalla principal de aprendizaje.
- Área de lección actual.
- Pentagrama musical.
- Nombre de la nota que se debe tocar.
- Teclado virtual de piano.
- Indicador del progreso de la lección.
- Botón para activar y desactivar el micrófono.
- Mensajes claros de acierto, error y finalización.
- Un modo de demostración para probar la aplicación sin un piano real.

Evita una interfaz recargada. Los botones deben ser suficientemente grandes para una pantalla táctil.

### B. Teclado virtual de 88 teclas

Representa las 88 teclas estándar de un piano, desde A0 hasta C8.

Incluye:
- Teclas blancas y negras en su posición correcta.
- Nombres de las notas en notación española: Do, Do#, Re, Re#, Mi, Fa, Fa#, Sol, Sol#, La, La#, Si.
- Indicadores de octava, por ejemplo Do4.
- Resaltado visual de la nota objetivo.
- Resaltado de la nota detectada cuando sea posible.
- Interacción táctil y con ratón.
- Diseño que permita recorrer el teclado en móvil sin deformar las teclas.

No intentes mostrar las 88 teclas diminutas simultáneamente en una pantalla pequeña. Permite desplazamiento horizontal y añade controles para centrar una octava o la zona relevante.

Asegúrate de calcular correctamente la correspondencia entre frecuencia, número MIDI, nota musical y octava. Documenta la convención de octavas utilizada.

### C. Pentagrama musical

Dibuja un pentagrama real mediante SVG.

En la primera versión:
- Utiliza la clave de sol.
- Representa las cinco líneas correctamente.
- Coloca cada nota en la altura correspondiente.
- Añade líneas adicionales cuando sean necesarias.
- Muestra la nota objetivo de forma destacada.
- Muestra el nombre de la nota y su octava.
- Mantén sincronizados el pentagrama, el teclado y el ejercicio.

La colocación debe calcularse a partir de la altura musical, no mediante posiciones arbitrarias.

Prepara el código para añadir posteriormente la clave de fa y partituras completas.

### D. Lecciones progresivas

Crea una primera lección de cinco notas individuales.

Incluye:
- Una nota objetivo cada vez.
- Una indicación visual de la tecla que hay que tocar.
- Un botón para escuchar una referencia sonora generada mediante Web Audio API, sin archivos de audio externos.
- Un botón para repetir la instrucción.
- Avance automático al reconocer la nota correcta.
- Mensaje positivo cuando se acierte.
- Mensaje de ayuda cuando la nota sea incorrecta.
- Indicador de cuántas notas se han completado.
- Pantalla de finalización al acabar las cinco notas.
- Botón para repetir la lección.

Evita que una nota sostenida provoque múltiples avances. Exige una nueva detección válida o una breve liberación entre notas.

La lógica de lecciones debe estar separada del código de detección de audio.

### E. Reconocimiento de notas mediante el micrófono

Implementa una primera versión funcional de detección monofónica.

Requisitos:
- Solicitar permiso al usuario de forma explícita.
- Activar y detener correctamente el micrófono.
- Procesar el sonido localmente.
- Estimar la frecuencia fundamental con un algoritmo adecuado, por ejemplo YIN o una alternativa bien justificada.
- Convertir la frecuencia estimada en la nota musical más cercana.
- Mostrar la frecuencia aproximada, la nota estimada y una medida de confianza cuando el algoritmo lo permita.
- Utilizar umbrales de confianza para evitar falsos aciertos.
- Ignorar el silencio y el ruido cuando sea posible.
- Incorporar una pequeña tolerancia de afinación.
- Evitar contar repetidamente una misma nota sostenida.
- Liberar los recursos de audio al detener la escucha o abandonar la pantalla.
- Mostrar errores comprensibles si se deniega el permiso o el navegador no es compatible.

No afirmes que se ha detectado una nota si no existe una estimación válida.

El sonido de un piano contiene armónicos y resonancias. Documenta las limitaciones del reconocimiento mediante micrófono, especialmente para acordes, varias notas simultáneas, ruido ambiental y reverberación.

La primera versión solo necesita reconocer una nota predominante cada vez. No implementes reconocimiento polifónico avanzado.

### F. Modo de demostración

Crea un modo de demostración que permita probar el flujo de la lección sin activar el micrófono.

Debe permitir simular la nota correcta o una incorrecta, avanzar y comprobar la interfaz.

Identifica claramente cuándo se está utilizando la simulación. Nunca presentes una nota simulada como si hubiera sido detectada acústicamente.

## 4. COMPATIBILIDAD CON MI EQUIPO

Mi piano es un Yamaha P-145BT de 88 teclas y mi móvil es un Samsung Android.

Prioriza que funcione en navegadores Android modernos, especialmente Chrome.

El acceso al micrófono debe funcionar mediante HTTPS en la versión publicada y requerir permiso explícito.

Prepara la arquitectura para poder incorporar más adelante entrada MIDI por USB, pero no hagas que esa función sea necesaria para el MVP.

No supongas que Bluetooth del piano transmite MIDI. No exijas comprar adaptadores ni hardware adicional.

## 5. PUBLICACIÓN EN LA NUBE

Quiero publicar la aplicación para acceder a ella desde mi Samsung usando un enlace web.

Prepara el proyecto para desplegarse como una aplicación estática en un servicio con plan gratuito, por ejemplo Vercel o Netlify.

Incluye:
- Comando de compilación de producción.
- Configuración necesaria para el despliegue.
- Archivo README.md en español.
- Instrucciones para ejecutar el proyecto localmente.
- Instrucciones para comprobar la versión de producción.
- Instrucciones de publicación gratuitas, señalando cualquier límite o requisito del proveedor.
- Pasos para abrir el enlace HTTPS desde Android y conceder permiso al micrófono.

No afirmes que la aplicación está publicada si no has realizado realmente el despliegue. No inventes enlaces ni credenciales.

## 6. CALIDAD DEL CÓDIGO

Organiza el proyecto en componentes y módulos claros. Como mínimo, separa:

- Interfaz principal.
- Teclado virtual.
- Pentagrama.
- Sistema de lecciones.
- Captura y análisis de audio.
- Conversión de frecuencias a notas.
- Modo de demostración.

Añade comentarios solo donde ayuden a entender cálculos o decisiones importantes.

Incluye pruebas unitarias para la conversión entre frecuencias, notas, octavas y números MIDI, así como para la lógica de avance de las lecciones.

Gestiona errores y estados de carga.

No dejes botones decorativos que aparenten funcionar sin implementar su comportamiento.

No uses datos falsos para simular que el micrófono funciona. La simulación solo debe existir en el modo de demostración identificado como tal.

No añadas analítica, publicidad, seguimiento de usuarios ni transmisión de audio.

## 7. MÉTODO DE TRABAJO OBLIGATORIO

Trabaja por fases y no intentes construirlo todo de golpe.

FASE 1:
- Inspecciona el entorno y los archivos existentes.
- Comprueba qué herramientas están disponibles.
- Explica brevemente la arquitectura.
- Inicializa el proyecto React + TypeScript + Vite si todavía no existe.
- No sobrescribas archivos existentes sin comprobarlos.
- Instala las dependencias necesarias.
- Ejecuta la aplicación y comprueba que arranca.

FASE 2:
- Implementa la interfaz responsive.
- Implementa el teclado de 88 teclas.
- Implementa el pentagrama y la representación de notas.
- Implementa la primera lección y el modo de demostración.
- Ejecuta las pruebas y corrige los errores.

FASE 3:
- Implementa la detección real mediante micrófono.
- Prueba los casos de error y los permisos.
- Ejecuta las pruebas unitarias.
- Corrige los problemas detectados.

FASE 4:
- Comprueba la compilación de producción.
- Prepara la publicación.
- Dame instrucciones precisas para desplegar y probar en mi Samsung.

Al finalizar cada fase:
1. Resume qué has hecho.
2. Enumera los archivos creados o modificados.
3. Indica los comandos ejecutados y sus resultados reales.
4. Explica cualquier limitación pendiente.
5. Dime cómo probar el resultado.
6. Espera mi confirmación antes de pasar a la siguiente fase, salvo que yo te pida expresamente continuar.

## 8. INSTRUCCIONES PARA EMPEZAR AHORA

Empieza exclusivamente por la FASE 1.

Primero identifica si tienes acceso a una terminal y a un sistema de archivos, y comprueba el directorio de trabajo actual.

Si puedes ejecutar comandos, comprueba las versiones de Node.js y npm, y revisa los archivos existentes antes de modificarlos.

Si no tienes acceso a terminal o sistema de archivos, no finjas que has creado el proyecto. En ese caso, dame los comandos exactos que debo ejecutar y espera a que te facilite los resultados.

No me des una lista enorme de tareas futuras. Guíame paso a paso, con una instrucción clara cada vez.

El objetivo es terminar con una primera versión real, funcional, gratuita y desplegable de PianoLab, no solo con una maqueta visual.