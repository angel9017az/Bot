// commands/inversion.js
const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle,
  MessageFlags
} = require('discord.js');
const { cargarMercado, comprarActivo, venderActivo, obtenerPortafolio } = require('../marketManager');
const { obtenerCuenta } = require('../economyManager');

function crearEmbedPortafolio(user) {
  const cuenta = obtenerCuenta(user.id);
  const mercado = cargarMercado();
  const portafolio = obtenerPortafolio(user.id);

  let valorTotalInversiones = 0;
  let lineasPortafolio = [];

  for (const simbolo in portafolio) {
    const item = portafolio[simbolo];
    const activo = mercado.activos[simbolo];
    if (activo && item.cantidad > 0) {
      const valorActual = item.cantidad * activo.precio;
      valorTotalInversiones += valorActual;

      const gananciaPerdida = valorActual - (item.cantidad * item.costoPromedio);
      const signo = gananciaPerdida >= 0 ? '+' : '';

      lineasPortafolio.push(
        `• **${activo.nombre}**: \`${item.cantidad} un.\` | Valor: \`$${valorActual.toLocaleString()} USD\` (Rendimiento: \`${signo}$${gananciaPerdida.toLocaleString()}\`)`
      );
    }
  }

  const textoDetalle = lineasPortafolio.length > 0 
    ? lineasPortafolio.join('\n') 
    : '*No tienes inversiones activas en este momento.*';

  return new EmbedBuilder()
    .setAuthor({ name: 'PORTAFOLIO DE INVERSIONES', iconURL: 'https://i.imgur.com/8Q96M3g.png' })
    .setTitle(`📈 Mi Cartera — ${user.displayName}`)
    .setColor(0x1F6FEB)
    .addFields(
      { name: '🏦 Saldo en Banco', value: `\`$${cuenta.banco.toLocaleString()} USD\``, inline: true },
      { name: '📊 Valor en Inversiones', value: `\`$${valorTotalInversiones.toLocaleString()} USD\``, inline: true },
      { name: '💼 Tus Criptos / Acciones', value: textoDetalle, inline: false }
    )
    .setFooter({ text: 'Usa el menú desplegable para comprar o vender activos' })
    .setTimestamp();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inversion')
    .setDescription('Abre tu terminal de inversiones en bolsa y criptomonedas'),

  async execute(interaction) {
    const embed = crearEmbedPortafolio(interaction.user);
    const mercado = cargarMercado();

    const opcionesMercado = Object.keys(mercado.activos).map(simbolo => {
      const a = mercado.activos[simbolo];
      return {
        label: `${a.nombre} - $${a.precio.toLocaleString()} USD`,
        value: simbolo,
        emoji: a.icono
      };
    });

    const menuOperacion = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('select_activo_operar')
        .setPlaceholder('💹 Selecciona un activo para operar...')
        .addOptions(opcionesMercado)
    );

    const response = await interaction.reply({
      embeds: [embed],
      components: [menuOperacion],
      fetchReply: true
    });

    try {
      const selectInteraction = await response.awaitMessageComponent({
        filter: i => i.user.id === interaction.user.id,
        time: 120000
      });

      if (selectInteraction.isStringSelectMenu()) {
        const simboloSeleccionado = selectInteraction.values[0];
        
        const modal = new ModalBuilder()
          .setCustomId(`modal_operar_${simboloSeleccionado}`)
          .setTitle(`Operar ${simboloSeleccionado}`);

        const inputAccion = new TextInputBuilder()
          .setCustomId('input_tipo_operacion')
          .setLabel('Acción: Escribe COMPRAR o VENDER')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('COMPRAR / VENDER')
          .setRequired(true);

        const inputCantidad = new TextInputBuilder()
          .setCustomId('input_cantidad_operacion')
          .setLabel('Cantidad de unidades')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Ejemplo: 2')
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(inputAccion),
          new ActionRowBuilder().addComponents(inputCantidad)
        );

        await selectInteraction.showModal(modal);

        const modalInteraction = await response.awaitModalSubmit({
          filter: m => m.user.id === interaction.user.id,
          time: 120000
        });

        await modalInteraction.deferUpdate();

        const tipo = modalInteraction.fields.getTextInputValue('input_tipo_operacion').toUpperCase().trim();
        const cantidad = parseInt(modalInteraction.fields.getTextInputValue('input_cantidad_operacion'));

        if (isNaN(cantidad) || cantidad <= 0) {
          return await modalInteraction.followUp({ content: '❌ Cantidad inválida.', flags: MessageFlags.Ephemeral });
        }

        if (tipo === 'COMPRAR') {
          const res = comprarActivo(interaction.user.id, simboloSeleccionado, cantidad);
          if (!res.exito) await modalInteraction.followUp({ content: `❌ ${res.razon}`, flags: MessageFlags.Ephemeral });
          else await modalInteraction.followUp({ content: `✅ Compraste **${cantidad}** unidades de **${simboloSeleccionado}** por **$${res.costoTotal.toLocaleString()} USD**.`, flags: MessageFlags.Ephemeral });
        } else if (tipo === 'VENDER') {
          const res = venderActivo(interaction.user.id, simboloSeleccionado, cantidad);
          if (!res.exito) await modalInteraction.followUp({ content: `❌ ${res.razon}`, flags: MessageFlags.Ephemeral });
          else await modalInteraction.followUp({ content: `✅ Vendiste **${cantidad}** unidades de **${simboloSeleccionado}**. Se acreditaron **$${res.ingresoTotal.toLocaleString()} USD** en tu banco.`, flags: MessageFlags.Ephemeral });
        } else {
          await modalInteraction.followUp({ content: '❌ Debes especificar COMPRAR o VENDER.', flags: MessageFlags.Ephemeral });
        }

        await interaction.editReply({ embeds: [crearEmbedPortafolio(interaction.user)], components: [menuOperacion] });
      }
    } catch (e) {
      // Tiempo expirado
    }
  }
};