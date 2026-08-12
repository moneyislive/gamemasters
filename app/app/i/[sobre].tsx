/**
 * Llegada por invitación nominal: `https://harkania.com/i/<sobre>`.
 *
 * A DÓNDE LLEVA Y POR QUÉ. Las invitaciones no se canjean con el enlace: se
 * localizan por el correo con el que quien organiza te apuntó. Así que lo útil
 * que puede hacer esta pantalla es llevarte a donde viven tus invitaciones —la
 * cuenta—, que es donde aparecerán en cuanto inicies sesión con ese correo.
 *
 * LO QUE NO HACE, Y ES DELIBERADO: no inicia sesión sola. Un enlace que llega
 * por correo lo puede reenviar cualquiera, y abrir sesión con solo pulsarlo
 * convertiría un correo reenviado en una llave. La sesión la abre la persona.
 *
 * El sobre viaja firmado y se conserva en el desvío para el día que haya una
 * ruta que lo canjee directamente; hoy no la hay, y esta pantalla no finge que
 * sí.
 */
import { useEffect } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

export default function LlegadaPorInvitacion(): JSX.Element {
  const { sobre } = useLocalSearchParams<{ sobre: string }>();

  useEffect(() => {
    // `replace` y no `push`: si no, volver atrás vuelve a desviar aquí y se
    // entra en un bucle.
    router.replace({
      pathname: '/cuenta',
      params: sobre ? { invitacion: String(sobre) } : {},
    });
  }, [sobre]);

  return <View style={{ flex: 1, backgroundColor: '#0b1710' }} />;
}
