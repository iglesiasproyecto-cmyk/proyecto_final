/**
 * Paleta de colores estandarizada para tarjetas gráficas
 * Todos los componentes de tarjetas usan estos colores
 */

export const CARD_COLORS = [
  { from: "#709dbd", to: "#4682b4", name: "primary" },        // Azul primario (botones)
  { from: "#4682b4", to: "#2a5a8a", name: "darkblue" },       // Azul oscuro
  { from: "#709dbd", to: "#2a5a8a", name: "gradient1" },      // Gradiente fuerte
  { from: "#5a8aad", to: "#3a6a8d", name: "mediumblue" },     // Azul medio
  { from: "#709dbd", to: "#4682b4", name: "primaryalt" },     // Primario alternativo
  { from: "#6a8dab", to: "#4a72a0", name: "gradient2" },      // Gradiente suave
  { from: "#7aadcd", to: "#5a8aab", name: "lightblue" },      // Azul claro
  { from: "#4682b4", to: "#1a4a74", name: "deepblue" },       // Azul profundo
];

/**
 * Obtener color por índice (cicla si supera el largo)
 */
export const getCardColor = (index: number) => {
  return CARD_COLORS[index % CARD_COLORS.length];
};

/**
 * Obtener todos los colores como gradientes
 */
export const getCardGradient = (index: number) => {
  const color = getCardColor(index);
  return `from-[${color.from}] to-[${color.to}]`;
};
