const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  PermissionFlagsBits, 
  ChannelType 
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('abrir-sesion')
    .setDescription('Inicia una votación para abrir una sesión de RP')
    .addStringOption(opt => 
      opt.setName('nombre')
        .setDescription('Nombre de la sesión (ej. Sesion-A)')
        .setRequired(true))
    .addIntegerOption(opt => 
      opt.setName('minimo')
        .setDescription('Mínimo de votos requeridos para abrir')
        .setRequired(true))
    .addIntegerOption(opt => 
      opt.setName('tiempo')
        .setDescription('Tiempo límite de votación en minutos')
        .setRequired(true)),

  async execute(interaction) {
    const nombreSesion = interaction.options.getString('nombre');
    const minimoVotos = interaction.options.getInteger('minimo');
    const tiempoMinutos = interaction.options.getInteger('tiempo');

    // Listas para controlar votantes únicos
    const jugadores = new Set();
    const moderadores = new Set();

    const tiempoLimiteMs = Date.now() + tiempoMinutos * 60 * 1000;
    const finTiempoUnix = Math.floor(tiempoLimiteMs / 1000);

    // Embed inicial de la votación
    const generarEmbed = (estado = '🟢 VOTACIÓN EN PROCESO') => {
      return new EmbedBuilder()
        .setTitle(`📊 PROPUESTA DE SESIÓN | ${nombreSesion.toUpperCase()}`)
        .setColor(0x3498DB)
        .setDescription(`El Host <@${interaction.user.id}> ha propuesto una nueva sesión de rol.\n\n` +
          `📌 **Estado:** ${estado}\n` +
          `⏱️ **Expira:** <t:${finTiempoUnix}:R> (<t:${finTiempoUnix}:t>)`)
        .addFields(
          { name: '🎯 Votos Requeridos', value: `\`${minimoVotos}\` jugadores`, inline: true },
          { name: '✅ Jugadores Confirmados', value: `\`${jugadores.size} / ${minimoVotos}\``, inline: true },
          { name: '🛡️ Staffs en Moderación', value: `\`${moderadores.size}\``, inline: true }
        )
        .setFooter({ text: 'Haz clic en los botones para registrar tu voto' })
        .setTimestamp();
    };

    // Botones de interacción
    const construirBotones = (disabled = false) => {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('btn_participar')
          .setLabel('Participaré')
          .setStyle(ButtonStyle.Success)
          .setDisabled(disabled),
        new ButtonBuilder()
          .setCustomId('btn_retirar')
          .setLabel('Retirar voto')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(disabled),
        new ButtonBuilder()
          .setCustomId('btn_moderar')
          .setLabel('Moderar')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(disabled),
        new ButtonBuilder()
          .setCustomId('btn_ver_votos')
          .setLabel('Ver votos')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(disabled)
      );
    };

    const mensajeVotacion = await interaction.reply({
      embeds: [generarEmbed()],
      components: [construirBotones(false)],
      fetchReply: true
    });

    // Colector de eventos para los botones
    const collector = mensajeVotacion.createMessageComponentCollector({
      time: tiempoMinutos * 60 * 1000
    });

    collector.on('collect', async i => {
      const userId = i.user.id;

      // 1. Botón "Participaré"
      if (i.customId === 'btn_participar') {
        if (jugadores.has(userId)) {
          return i.reply({ content: '⚠️ Ya estás registrado en la lista de participantes.', ephemeral: true });
        }
        jugadores.add(userId);
        await i.update({ embeds: [generarEmbed()], components: [construirBotones()] });

        // Verificación de Meta Alcanzada
        if (jugadores.size >= minimoVotos) {
          collector.stop('meta_alcanzada');
        }
      }

      // 2. Botón "Retirar voto"
      else if (i.customId === 'btn_retirar') {
        let retiroAlgo = false;

        if (jugadores.has(userId)) {
          jugadores.delete(userId);
          retiroAlgo = true;
        }
        if (moderadores.has(userId)) {
          moderadores.delete(userId);
          retiroAlgo = true;
        }

        if (!retiroAlgo) {
          return i.reply({ content: '❌ No has votado en esta propuesta todavía.', ephemeral: true });
        }

        await i.update({ embeds: [generarEmbed()], components: [construirBotones()] });
      }

      // 3. Botón "Moderar" (Solo Staff)
      else if (i.customId === 'btn_moderar') {
        // Verificar permisos de administración/moderación en el servidor
        const esStaff = i.member.permissions.has(PermissionFlagsBits.ManageMessages) || 
                        i.member.permissions.has(PermissionFlagsBits.Administrator);

        if (!esStaff) {
          return i.reply({ content: '🚫 Este botón está reservado exclusivamente para el equipo de Staff.', ephemeral: true });
        }

        if (moderadores.has(userId)) {
          return i.reply({ content: '⚠️ Ya te habías anotado como moderador.', ephemeral: true });
        }

        // Si antes era jugador normal, lo quitamos de esa lista
        jugadores.delete(userId);
        moderadores.add(userId);

        await i.update({ embeds: [generarEmbed()], components: [construirBotones()] });
      }

      // 4. Botón "Ver votos"
      else if (i.customId === 'btn_ver_votos') {
        const listaJugadores = jugadores.size > 0 
          ? Array.from(jugadores).map(id => `<@${id}>`).join(', ') 
          : '*Nadie aún*';

        const listaStaff = moderadores.size > 0 
          ? Array.from(moderadores).map(id => `<@${id}>`).join(', ') 
          : '*Nadie aún*';

        await i.reply({
          content: `👥 **Lista de Votos Registrados:**\n\n` +
                   `🎮 **Jugadores (${jugadores.size}):** ${listaJugadores}\n` +
                   `🛡️ **Staffs Moderando (${moderadores.size}):** ${listaStaff}`,
          ephemeral: true
        });
      }
    });

    // Al finalizar el colector (sea por tiempo o por cumplir la meta)
    collector.on('end', async (collected, reason) => {
      // SI SE LOGRÓ EL MÍNIMO DE VOTOS
      if (reason === 'meta_alcanzada' || jugadores.size >= minimoVotos) {
        const guild = interaction.guild;

        try {
          // Crear la categoría dinámica
          const categoria = await guild.channels.create({
            name: `🔴 [${nombreSesion.toUpperCase()} - EN VIVO]`,
            type: ChannelType.GuildCategory,
          });

          // Crear canal 911
          const canal911 = await guild.channels.create({
            name: `911-${nombreSesion.toLowerCase()}`,
            type: ChannelType.GuildText,
            parent: categoria.id,
          });

          // Guardar Session Key en la memoria del bot
          const sessionKey = `KEY-${Math.floor(1000 + Math.random() * 9000)}`;
          global.sesionesActivas.set(sessionKey, {
            nombre: nombreSesion,
            categoriaId: categoria.id,
            canal911Id: canal911.id,
            host: interaction.user.tag
          });

          const embedExito = EmbedBuilder.from(generarEmbed('🚀 SESIÓN INICIADA Y CANALES CREADOS'))
            .setColor(0x2ECC71)
            .addFields({
              name: '🔑 Vinculación Roblox',
              value: `Key: \`${sessionKey}\` | Canal: <#${canal911.id}>`
            });

          await mensajeVotacion.edit({
            embeds: [embedExito],
            components: [construirBotones(true)]
          });

        } catch (err) {
          console.error(err);
        }
      } 
      // SI EXPIRÓ EL TIEMPO SIN ALCANZAR EL MÍNIMO
      else {
        const embedCancelado = EmbedBuilder.from(generarEmbed('❌ CANCELADA (Quórum insuficiente)'))
          .setColor(0xE74C3C);

        await mensajeVotacion.edit({
          embeds: [embedCancelado],
          components: [construirBotones(true)]
        });
      }
    });
  }
};