# Requerimientos técnicos de la WebApp

## 1. Stack sugerido

La aplicación deberá desarrollarse como una SPA/PWA usando:

* React + Vite
* Vite PWA Plugin
* Web Crypto API
* IndexedDB
* LocalStorage como respaldo
* Librería cliente para:

  * Generación de QR
  * Lectura de QR desde cámara
* CSS para impresión térmica con `@media print`
* Hosting estático compatible con GitHub Pages

La aplicación no deberá depender de backend.


## 2. Arquitectura propuesta

Se recomienda una arquitectura orientada al dominio y casos de uso, siguiendo el principio de Screaming Architecture: la estructura del proyecto debe comunicar claramente que la aplicación sirve para generar, imprimir, leer y desencriptar etiquetas QR.

Ejemplo:

```txt
src/
  app/
    router/
    providers/
    pwa/

  features/
    generate-label/
      components/
      use-cases/
      services/

    scan-label/
      components/
      use-cases/
      services/

    settings/
      components/
      use-cases/
      services/

  domain/
    contact/
      contact.types.ts
      contact.validation.ts

    label/
      label.types.ts
      label.constants.ts

    crypto/
      crypto.types.ts

  infrastructure/
    crypto/
      webCryptoEncryption.ts

    storage/
      indexedDbKeyStore.ts
      localStorageKeyBackup.ts
      keyRecoveryService.ts

    qr/
      qrGenerator.ts
      qrScanner.ts

    printing/
      labelPrintService.ts

  shared/
    components/
    hooks/
    utils/
    errors/
```

La intención es que el proyecto “grite” sus capacidades principales:

* Generar etiqueta
* Leer etiqueta
* Configurar llave
* Encriptar / desencriptar
* Imprimir
* Operar offline


## 3. Módulos principales

### 3.1 Generación de etiqueta

La aplicación deberá contar con un módulo responsable de capturar, validar y transformar la información antes de generar el QR.

Responsabilidades técnicas:

* Validar nombre, teléfono, placa y país.
* Aceptar únicamente teléfonos de 10 dígitos.
* Concatenar automáticamente el código de país:

  * México: `+52`
  * Estados Unidos: `+1`
* Construir un JSON únicamente con datos de contacto:

```js
{
  nombre: string;
  telefono: string;
}
```

* Excluir la placa del contenido encriptado.
* Encriptar el JSON usando la llave configurada.
* Generar un payload compacto optimizado para QR.
* Generar el QR usando el payload compacto encriptado.
* Minimizar el tamaño del contenido del QR para mejorar:

  * velocidad de lectura
  * tolerancia de impresión térmica
  * tamaño físico del QR
  * confiabilidad de escaneo
* Mostrar vista previa de etiqueta con:

  * QR
  * Placa en texto plano

### 3.2 Encriptación y payload compacto para QR

La encriptación deberá implementarse usando Web Crypto API.

El contenido del QR deberá mantenerse lo más pequeño posible para reducir densidad, mejorar velocidad de lectura y aumentar confiabilidad en impresión térmica.

Requerimientos técnicos:

* Usar un algoritmo moderno como `AES-GCM`.
* Derivar la llave criptográfica desde la contraseña configurada usando `PBKDF2`.
* Encriptar únicamente la información de contacto.
* No incluir la placa dentro del contenido encriptado.
* No serializar dentro del QR un JSON descriptivo con campos como:

  * `alg`
  * `salt`
  * `iv`
  * `data`
* Usar un formato compacto de payload.
* Codificar el payload usando Base64URL.
* Incluir únicamente un prefijo mínimo de versión para permitir evolución futura del formato.

Formato recomendado:
		
	  
			  

```txt
v1.<payloadBase64Url>
```

Internamente el payload representará:

```txt
[salt][iv][ciphertext]
```

La aplicación deberá conocer internamente cómo interpretar el payload:

```txt
salt: primeros N bytes
iv: siguientes N bytes
ciphertext: bytes restantes
```

Ejemplo conceptual:

```txt
v1.Qk7x9aP0zLm2s8NwYb3...
```

El QR no deberá contener un JSON descriptivo como:

```json
{
  "v": 1,
  "alg": "AES-GCM",
  "salt": "...",
  "iv": "...",
  "data": "..."
}
```

La razón es evitar incrementar innecesariamente la densidad del QR.


### 3.3 Lectura de QR

El módulo de lectura deberá:

* Solicitar acceso a la cámara.
* Leer el contenido del QR.
* Interpretar el payload compacto según la versión indicada.
* Separar internamente:

  * salt
  * iv
  * ciphertext
* Obtener la llave configurada.
* Intentar desencriptar.
* Convertir el resultado a JSON.
* Validar que el JSON tenga la estructura esperada.
* Mostrar:

  * Nombre
  * Teléfono como enlace `tel:`

Ejemplo:

```html
<a href="tel:+526641234567">+52 664 123 4567</a>
```

Errores esperados:

* No existe llave configurada.
* Llave incorrecta.
* QR inválido.
* Payload corrupto.
* JSON inválido.
* Permiso de cámara denegado.


### 3.4 Settings

El módulo de Settings deberá manejar exclusivamente la configuración de la llave.

Requerimientos técnicos:

* El input debe ser `type="password"`.
* La llave deberá persistirse localmente.
* IndexedDB será la fuente principal.
* LocalStorage será respaldo secundario.
* Debe existir un servicio de recuperación que intente:

  1. Leer desde IndexedDB.
  2. Si falla, leer desde LocalStorage.
  3. Si una fuente falta, restaurarla desde la otra.

