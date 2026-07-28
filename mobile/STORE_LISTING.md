# Warraya — App Store listing package (iOS)

Everything needed to create the App Store Connect record and get to TestFlight.
Copy fields verbatim. Character limits are noted. No "AI" wording anywhere (the
receipt scan is described by what it does). English (U.S.) is the primary
language; a Spanish (Mexico) mirror can be added later.

---

## 0. Decisions (locked)

- **App name:** Warraya: Warranty Tracker
- **Support email:** hello@warraya.com (now set in the app; create this mailbox on warraya.com so it can receive mail)
- **Languages:** English (U.S.) ONLY (owner decision 2026-07-27, at the 2.0.0
  submission). The Spanish (Mexico) localization must be REMOVED in App Store
  Connect, not just left unedited: it exists there with pre-fix copy, and a
  stale es-MX description without the EULA link or the paid-subscription
  disclosure can re-trigger the 3.1.2/2.3.2 rejections on its own. Section 9
  below is retained for a future re-launch but must not be pasted.

---

## 1. App Information (set once)

- **Name:** Warraya: Warranty Tracker
- **Subtitle (30 max):** Track warranties & receipts
- **Bundle ID:** com.warraya.app  (already set in app.config.ts)
- **SKU:** warraya-ios-1
- **Primary language:** English (U.S.)
- **Primary category:** Productivity
- **Secondary category:** Utilities
- **Content rights (third-party content?):** No
- **Privacy Policy URL:** https://warraya.com/privacy
- **User access:** Full Access
- **License Agreement:** leave as Apple's Standard EULA. Because the app sells
  auto-renewable subscriptions, guideline 3.1.2 then requires a *functional link*
  to that EULA inside the App Description itself. That link is the last block of
  the description below. Removing it gets the build rejected (it did, 2026-07-22).
  Only switch to a Custom EULA if warraya.com/terms is ever rewritten as a real
  end-user license, and if you do, paste it into this field rather than linking it.

---

## 2. Version fields (2.0.0)

**Promotional text (170 max):**
Stop paying for repairs your warranty already covers. Warraya saves every receipt and reminds you before coverage ends, so you can file the claim in time.

**Keywords (100 max, comma separated; 98 chars. Single words on purpose: Apple
combines them into phrases (proof+purchase, home+inventory) so spaces only
waste characters. "warranty", "receipts", and "track" are already in the
name/subtitle, so they are deliberately not repeated. Term choice is ASO
judgment, not data: the app has never been live, so revisit once real App
Store search data exists. Keywords are metadata-only, changeable on any
submission without a build.):**
guarantee,proof,purchase,home,inventory,expiry,reminder,appliance,electronics,repair,claim,invoice

**Support URL:** https://warraya.com
**Marketing URL (optional):** https://warraya.com
**Copyright:** 2026 Warraya

**Description:**

You already paid for the warranty. Warraya makes sure you actually use it.

Almost everything you buy comes with coverage: a promise of free repair or replacement. But when something breaks, the receipt is gone, the deadline has passed, and you end up paying for something the manufacturer owed you. Warraya keeps every receipt and every warranty in one place, and reminds you before coverage runs out.

SNAP ONCE, SAVE FOREVER
Take a photo of any paper receipt or upload one from your files. Warraya reads the product, store, price, and purchase date for you and files it in seconds. No typing, no folders.

A HEADS UP BEFORE IT IS TOO LATE
Warraya reminds you 30 days and 7 days before any warranty ends, so you have time to test the product and file a claim while coverage is still active.

EVERY RECEIPT, ONE TAP AWAY
When something breaks, there is no digging through drawers or scrolling old emails. Ask Warry, your warranty and receipt steward: search by product, brand, store, category, serial number, or the notes you wrote, and the proof is right there.

MORE THAN ONE DOCUMENT PER PRODUCT
Attach extra photos and PDF files to any warranty: the invoice, the warranty card, the service report. Open them full screen or share them straight from the app when it is time to file a claim.

REPAIRS AND SERVICES COUNT TOO
A repair comes with a labor warranty just like a product does. Save the AC fix, the plumbing job, or the car service, and Warraya watches its coverage the same way.

WHAT PEOPLE KEEP IN WARRAYA
Phones and laptops, TVs and headphones, kitchen appliances, washers and dryers, furniture, power tools, strollers and car seats, bikes and e-scooters. If it came with a warranty, it belongs here.

PRIVATE BY DESIGN
Your receipts and product details are stored securely and are never sold or shared. You can delete your account and everything in it at any time.

Spend one minute today and save hundreds the next time something breaks.

WARRAYA PREMIUM SUBSCRIPTION
Warraya Premium is an optional auto-renewing subscription: a paid upgrade, not a free feature. Warraya itself is free to use, with 5 warranties and 3 receipt scans. Warraya Premium removes both limits: unlimited warranties and unlimited receipt scans.

