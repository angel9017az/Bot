// commands/banco.js
const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags
} = require('discord.js');
const { 
  obtenerCuenta, 
  depositar, 
  retirar, 
  transferir, 
  solicitarPrestamo, 
  pagarPrestamo, 
  TARJETAS 
} = require('../economyManager');

// Icono directo en string limpio (sin markdown ni espacios)
const ICONO_BANCO = 'https://i.imgur.com/8Q96M3g.png';

function crearEmbedPrincipal(user) {
  const cuenta = obtenerCuenta(user.id);
  const infoTarjeta = TARJETAS[cuenta.tarjeta] || TARJETAS['Débito Clásica'];
  const limiteTxt = infoTarjeta.limiteBanco === Infinity ? 'Ilimitado' : `$${infoTarjeta.limiteBanco.toLocaleString()} USD`;

  const infoTexto = 
    "```yaml\n" +
    `ESTADO: CUENTA ACTIVA\n` +
    `N° CUENTA: ${cuenta.numeroCuenta}\n` +
    `CLIENTE: ${user.username.toUpperCase()}\n` +
    "```";

  return new EmbedBuilder()
    .setAuthor({ name: 'BANCO CENTRAL GLOBAL — BANCA EN LÍNEA', iconURL: ICONO_BANCO })
    .setTitle(`🏧 Terminal Financiera — ${user.displayName}`)
    .setColor(0x00A86B)
    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
    .setDescription(infoTexto)
    .addFields(
      { name: '💵 Efectivo en Billetera', value: `\`$${cuenta.efectivo.toLocaleString()} USD\``, inline: true },
      { name: '🏦 Saldo Disponible Banco', value: `\`$${cuenta.banco.toLocaleString()} USD\``, inline: true },
      { name: '💳 Tarjeta / Categoría', value: `${infoTarjeta.icono} \`${cuenta.tarjeta}\``, inline: true },
      { name: '📊 Límite de Depósito', value: `\`${limiteTxt}\``, inline: true },
      { name: '📈 Historial (Score Crediticio)', value: `\`${cuenta.scoreCrediticio} / 850 pts\``, inline: true },
      { name: '⚠️ Deuda de Préstamos', value: `\`$${cuenta.prestamoActivo.toLocaleString()} USD\``, inline: true }
    )
    .setFooter({ text: 'Selecciona una operación financiera en el menú desplegable inferior' })
    .setTimestamp();
}

