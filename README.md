# estacionamientoIBPA

Aplicación web **PWA offline-first** para generar, imprimir y leer etiquetas QR con información de contacto encriptada, asociada a placas vehiculares.

## Objetivo del producto

Permitir que un usuario:

1. Capture nombre, teléfono y placa.
2. Genere un QR con la información de contacto encriptada.
3. Imprima una etiqueta térmica con QR + placa en texto plano.
4. Escanee el QR para desencriptar y visualizar el contacto.

## Alcance funcional

### Menú principal

La aplicación incluye tres secciones:

1. **Generar QR**
2. **Leer QR**
3. **Settings**

### Generar QR

- Captura: nombre, teléfono (10 dígitos), placa y país.
- Selector de país tipo toggle:
  - México: `+52`
  - Estados Unidos: `+1`
- Se concatena automáticamente el prefijo de país al teléfono.
- Se construye JSON de contacto (sin placa):

```json
{
  "nombre": "Juan Pérez",
  "telefono": "+526641234567"
}
```

- El JSON se encripta con la llave configurada.
- Se genera un QR con payload encriptado compacto.
- La etiqueta muestra:
  - QR
  - Placa en texto claro

### Leer QR

- Solicita acceso a cámara.
- Escanea y parsea payload versionado del QR.
- Desencripta con la llave configurada.
- Convierte y valida JSON de salida.
- Muestra:
  - Nombre
  - Teléfono como enlace `tel:`

Ejemplo:

```html
<a href="tel:+526641234567">+52 664 123 4567</a>
```

### Settings

- Configuración de llave/contraseña de encriptación.
- Input de llave tipo `password`.
- Persistencia local de llave:
  - **Principal:** IndexedDB
  - **Respaldo:** LocalStorage
- Recuperación automática entre fuentes si una falla.
- La llave puede actualizarse; al cambiarla, QR previos pueden dejar de funcionar.

### Impresión térmica

- Etiqueta optimizada para impresión térmica.
- Tamaño inicial: **2 x 3 pulgadas** (configurable).
- Vista previa previa a imprimir.
- Estilos de impresión con `@media print`.

## Requerimientos técnicos principales

## Stack sugerido

- React + Vite
- Vite PWA Plugin
- Web Crypto API
- IndexedDB + LocalStorage (backup)
- Librería cliente para generación/lectura QR
- CSS de impresión térmica (`@media print`)
- Hosting estático compatible con GitHub Pages

**Restricción:** no depender de backend.

## Encriptación y formato QR

- Algoritmo moderno recomendado: `AES-GCM`.
- Derivación de llave con `PBKDF2`.
- Encriptar solo contacto (no placa).
- Payload QR compacto, minimizando densidad.
- Codificación Base64URL.
- Formato versionado:

```txt
v1.<payloadBase64Url>
```

- Estructura interna esperada:

```txt
[salt][iv][ciphertext]
```

- Evitar JSON descriptivo dentro del QR (por densidad/tamaño).

## PWA y operación offline

La app debe operar sin internet después de la primera carga:

- Service Worker registrado
- Assets estáticos en caché
- `manifest.webmanifest`
- Instalación en dispositivo
- Sin dependencias runtime por CDN
- Generación/lectura QR y cifrado/descifrado funcionando offline

## Buenas prácticas obligatorias

### Código

- Separar lógica de negocio de UI.
- Evitar criptografía en componentes React.
- Usar servicios para QR, crypto, storage e impresión.
- Centralizar validaciones y constantes.
- Manejar errores con tipos/clases específicas.

### Seguridad

- No almacenar contactos.
- No mostrar la llave en texto claro.
- No loggear datos sensibles.
- No persistir JSON desencriptado.
- No incluir datos sensibles en URL.
- Mostrar errores claros sin exponer detalles internos.

### UX

- Mensajes claros cuando falte llave.
- Deshabilitar generación con formulario inválido.
- Advertir impacto de cambio de llave.
- Mostrar vista previa de impresión.

## Casos de uso técnicos clave

- GenerateEncryptedQrLabel
- ReadEncryptedQrLabel
- SaveEncryptionKey
- LoadEncryptionKey
- UpdateEncryptionKey
- PrintLabel
- ValidateContactInput
- RecoverStoredKey
- BuildCompactQrPayload
- ParseCompactQrPayload

## Criterios de aceptación resumidos

- Generar QR con nombre/teléfono/placa y prefijo de país correcto.
- Validar teléfono de 10 dígitos.
- Encriptar con llave de Settings.
- Mostrar placa en claro junto al QR.
- Escanear y desencriptar correctamente.
- Mostrar teléfono como enlace clickeable.
- Persistir llave entre sesiones.
- Funcionar offline tras primera carga.