Warraya Premium Monthly: $4.99 per month
Warraya Premium Annual: $29.99 per year

Both plans begin with a 3 day free trial. Payment is charged to your Apple Account when you confirm the purchase. The subscription renews automatically at the same price unless you turn off auto renew at least 24 hours before the current period ends, and your account is charged for the renewal within the 24 hours before the period ends. Any unused part of a free trial is forfeited when you buy a subscription. You can manage the subscription and turn off auto renew in your Apple Account settings after purchase.

Terms of Use (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Privacy Policy: https://warraya.com/privacy

**What's New in this version (2.0.0):**
Warraya 2.0 introduces Warry, your warranty and receipt steward. Search everything you own by product, brand, store, category, serial number, or notes. Save warranties for repairs and services, attach photos and PDF documents to any warranty and share them from the app, set a profile picture with the new crop tool, and get around faster with the redesigned navigation bar.

---

## 3. App Privacy (App Store Connect → App Privacy)

No third-party analytics, tracking, or advertising SDKs are in the app, and
expiry reminders are local (no push tokens leave the device). Declare:

**Data collected and linked to the user (all for App Functionality, none for tracking):**
- Contact Info → Email Address — account creation and sign-in
- Contact Info → Name — the optional display name in the profile
- User Content → Photos or Videos — receipt and avatar images
- User Content → Other User Content — warranty and product details the user enters
- Identifiers → User ID — account identity

Do NOT select "Emails or Text Messages" — Warraya never reads the user's emails
or texts. The receipt scan is a photo the user takes.

**For every item above:** Used for App Functionality = Yes; Linked to identity = Yes; Used for Tracking = No.
**Data used to track you:** None.
**Data shared with third parties:** None.

(If crash reporting or analytics is added later, update this section.)

---

## 4. Age rating

Answer every content question **None / No**. Result: **4+**.

## 5. Export compliance

The app declares `ITSAppUsesNonExemptEncryption: false` in app.config.ts (it
only uses standard HTTPS, which is exempt), so uploads will not prompt export
questions. No documents required.

---

## 6. TestFlight

**Internal testing (up to 100 of your own team): no review needed.** You only
need the app record + an uploaded build. This is the fastest path.

**External testing (public / email links, up to 10,000): needs Beta App Review.**
Fill these:

- **Beta App Description:** Warraya keeps your receipts and warranties in one place and reminds you before coverage expires.
- **What to Test:**
  1. Create an account with your email and a password (no confirmation email, you are signed in right away).
  2. Add a warranty manually, then add one by taking a photo of a receipt.
  3. Confirm the details read from the receipt are correct.
  4. Open a warranty, check the coverage bar, edit and delete.
  5. Confirm you receive an expiry reminder notification.
  6. In Settings, set your name, photo, and theme.
- **Feedback email:** hello@warraya.com
- **Marketing URL:** https://warraya.com
- **Beta App Review contact:** your name, phone, email.

> Sign-in is email + password and Supabase `mailer_autoconfirm` is on, so signing
> up returns a session immediately with no confirmation email. A reviewer can
> create their own account unaided, which is why no demo account is required.
> (This replaced the old emailed 6-digit code flow, which a reviewer could not
> have completed.)

---

## 7. Screenshots (you create the images; captions to overlay)

Not required for internal TestFlight. Required before public submission.
Minimum: the 6.9-inch iPhone set (1320 x 2868 portrait). 3 to 6 images
recommended, up to 10. Suggested shots and captions:

1. Vault list with a few warranties and status badges — "Every warranty in one place."
2. Receipt scan screen — "Snap a receipt. Filed in seconds."
3. Expiring state or reminder — "We warn you before coverage ends."
4. Warranty detail with the coverage bar — "Proof of purchase, always with you."
5. Money angle — "Claim what you already paid for."

---

## 8. Order of operations to reach TestFlight

1. Build the iOS production binary (registers the bundle ID and certificates):
   `eas build --profile production --platform ios`
2. Create the app record in App Store Connect using Section 1 above.
3. Upload the build: `eas submit --profile production --platform ios`
   (this can also create the app record for you if it does not exist yet).
4. In App Store Connect → TestFlight, wait for the build to finish processing,
   confirm export compliance if asked, then add internal testers.

---

## 9. Spanish (Mexico) — es-MX mirror (RETIRED 2026-07-27, DO NOT PASTE)

Owner decision at the 2.0.0 submission: the listing is English only. The es-MX
localization was removed from App Store Connect. This section is kept current
(it was updated for 2.0.0 alongside the English) so a future Spanish re-launch
is one paste away, but nothing below goes into ASC today.
Same rules: the scan is described by what it does, no dashes.

**Name (30 max):** Warraya: Control de Garantías
**Subtitle (30 max):** Controla garantías y recibos

**Promotional text (170 max):**
Deja de pagar reparaciones que tu garantía ya cubre. Warraya guarda cada recibo y te avisa antes de que termine la cobertura, para que reclames a tiempo.

**Keywords (100 max; 91 chars. "garantías" and "recibos" live in the es name/subtitle, so they are not repeated):**
comprobante,factura,recordatorio,vencimiento,electrodomestico,reparacion,reclamo,inventario

**Description:**

Ya pagaste por la garantía. Warraya se asegura de que de verdad la aproveches.

Casi todo lo que compras incluye una garantía: la promesa de una reparación o un reemplazo sin costo. Pero cuando algo se descompone, el recibo ya no aparece, la fecha límite pasó, y terminas pagando por algo que el fabricante te debía. Warraya guarda cada recibo y cada garantía en un solo lugar, y te avisa antes de que termine la cobertura.

TÓMALE UNA FOTO Y LISTO
Toma una foto de cualquier recibo en papel o sube uno desde tus archivos. Warraya lee el producto, la tienda, el precio y la fecha de compra por ti y lo guarda en segundos. Sin escribir, sin carpetas.

UN AVISO ANTES DE QUE SEA TARDE
Warraya te avisa 30 y 7 días antes de que termine cada garantía, para que tengas tiempo de probar el producto y hacer tu reclamo mientras la cobertura sigue activa.

CADA RECIBO, A UN TOQUE
Cuando algo se descompone, no tienes que buscar en cajones ni entre correos viejos. Pídeselo a Warry, tu mayordomo de garantías y recibos: busca por producto, marca, tienda, categoría, número de serie o las notas que escribiste, y ahí está el comprobante.

MÁS DE UN DOCUMENTO POR PRODUCTO
Adjunta más fotos y archivos PDF a cualquier garantía: la factura, la póliza, el reporte de servicio. Ábrelos en pantalla completa o compártelos directo desde la app cuando toque reclamar.

LAS REPARACIONES Y SERVICIOS TAMBIÉN CUENTAN
Una reparación tiene garantía de mano de obra igual que un producto. Guarda la reparación del aire acondicionado, la plomería o el servicio del auto, y Warraya vigila su cobertura de la misma forma.

QUÉ GUARDA LA GENTE EN WARRAYA
Teléfonos y laptops, televisores y audífonos, electrodomésticos de cocina, lavadoras y secadoras, muebles, herramientas eléctricas, carriolas y sillas para auto, bicicletas y scooters. Si vino con garantía, aquí va.

PRIVADO POR DISEÑO
Tus recibos y los detalles de tus productos se guardan de forma segura y nunca se venden ni se comparten. Puedes borrar tu cuenta y todo lo que contiene cuando quieras.

Dedica un minuto hoy y ahórrate cientos la próxima vez que algo se descomponga.

SUSCRIPCIÓN WARRAYA PREMIUM
Warraya Premium es una suscripción opcional de renovación automática: una mejora de pago, no una función gratuita. Warraya en sí es gratis, con 5 garantías y 3 escaneos de recibo. Warraya Premium quita los dos límites: garantías ilimitadas y escaneos de recibo ilimitados.

Warraya Premium Mensual: $4.99 USD al mes
Warraya Premium Anual: $29.99 USD al año

Los dos planes empiezan con 3 días de prueba gratis. El cargo se hace a tu cuenta de Apple al confirmar la compra. La suscripción se renueva automáticamente al mismo precio, a menos que desactives la renovación automática por lo menos 24 horas antes de que termine el periodo, y el cargo de la renovación se hace dentro de las 24 horas antes de que termine. Si compras una suscripción, se pierde la parte de la prueba gratis que no hayas usado. Puedes administrar la suscripción y desactivar la renovación automática en los ajustes de tu cuenta de Apple después de comprar.

Términos de uso (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Aviso de privacidad: https://warraya.com/privacy

**What's New (2.0.0):**
Warraya 2.0 presenta a Warry, tu mayordomo de garantías y recibos. Busca todo lo que tienes por producto, marca, tienda, categoría, número de serie o notas. Guarda garantías de reparaciones y servicios, adjunta fotos y archivos PDF a cualquier garantía y compártelos desde la app, ponte una foto de perfil con la nueva herramienta de recorte, y muévete más rápido con la barra de navegación rediseñada.

**What to Test (es-MX):**
1. Crea una cuenta con tu correo y una contraseña (no llega correo de confirmación, entras de inmediato).
2. Agrega una garantía a mano y luego otra tomando una foto del recibo.
3. Confirma que los datos leídos del recibo sean correctos.
4. Abre una garantía, revisa la barra de cobertura, edítala y bórrala.
5. Confirma que recibes la notificación de vencimiento.
6. En Ajustes, pon tu nombre, foto y tema.
