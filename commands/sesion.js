// commands/sesion.js
const { 
  SlashCommandBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  EmbedBuilder, 
  PermissionFlagsBits 
} = require('discord.js');
const { generarEmbedEstadoSesion } = require('../embedSesion');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sesion')
    .setDescription('Inicia el panel de estado de la sesión de RP y abre votaciones')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    await interaction.deferReply();

    // 1. Crear Embed Principal con valores en "Desconocido"
    const embedInicial = generarEmbedEstadoSesion();

    // 2. Menú para el Staff (Incluye modificación de Método de Unirse)
    const menuConfig = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('menu_config_sesion')
        .setPlaceholder('⚙️ Modificar estado de la sesión (Staff)...')
        .addOptions([
          { label: 'Configurar Vías', value: 'opcion_vias', emoji: '🗺️' },
          { label: 'Configurar Velocidad', value: 'opcion_velocidad', emoji: '🏎️' },
          { label: 'Configurar Adelantamiento', value: 'opcion_adelantamiento', emoji: '⚠️' },
          { label: 'Configurar Método de Unirse', value: 'opcion_unirse', emoji: '🔑' },
          { label: 'Configurar Evento', value: 'opcion_evento', emoji: '📢' }
        ])
    );

    // Publicar el mensaje del panel principal
    await interaction.editReply({
      embeds: [embedInicial],
      components: [menuConfig]
    });

    // 3. Generar el mensaje de Votación para la comunidad
    const embedVotacion = new EmbedBuilder()
      .setTitle('🗳️ VOTACIÓN DE SESIÓN DE ROL')
      .setColor(0x3498DB)
      .setDescription('¡Vota para confirmar tu asistencia a la sesión! La votación se cerrará en breve.')
      .addFields({ name: '👥 Votos registrados', value: '`0` votos' })
      .setTimestamp();

    const botonVotar = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('btn_votar_sesion')
        .setLabel('¡Asistiré a la sesión!')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success)
    );

    const msjVotacion = await interaction.channel.send({
      embeds: [embedVotacion],
      components: [botonVotar]
    });

    // 4. Recolector de votos (Duración: 60 segundos)
    const votantes = new Set();
    const collector = msjVotacion.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async i => {
      if (i.customId === 'btn_votar_sesion') {
        if (votantes.has(i.user.id)) {
          return await i.reply({ content: '⚠️ Ya has registrado tu voto en esta sesión.', flags: 64 });
        }

        votantes.add(i.user.id);
        await i.deferUpdate();

        // Actualizar contador de votos visualmente
        const embedActualizado = EmbedBuilder.from(embedVotacion).setFields({
          name: '👥 Votos registrados',
          value: `\`${votantes.size}\` voto(s)`
        });

        await msjVotacion.edit({ embeds: [embedActualizado] });
      }
    });

    collector.on('end', async () => {
      // Eliminar mensaje de votación al finalizar
      try {
        await msjVotacion.delete();
      } catch (err) {
        console.log('No se pudo eliminar el mensaje de votación.');
      }

      // Enviar agradecimiento mencionando a los votantes
      if (votantes.size > 0) {
        const menciones = Array.from(votantes).map(id => `<@${id}>`).join(', ');
        await interaction.channel.send({
          content: `🎉 **¡La votación ha concluido!**\nMuchísimas gracias por participar a: ${menciones}`
        });
      } else {
        await interaction.channel.send({
          content: '📢 **La votación ha concluido.** No se registraron votos.'
        });
      }
    });
  }
};
