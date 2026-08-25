// index.js
require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, MessageFlags } = require('discord.js');
const express = require('express');
const fs = require('fs');
const path = require('path');
const { obtenerCuenta, actualizarSaldo } = require('./economyManager');
const { iniciarTickerService } = require('./services/marketTicker');

// 1. Memoria global para sesiones
global.sesionesActivas = new Map();

// 2. Cliente de Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent 
  ]
});

// 3. Cargar Comandos
client.commands = new Map();
const commandsPath = path.join(__dirname, 'commands');

if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      console.log(`📂 Comando listo: /${command.data.name}`);
    }
  }
}

// 4. Mención a @911
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const mencionaRol911 = message.mentions.roles.some(role => role.name.toLowerCase() === '911');
  const contieneTexto911 = message.content.includes('@911');

  if (mencionaRol911 || contieneTexto911) {
    try {
      await message.react('🚨');
    } catch (err) {
      console.log('⚠️ Falta el permiso Add Reactions en Discord.');
    }

    let sesionActual = null;
    let currentKey = null;

    for (const [key, sesion] of global.sesionesActivas.entries()) {
      if (sesion.canal911Id === message.channel.id) {
        sesionActual = sesion;
        currentKey = key;
        break;
      }
    }

    if (!sesionActual) {
      return message.reply({
        content: '⚠️ **Error:** Este canal no pertenece a ninguna sesión activa de RP.'
      });
    }

    const motivoLlamada = message.content.replace(/<@&\d+>/g, '').replace('@911', '').trim();

    const embedAlerta = new EmbedBuilder()
      .setTitle(`📻 DESPACHO 911 | TRANSMISIÓN OFICIAL`)
      .setColor(0x00FF00)
      .setDescription(`✅ **Alerta canalizada correctamente hacia el servidor de Roblox.**`)
      .addFields(
        { name: '👤 Despachador', value: `<@${message.author.id}>`, inline: true },
        { name: '🔑 Key de Sesión', value: `\`${currentKey}\``, inline: true },
        { name: '📝 Reporte Transmitido', value: motivoLlamada || '*Sin detalles adicionales*' }
      )
      .setTimestamp();

    await message.reply({ embeds: [embedAlerta] });
  }
});

// 5. Manejo de Comandos Slash
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    const contenidoError = { content: '❌ Hubo un error al ejecutar este comando.', flags: MessageFlags.Ephemeral };
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(contenidoError);
    } else {
      await interaction.reply(contenidoError);
    }
  }
});

// Evento: Bot Listo / Iniciar Ticker de Mercado
client.once('ready', async () => {
  console.log(`🤖 Bot conectado exitosamente como: ${client.user.tag}`);

  // Iniciar el Ticker del Mercado Cripto si se definió la variable en el .env
  const canalTickerId = process.env.CANAL_TICKER_ID;
  if (canalTickerId) {
    await iniciarTickerService(client, canalTickerId);
    console.log(`📈 Servicio de Ticker Financiero en vivo activado en canal ID: ${canalTickerId}`);
  } else {
    console.log('⚠️ Warning: No se definió CANAL_TICKER_ID en el archivo .env. El Ticker no se auto-publicará.');
  }
});

// 6. Servidor API Express
const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.send('API Central de Rolplay operativa.');
});

// Endpoint de 911 (Roblox -> Discord)
app.post('/api/roblox/911', async (req, res) => {
  const { sessionKey, jugador, motivo, ubicacion } = req.body;

  if (!sessionKey || !jugador || !motivo || !ubicacion) {
    return res.status(400).json({ error: 'Faltan campos requeridos en el JSON.' });
  }

  const sesion = global.sesionesActivas.get(sessionKey);

  if (!sesion) {
    return res.status(404).json({ error: 'La Session Key enviada no existe o está inactiva.' });
  }

  try {
    const canal911 = await client.channels.fetch(sesion.canal911Id);

    if (canal911) {
      const embed911 = new EmbedBuilder()
        .setTitle(`🚨 ALERTA 911 (ROBLOX ➔ DISCORD) | ${sesion.nombre}`)
        .setColor(0xFF0000)
        .addFields(
          { name: '👤 Informante IC', value: jugador, inline: true },
          { name: '📍 Ubicación', value: ubicacion, inline: true },
          { name: '📝 Motivo de Llamada', value: motivo }
        )
        .setTimestamp();

      await canal911.send({ embeds: [embed911] });
      return res.status(200).json({ status: 'Éxito', mensaje: 'Mensaje 911 enviado a Discord.' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Error al enviar la alerta al canal de Discord.' });
  }
});

// Endpoint Transacciones del Banco (Roblox / Postman -> Discord)
app.post('/api/roblox/economia/transaccion', (req, res) => {
  const { discordId, monto, tipo } = req.body;

  if (!discordId || monto === undefined) {
    return res.status(400).json({ error: 'Faltan parámetros requeridos (discordId, monto).' });
  }

  const cuenta = obtenerCuenta(discordId);

  if (tipo === 'banco') {
    actualizarSaldo(discordId, 0, monto);
  } else {
    actualizarSaldo(discordId, monto, 0);
  }

  const estadoActualizado = obtenerCuenta(discordId);

  console.log(`\n🏦 [TRANSACCIÓN BANCARIA EN VIVO]`);
  console.log(`👤 Usuario ID: ${discordId}`);
  console.log(`💵 Movimiento: $${monto} (${tipo || 'efectivo'})`);
  console.log(`💳 Nuevo Saldo Banco: $${estadoActualizado.banco}`);

  return res.status(200).json({ 
    status: 'Éxito', 
    mensaje: `Transacción procesada correctamente.`,
    cuenta: estadoActualizado
  });
});

// 7. Encender Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Servidor Express escuchando en puerto ${PORT}`);
});

client.login(process.env.DISCORD_TOKEN);