function crearComponentesBancarios() {
  const menuOpciones = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('menu_bancario_opciones')
      .setPlaceholder('🏦 Selecciona una operación bancaria...')
      .addOptions([
        { label: 'Depositar Efectivo', description: 'Transfiere dinero de tu billetera a tu cuenta bancaria', value: 'op_depositar', emoji: '📥' },
        { label: 'Retirar Efectivo', description: 'Retira fondos de la cuenta hacia tu efectivo', value: 'op_retirar', emoji: '📤' },
        { label: 'Transferencia Bancaria', description: 'Envía saldo bancario a la cuenta de otro cliente', value: 'op_transferir', emoji: '💸' },
        { label: 'Solicitar Crédito / Préstamo', description: 'Aplica a un préstamo evaluando tu Score Crediticio', value: 'op_prestamo_solicitar', emoji: '🤝' },
        { label: 'Pagar Deuda de Préstamo', description: 'Liquida tus préstamos activos pendientes', value: 'op_prestamo_pagar', emoji: '✅' },
        { label: 'Ver Últimos Movimientos', description: 'Muestra el historial reciente de tu cuenta', value: 'op_historial', emoji: '📜' }
      ])
  );

  const botonesControl = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('btn_banco_refrescar').setLabel('Actualizar Saldo').setStyle(ButtonStyle.Primary).setEmoji('🔄'),
    new ButtonBuilder().setCustomId('btn_banco_cerrar').setLabel('Salir / Cerrar Sesión').setStyle(ButtonStyle.Danger).setEmoji('🔒')
  );

  return [menuOpciones, botonesControl];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('banco')
    .setDescription('Abre tu terminal interactiva de Banca en Línea'),

  async execute(interaction) {
    const embed = crearEmbedPrincipal(interaction.user);
    const componentes = crearComponentesBancarios();

    const response = await interaction.reply({ 
      embeds: [embed], 
      components: componentes,
      fetchReply: true
    });

    const collector = response.createMessageComponentCollector({
      filter: i => i.user.id === interaction.user.id,
      time: 300000 
    });

    collector.on('collect', async i => {
      if (i.isStringSelectMenu() && i.customId === 'menu_bancario_opciones') {
        const opcion = i.values[0];

        if (opcion === 'op_depositar') {
          const modal = new ModalBuilder().setCustomId('modal_banco_depositar').setTitle('📥 Ventanilla de Depósitos');
          const inputMonto = new TextInputBuilder().setCustomId('input_monto_depositar').setLabel('Monto en efectivo a depositar ($ USD)').setStyle(TextInputStyle.Short).setPlaceholder('Ejemplo: 500').setRequired(true);
          modal.addComponents(new ActionRowBuilder().addComponents(inputMonto));
          return await i.showModal(modal);
        }

        if (opcion === 'op_retirar') {
          const modal = new ModalBuilder().setCustomId('modal_banco_retirar').setTitle('📤 Cajero Automático - Retiros');
          const inputMonto = new TextInputBuilder().setCustomId('input_monto_retirar').setLabel('Monto a retirar ($ USD)').setStyle(TextInputStyle.Short).setPlaceholder('Ejemplo: 250').setRequired(true);
          modal.addComponents(new ActionRowBuilder().addComponents(inputMonto));
          return await i.showModal(modal);
        }

        if (opcion === 'op_transferir') {
          const modal = new ModalBuilder().setCustomId('modal_banco_transferir').setTitle('💸 Transferencia Interbancaria');
          const inputDestino = new TextInputBuilder().setCustomId('input_destino_transferir').setLabel('ID del Usuario Destinatario').setStyle(TextInputStyle.Short).setPlaceholder('Pega el ID de Discord del usuario').setRequired(true);
          const inputMonto = new TextInputBuilder().setCustomId('input_monto_transferir').setLabel('Monto a transferir ($ USD)').setStyle(TextInputStyle.Short).setPlaceholder('Ejemplo: 1000').setRequired(true);
          modal.addComponents(new ActionRowBuilder().addComponents(inputDestino), new ActionRowBuilder().addComponents(inputMonto));
          return await i.showModal(modal);
        }

        if (opcion === 'op_prestamo_solicitar') {
          const modal = new ModalBuilder().setCustomId('modal_banco_prestamo_solicitar').setTitle('🤝 Evaluación de Crédito Bancario');
          const inputMonto = new TextInputBuilder().setCustomId('input_monto_prestamo').setLabel('Monto del préstamo solicitado ($ USD)').setStyle(TextInputStyle.Short).setPlaceholder('Monto según tu Credit Score').setRequired(true);
          modal.addComponents(new ActionRowBuilder().addComponents(inputMonto));
          return await i.showModal(modal);
        }

        if (opcion === 'op_prestamo_pagar') {
          await i.deferUpdate();
          const res = pagarPrestamo(i.user.id);
          if (!res.exito) {
            await i.followUp({ content: `❌ ${res.razon}`, flags: MessageFlags.Ephemeral });
          } else {
            await i.followUp({ content: `✅ **Crédito Liquidado Exitosamente.** Se debitaron **$${res.montoPagado.toLocaleString()} USD** de tu cuenta. Tu Score subió a \`${res.nuevoScore} pts\`.`, flags: MessageFlags.Ephemeral });
          }
          return await i.editReply({ embeds: [crearEmbedPrincipal(i.user)], components: crearComponentesBancarios() });
        }

        if (opcion === 'op_historial') {
          await i.deferUpdate();
          const cuenta = obtenerCuenta(i.user.id);
          const historialTxt = cuenta.transacciones.length > 0
            ? cuenta.transacciones.map(t => `\`${t.fecha}\` | **${t.tipo}**: $${t.monto.toLocaleString()} (${t.detalle})`).join('\n')
            : '*Sin estado de movimientos recientes.*';

          const embedHistorial = new EmbedBuilder().setTitle(`📜 Estado de Cuenta / Movimientos — ${i.user.username}`).setColor(0x3498DB).setDescription(historialTxt).setTimestamp();
          return await i.followUp({ embeds: [embedHistorial], flags: MessageFlags.Ephemeral });
        }
      }

      if (i.isButton()) {
        if (i.customId === 'btn_banco_refrescar') {
          await i.deferUpdate();
          await i.editReply({ embeds: [crearEmbedPrincipal(i.user)], components: crearComponentesBancarios() });
        } else if (i.customId === 'btn_banco_cerrar') {
          await i.update({ content: '🔒 **Sesión bancaria finalizada de forma segura.**', embeds: [], components: [] });
          collector.stop();
        }
      }
    });

    try {
      const modalInteraction = await response.awaitModalSubmit({
        filter: m => m.user.id === interaction.user.id,
        time: 300000
      });

      await modalInteraction.deferUpdate();

      if (modalInteraction.customId === 'modal_banco_depositar') {
        const monto = parseInt(modalInteraction.fields.getTextInputValue('input_monto_depositar'));
        if (isNaN(monto)) await modalInteraction.followUp({ content: '❌ Ingresa un número válido.', flags: MessageFlags.Ephemeral });
        else {
          const res = depositar(modalInteraction.user.id, monto);
          if (!res.exito) await modalInteraction.followUp({ content: `❌ ${res.razon}`, flags: MessageFlags.Ephemeral });
          else await modalInteraction.followUp({ content: `📥 Depositaste **$${res.montoReal.toLocaleString()} USD** en tu banco.`, flags: MessageFlags.Ephemeral });
        }
      } 
      
      else if (modalInteraction.customId === 'modal_banco_retirar') {
        const monto = parseInt(modalInteraction.fields.getTextInputValue('input_monto_retirar'));
        if (isNaN(monto)) await modalInteraction.followUp({ content: '❌ Ingresa un número válido.', flags: MessageFlags.Ephemeral });
        else {
          const res = retirar(modalInteraction.user.id, monto);
          if (!res.exito) await modalInteraction.followUp({ content: `❌ ${res.razon}`, flags: MessageFlags.Ephemeral });
          else await modalInteraction.followUp({ content: `📤 Retiraste **$${monto.toLocaleString()} USD** a tu efectivo.`, flags: MessageFlags.Ephemeral });
        }
      }

      else if (modalInteraction.customId === 'modal_banco_transferir') {
        const destId = modalInteraction.fields.getTextInputValue('input_destino_transferir').trim();
        const monto = parseInt(modalInteraction.fields.getTextInputValue('input_monto_transferir'));

        if (isNaN(monto)) await modalInteraction.followUp({ content: '❌ Monto inválido.', flags: MessageFlags.Ephemeral });
        else if (destId === modalInteraction.user.id) await modalInteraction.followUp({ content: '❌ No puedes transferirte a ti mismo.', flags: MessageFlags.Ephemeral });
        else {
          const res = transferir(modalInteraction.user.id, destId, monto);
          if (!res.exito) await modalInteraction.followUp({ content: `❌ ${res.razon}`, flags: MessageFlags.Ephemeral });
          else await modalInteraction.followUp({ content: `💸 Transferencia exitosa de **$${monto.toLocaleString()} USD** enviada a <@${destId}>.`, flags: MessageFlags.Ephemeral });
        }
      }

      else if (modalInteraction.customId === 'modal_banco_prestamo_solicitar') {
        const monto = parseInt(modalInteraction.fields.getTextInputValue('input_monto_prestamo'));
        if (isNaN(monto)) await modalInteraction.followUp({ content: '❌ Monto inválido.', flags: MessageFlags.Ephemeral });
        else {
          const res = solicitarPrestamo(modalInteraction.user.id, monto);
          if (!res.exito) await modalInteraction.followUp({ content: `❌ ${res.razon}`, flags: MessageFlags.Ephemeral });
          else await modalInteraction.followUp({ content: `🤝 Crédito bancario aprobado de **$${monto.toLocaleString()} USD**. Deuda total con intereses: **$${res.totalAPagar.toLocaleString()} USD**.`, flags: MessageFlags.Ephemeral });
        }
      }

      await interaction.editReply({ embeds: [crearEmbedPrincipal(interaction.user)], components: crearComponentesBancarios() });
    } catch (err) {
      // El modal expiró por inactividad
    }
  }
};