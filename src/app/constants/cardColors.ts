/**
 * Paleta de colores estandarizada para tarjetas gráficas
 * Todos los componentes de tarjetas usan estos colores
 */

export const CARD_COLORS = [
  { from: "#709dbd", to: "#4682b4", name: "azul" },           // Azul primario
  { from: "#1a7fa8", to: "#15617d", name: "tealprimary" },    // Teal primario
  { from: "#2596be", to: "#1a6fa0", name: "cyan" },           // Cyan
  { from: "#5cbcd6", to: "#3fa8c9", name: "lightcyan" },      // Light cyan
  { from: "#c5a96a", to: "#a88855", name: "gold" },           // Gold
  { from: "#e8927c", to: "#d97560", name: "coral" },          // Coral
  { from: "#4db8e8", to: "#2a9fd6", name: "skyblue" },        // Sky blue
  { from: "#6b5b95", to: "#4a3a6e", name: "purple" },         // Purple
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
