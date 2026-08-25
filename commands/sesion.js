// commands/sesion.js
const { 
  SlashCommandBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  PermissionFlagsBits 
} = require('discord.js');
const { generarEmbedEstadoSesion } = require('../embedSesion');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sesion')
    .setDescription('Inicia el panel de estado de la sesión de RP')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    // 1. Generar el embed con los valores por defecto (Desconocido / Sin eventos)
    const embedInicial = generarEmbedEstadoSesion();

    // 2. Crear un menú interactivo para actualizar los parámetros en vivo
    const menuConfig = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('menu_config_sesion')
        .setPlaceholder('⚙️ Modificar estado de la sesión...')
        .addOptions([
          { label: 'Configurar Vías', value: 'opcion_vias', emoji: '🗺️' },
          { label: 'Configurar Velocidad', value: 'opcion_velocidad', emoji: '🏎️' },
          { label: 'Configurar Adelantamiento', value: 'opcion_adelantamiento', emoji: '⚠️' },
          { label: 'Configurar Evento', value: 'opcion_evento', emoji: '📢' },
        ])
    );

    // 3. Publicar el mensaje inicial
    await interaction.reply({
      embeds: [embedInicial],
      components: [menuConfig]
    });
  }
};
