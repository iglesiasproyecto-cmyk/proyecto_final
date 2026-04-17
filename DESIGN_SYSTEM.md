# 🛡️ S.E.I. Design System v1.0
## Visión Técnica & Liderazgo Estratégico

Este documento define la identidad visual y los estándares de diseño para el **Soporte Estructural de Iglesias (S.E.I.)**. Este sistema se basa en una estética **Cinemática High-Tech** con principios de **Glassmorphism**.

---

## 🎨 1. Paleta de Colores

### 🌑 Fondos Principales (Atmosphere)
- **Deep Midnight:** `#061424` (Fondo base absoluto)
- **Tech Navy:** `#0c2340` (Fondo secundario y contenedores)
- **Glass Overlay:** `rgba(255, 255, 255, 0.05)` (Capas de cristal)

### 💎 Colores de Marca (Identity)
- **Steel Blue:** `#4682b4` (Color principal de acción)
- **Soft Azure:** `#709dbd` (Gradientes y estados hover)
- **White Pure:** `#ffffff` (Texto principal y elementos de alto contraste)

### ⚡ Acentos Atmosféricos (FX)
- **Neon Cyan:** `#22d3ee` (Resplandores, HUD y estados activos)
- **Electric Purple:** `#9333ea` (Pulsos de color y profundidad en landing)

---

## ✍️ 2. Tipografía

### 📐 Estándares de Texto
- **Fuente:** System Sans-Serif (Inter / Roboto / UI Default)
- **Títulos Hero:** `font-black text-6xl+ uppercase italic tracking-tighter`
- **Subtítulos:** `uppercase tracking-[0.4em] font-bold italic`
- **Cuerpo:** `text-sm font-medium tracking-wide opacity-80`

### 🎨 Efectos de Texto
- **Gradient-X:** Animación de flujo cromático entre Blanco -> Cian -> Púrpura.
- **Drop-Shadow:** Sombra de largo alcance (`0_10px_30px_rgba(0,0,0,0.5)`) para legibilidad sobre fondos complejos.

---

## 🦅 3. Identidad de Marca (Logo)

### **El Águila con Escudo "S"**
- **Símbolo:** Águila majestuosa con alas extendidas (Alusión a visión y expansión).
- **Escudo Central:** Círculo oscuro con una "S" estilizada en cian claro.
- **Implementación:** 
  - Archivo: `sei_logo_official.png`
  - Técnica de Render: Originalmente sobre fondo blanco en contenedores o con `mix-blend-screen` en atmósferas oscuras.
- **Interacción:** Soporta Parallax 3D reactivo al movimiento del mouse.

---

## 🧊 4. Componentes UI (Design Tokens)

### **Glassmorphism Cards**
- **Fondo:** `bg-white/5` o `bg-card/40`
- **Blur:** `backdrop-blur-xl` a `backdrop-blur-3xl`
- **Bordes:** `1px solid rgba(255, 255, 255, 0.1)`
- **Sombra:** `shadow-2xl` con matiz azulado.

### **Botones Premium**
- **Estructura:** Bordes muy redondeados (`rounded-[40px]`), altura generosa (`h-16+`).
- **Interacción:** Efecto de brillo metálico (shine) al pasar el cursor.

---

## 🎬 5. Movimiento y Animación

### **Principios de Motion**
- **Easing:** Easing suave y profesional `[0.22, 1, 0.36, 1]` para todas las entradas.
- **Micro-interacciones:** Escalas suaves (`scale-105`) y traslaciones laterales al interactuar.
- **Ambiente:** Partículas flotantes, rejillas HUD animadas y haces de luz periódicos.

---

## 📝 6. Registro de Cambios
- **2026-04-17:** Creación del sistema de diseño cinemático. Implementación de interacción Parallax y atmósfera HUD. Unificación del logo con escudo "S".