No es necesario soportar múltiples llaves ni compatibilidad con etiquetas antiguas.


### 3.5 Impresión

La etiqueta deberá generarse con diseño optimizado para impresión térmica.

Requerimientos técnicos:

* Definir el tamaño de etiqueta como configuración y no hardcodeado.
* Tamaño inicial:

```js
const LABEL_SIZE = {
  width: '3in',
  height: '2in'
};
```

O bien:

```js
const LABEL_SIZE = {
  widthInches: 3,
  heightInches: 2
};
```

* Usar estilos específicos para impresión:

```css
@media print {
  @page {
    size: 3in 2in;
    margin: 0;
  }
}
```

* Mantener suficiente tamaño visual para el QR.
* Evitar márgenes innecesarios que reduzcan área útil.
* Priorizar contraste alto y nitidez para impresión térmica.
* Incluir vista previa antes de imprimir.
* Separar el componente visual de etiqueta del mecanismo de impresión.


## 4. PWA y operación offline

La aplicación deberá funcionar completamente offline después de la primera carga.

Requerimientos técnicos:

* Registrar Service Worker.
* Cachear assets estáticos.
* Incluir `manifest.webmanifest`.
* Soportar instalación en dispositivo.
* Evitar dependencias runtime desde CDN.
* Todas las librerías necesarias deberán ir empaquetadas en el build.
* Todas las operaciones de:

  * serialización
  * codificación Base64URL
  * encriptación
  * desencriptación
  * generación QR
  * lectura QR
    deberán funcionar completamente offline.


## 5. Buenas prácticas obligatorias

### Código

* Separar lógica de negocio de componentes UI.
* Evitar lógica criptográfica directamente dentro de componentes React.
* Usar servicios para:

  * QR
  * Crypto
  * Storage
  * Printing
* Centralizar validaciones.
* Centralizar constantes configurables.
* Manejar errores con tipos o clases específicas.
* Evitar almacenar información de contacto desencriptada.


### Seguridad

* No guardar contactos.
* No mostrar la llave en texto claro.
* No loggear datos sensibles.
* No incluir datos sensibles en URL.
* No persistir el JSON desencriptado.
* Limpiar estados sensibles cuando ya no sean necesarios.
* Mostrar errores claros sin exponer detalles internos de la encriptación.
* No incluir metadatos descriptivos innecesarios dentro del QR.
* El QR deberá contener únicamente la información mínima requerida para desencriptar el contacto.


### UX

* Mostrar mensajes claros cuando falte la llave.
* Deshabilitar generación de QR si el formulario es inválido.
* Mostrar vista previa antes de imprimir.
* Permitir actualizar llave desde Settings con advertencia.
* Informar que etiquetas anteriores pueden dejar de funcionar si cambia la llave.


## 6. Casos de uso técnicos principales

```txt
GenerateEncryptedQrLabel
ReadEncryptedQrLabel
SaveEncryptionKey
LoadEncryptionKey
UpdateEncryptionKey
PrintLabel
ValidateContactInput
RecoverStoredKey
BuildCompactQrPayload
ParseCompactQrPayload
```

Estos casos de uso deberían ser independientes de React siempre que sea posible.


## 7. Requerimientos no funcionales

* La aplicación debe poder desplegarse como sitio estático.
* Debe funcionar en navegadores modernos móviles y desktop.
* Debe soportar instalación como PWA.
* Debe funcionar offline después de la primera carga.
* Debe tener tiempos de carga razonables.
* Debe minimizar dependencias externas.
* Debe minimizar tamaño y densidad del QR.
* Debe ser mantenible para futuros cambios de:

  * tamaño de etiqueta
  * formato de QR
  * algoritmo de encriptación
  * países soportados
  * diseño de impresión


## 8. Pruebas recomendadas

No es necesario cubrir todo exhaustivamente, pero sí los flujos críticos:

* Validación de teléfono de 10 dígitos.
* Construcción correcta del teléfono con `+1` o `+52`.
* Encriptar y desencriptar con la misma llave.
* Fallar al desencriptar con llave incorrecta.
* Generar QR válido.
* Leer QR válido.
* Persistir llave en IndexedDB.
* Recuperar llave desde LocalStorage si IndexedDB falla.
* Verificar que la placa no esté dentro del contenido del QR.
* Verificar que el payload use formato compacto:

```txt
v1.<payload>
```

* Verificar que el payload no sea JSON descriptivo.
* Verificar que el tamaño del QR sea razonablemente pequeño.
* Verificar interpretación correcta de:

  * salt
  * iv
  * ciphertext
* Verificar impresión en tamaño 2 x 3 pulgadas.


## 9. Decisiones técnicas aceptadas

* La llave se guarda localmente.
* La llave no se considera completamente secreta si alguien tiene acceso al dispositivo.
* No se almacenan contactos.
* No se mantiene compatibilidad con llaves anteriores.
* No se requiere backend.
* GitHub Pages es un destino válido de despliegue.
* El tamaño de etiqueta inicial es 2 x 3 pulgadas, pero debe quedar fácilmente configurable.
* El formato del QR prioriza baja densidad sobre legibilidad humana.
* Se usará un payload compacto versionado en lugar de JSON descriptivo.


## 10. Resultado esperado

La solución técnica debe permitir construir una PWA offline-first, mantenible y modular, donde los módulos principales estén claramente separados:

```txt
Generar etiqueta
Leer etiqueta
Configurar llave
Encriptar / desencriptar
Persistir configuración
Imprimir etiqueta
```

La arquitectura debe favorecer cambios futuros sin reescribir el núcleo de la aplicación.
