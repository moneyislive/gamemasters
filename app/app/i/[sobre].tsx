/**
 * Llegada por invitación nominal: `https://harkania.com/i/<sobre>`.
 *
 * A DÓNDE LLEVA Y POR QUÉ. Las invitaciones no se canjean con el enlace: se
 * localizan por el correo con el que quien organiza te apuntó. Así que lo útil
 * que puede hacer esta pantalla es llevarte a donde viven tus invitaciones. Y
 * eso son DOS SITIOS DISTINTOS según cómo llegues, cosa que la primera versión
 * de este desvío no distinguía:
 *
 *   · Con la sesión de cuenta ya abierta, los sobres se pintan y se canjean en
 *     LA PORTADA. Mandar ahí a quien ya tiene cuenta —como se hacía— a la
 *     pantalla de «tu cuenta» era mandarlo a un sitio donde su invitación no
 *     sale por ninguna parte: la pantalla existe y se abre, así que no parece
 *     un enlace roto, parece que la invitación se ha perdido.
 *   · Sin sesión no hay portada que enseñar, y lo único que hace falta es
 *     iniciarla: eso vive en la pantalla de cuenta, y allí se manda el sobre
 *     para que al menos diga por qué has llegado.
 *
 * La sesión se relee aquí a propósito. Este desvío puede ser la PRIMERA
 * pantalla de un arranque en frío —el sistema abre la app directamente en el
 * enlace—, y en ese instante el proveedor de la partida todavía está leyendo el
 * almacén: preguntar sin releer respondería «no hay cuenta» a todo el mundo y
 * mandaría a la pantalla de inicio de sesión a quien ya la tiene abierta.
 * Releer es idempotente y cuesta una lectura del almacén.
 *
 * LO QUE NO HACE, Y ES DELIBERADO: no inicia sesión sola. Un enlace que llega
 * por correo lo puede reenviar cualquiera, y abrir sesión con solo pulsarlo
 * convertiría un correo reenviado en una llave. La sesión la abre la persona.
 */
import { useEffect } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as api from '../../src/api';

export default function LlegadaPorInvitacion(): JSX.Element {
  const { sobre } = useLocalSearchParams<{ sobre: string }>();

  useEffect(() => {
    let vivo = true;
    void (async () => {
      await api.cargarSesionGuardada();
      // Si la pantalla ya no está montada, navegar la sacaría de debajo de los
      // pies a quien haya seguido tocando mientras se leía el almacén.
      if (!vivo) return;
      // `replace` y no `push`: si no, volver atrás vuelve a desviar aquí y se
      // entra en un bucle.
      if (api.hayCuenta()) {
        router.replace('/');
        return;
      }
      router.replace({
        pathname: '/cuenta',
        params: sobre ? { invitacion: String(sobre) } : {},
      });
    })();
    return () => {
      vivo = false;
    };
  }, [sobre]);

  return <View style={{ flex: 1, backgroundColor: '#0b1710' }} />;
}
