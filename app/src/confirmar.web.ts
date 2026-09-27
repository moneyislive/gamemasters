/**
 * PREGUNTAR ANTES DE ALGO QUE NO TIENE VUELTA, en `/jugar`: con el `confirm` del navegador, porque
 * el `Alert.alert` de React Native Web está vacío (ver `confirmar.ts`).
 */
export function confirmar(titulo: string, texto: string, _siRotulo: string, si: () => void): void {
  if (typeof window === 'undefined' || typeof window.confirm !== 'function') return;
  if (window.confirm(`${titulo}\n\n${texto}`)) si();
}
