// commands/sesion.js
const { 
  SlashCommandBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');
const { generarEmbedEstadoSesion, generarEmbedVotacionSesion } = require('../embedSesion');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sesion')
    .setDescription('Inicia el panel de estado de la sesión de RP y abre votaciones decoradas')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    await interaction.deferReply();

    // 1. Crear Embed Principal con valores por defecto
    const embedInicial = generarEmbedEstadoSesion();

    // 2. Menú de Configuración para el Staff
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

    await interaction.editReply({
      embeds: [embedInicial],
      components: [menuConfig]
    });

    // 3. Crear los 4 Botones con sus colores requeridos
    const filaBotones = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('btn_votar')
        .setLabel('Votar')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success), // Verde

      new ButtonBuilder()
        .setCustomId('btn_retirar_voto')
        .setLabel('Retirar Voto')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Danger), // Rojo

      new ButtonBuilder()
        .setCustomId('btn_votar_mod')
        .setLabel('Votar Mod')
        .setEmoji('🛡️')
        .setStyle(ButtonStyle.Primary), // Azul

      new ButtonBuilder()
        .setCustomId('btn_ver_votantes')
        .setLabel('Votantes')
        .setEmoji('📋')
        .setStyle(ButtonStyle.Secondary) // Gris
    );

    // 4. Crear el Embed Decorado de Votación
    const embedVotacion = generarEmbedVotacionSesion(0, 0);

    const msjVotacion = await interaction.channel.send({
      embeds: [embedVotacion],
      components: [filaBotones]
    });

    // Sets para almacenar las IDs de los usuarios sin duplicados
    const votantesUsuarios = new Set();
    const votantesMods = new Set();

    // Recolector activo durante 60 segundos
    const collector = msjVotacion.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async i => {
      // 1. Opción: Votar (Verde)
      if (i.customId === 'btn_votar') {
        if (votantesUsuarios.has(i.user.id)) {
          return await i.reply({ content: '⚠️ Ya estás registrado en la lista de votantes.', flags: MessageFlags.Ephemeral });
        }
        votantesUsuarios.add(i.user.id);
        await i.deferUpdate();
      }

      // 2. Opción: Retirar Voto (Rojo)
      if (i.customId === 'btn_retirar_voto') {
        let retiroUsuario = votantesUsuarios.delete(i.user.id);
        let retiroMod = votantesMods.delete(i.user.id);

        if (!retiroUsuario && !retiroMod) {
          return await i.reply({ content: '⚠️ No tienes ningún voto registrado para retirar.', flags: MessageFlags.Ephemeral });
        }
        await i.deferUpdate();
      }

      // 3. Opción: Votar Mod (Azul - Requiere permiso de Staff/Moderador)
      if (i.customId === 'btn_votar_mod') {
        const esMod = i.member.permissions.has(PermissionFlagsBits.ManageMessages);
        if (!esMod) {
          return await i.reply({ content: '❌ Solo los miembros del Staff/Moderación pueden usar este botón.', flags: MessageFlags.Ephemeral });
        }
        if (votantesMods.has(i.user.id)) {
          return await i.reply({ content: '⚠️ Ya estás registrado como Moderador para esta sesión.', flags: MessageFlags.Ephemeral });
        }
        votantesMods.add(i.user.id);
        await i.deferUpdate();
      }

      // 4. Opción: Ver Votantes (Gris)
      if (i.customId === 'btn_ver_votantes') {
        const listaUsuarios = Array.from(votantesUsuarios).map(id => `<@${id}>`).join(', ') || 'Ninguno';
        const listaMods = Array.from(votantesMods).map(id => `<@${id}>`).join(', ') || 'Ninguno';

        return await i.reply({
          content: `📋 **Lista de Votantes Actuales:**\n\n👤 **Usuarios (${votantesUsuarios.size}):** ${listaUsuarios}\n🛡️ **Staffs (${votantesMods.size}):** ${listaMods}`,
          flags: MessageFlags.Ephemeral
        });
      }

      // Actualizar visualmente el Embed tras realizar cambios de votos
      const nuevoEmbedVotacion = generarEmbedVotacionSesion(votantesUsuarios.size, votantesMods.size);
      await msjVotacion.edit({ embeds: [nuevoEmbedVotacion] });
    });

    collector.on('end', async () => {
      // Borrar mensaje de votación al caducar el tiempo
      try {
        await msjVotacion.delete();
      } catch (err) {
        console.log('No se pudo borrar el mensaje de votación.');
      }

      // Unificar todos los votantes para darles las gracias
      const todosLosVotantes = new Set([...votantesUsuarios, ...votantesMods]);

      if (todosLosVotantes.size > 0) {
        const menciones = Array.from(todosLosVotantes).map(id => `<@${id}>`).join(', ');
        await interaction.channel.send({
          content: `🎉 **¡La votación ha finalizado!**\nMuchas gracias por participar y confirmar su asistencia: ${menciones}`
        });
      } else {
        await interaction.channel.send({
          content: '📢 **La votación ha finalizado.** No se registraron participaciones.'
        });
      }
    });
  }
};
