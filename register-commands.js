// register-commands.js
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Para llevar control de nombres y evitar duplicados
const nombresRegistrados = new Set();

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  if ('data' in command && 'execute' in command) {
    const nombreComando = command.data.name;

    if (nombresRegistrados.has(nombreComando)) {
      console.warn(`⚠️ ALERTA: El comando "${nombreComando}" en ${file} está DUPLICADO y fue ignorado.`);
    } else {
      commands.push(command.data.toJSON());
      nombresRegistrados.add(nombreComando);
    }
  } else {
    console.log(`[ADVERTENCIA] Al comando en ${filePath} le falta "data" o "execute".`);
  }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`Cargando ${commands.length} comandos Slash en la API...`);

    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands },
    );

    console.log('✅ ¡Comandos Slash registrados exitosamente!');
  } catch (error) {
    console.error('❌ Error al registrar comandos:', error);
  }
})();