// clear-commands.js
require('dotenv').config();
const { REST, Routes } = require('discord.js');

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('🧹 Iniciando la limpieza de comandos Slash...');

    // 1. Eliminar comandos globales antiguos
    console.log('🔄 Borrando comandos globales...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: [] }
    );
    console.log('✅ Comandos globales eliminados.');

    // 2. Eliminar comandos específicos de Servidor (si existe GUILD_ID en .env)
    if (process.env.GUILD_ID) {
      console.log(`🔄 Borrando comandos del servidor (${process.env.GUILD_ID})...`);
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: [] }
      );
      console.log('✅ Comandos del servidor eliminados.');
    }

    console.log('\n✨ ¡Limpieza completa! Todos los comandos Slash antiguos han sido borrados.');
  } catch (error) {
    console.error('❌ Error al eliminar comandos:', error);
  }
})();