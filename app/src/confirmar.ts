/**
 * PREGUNTAR ANTES DE ALGO QUE NO TIENE VUELTA, en las dos plataformas.
 *
 * ═══ POR QUÉ NO BASTA CON `Alert.alert` ═══
 *
 * En React Native Web `Alert.alert` es una función VACÍA: no pinta nada y no llama a ningún botón.
 * «Tirar» de la barra de la mesa preguntaba con él, así que en `/jugar` el botón no hacía nada —ni
 * preguntaba ni tiraba—, sin un error en ningún sitio. Aquí, en el teléfono, se pregunta con
 * `Alert`; en la web lo hace `confirmar.web.ts` con el `confirm` del navegador. Metro elige.
 */
import { Alert } from 'react-native';

export function confirmar(titulo: string, texto: string, siRotulo: string, si: () => void): void {
  Alert.alert(titulo, texto, [
    { text: 'No', style: 'cancel' },
    { text: siRotulo, style: 'destructive', onPress: si },
  ]);
}
