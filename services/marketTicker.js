// services/marketTicker.js
const { EmbedBuilder } = require('discord.js');
const { cargarMercado, guardarMercado, actualizarPreciosMercado } = require('../marketManager');

function generarGraficoASCII(historico) {
  if (!historico || historico.length < 2) return '[ ▬ ▬ ▬ ▬ ]';
  const min = Math.min(...historico);
  const max = Math.max(...historico);
  const rango = max - min || 1;
  const bloques = [' ', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

  return historico.map(val => {
    const indice = Math.floor(((val - min) / rango) * (bloques.length - 1));
    return bloques[Math.max(0, Math.min(bloques.length - 1, indice))];
  }).join(' ');
}

function construirEmbedTicker() {
  const mercado = cargarMercado();
  const embed = new EmbedBuilder()
    .setTitle('📊 BOLSA & MERCADO DE CRIPTOMONEDAS EN VIVO')
    .setColor(0x1F6FEB)
    .setDescription('El mercado fluctúa periódicamente. Compra barato, vende caro y retira tus ganancias al banco.')
    .setFooter({ text: 'Actualización automática cada 5 minutos • Usa /inversion para operar' })
    .setTimestamp();

  for (const simbolo in mercado.activos) {
    const a = mercado.activos[simbolo];
    const historico = a.historico || [a.precio];
    const precioPrev = historico[historico.length - 2] || a.precio;
    const diff = a.precio - precioPrev;
    const porcentaje = (((diff) / precioPrev) * 100).toFixed(2);

    const flecha = diff >= 0 ? '📈' : '📉';
    const signo = diff >= 0 ? '+' : '';
    const colorEstado = diff >= 0 ? '🟢' : '🔴';
    const grafico = generarGraficoASCII(historico);

    embed.addFields({
      name: `${a.icono} ${a.nombre}`,
      value: `>>> **Precio Actual:** \`$${a.precio.toLocaleString()} USD\`\n` +
             `**Tendencia:** ${colorEstado} \`${signo}${porcentaje}%\` ${flecha}\n` +
             `**Gráfico (Velas):** \`[ ${grafico} ]\``,
      inline: false
    });
  }

  return embed;
}

async function iniciarTickerService(client, channelId) {
  const actualizarMensaje = async () => {
    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel) return;

      actualizarPreciosMercado();
      const embed = construirEmbedTicker();

      const mercado = cargarMercado();

      if (mercado.ultimoCanalId === channelId && mercado.ultimoMensajeId) {
        try {
          const msg = await channel.messages.fetch(mercado.ultimoMensajeId);
          if (msg) {
            await msg.edit({ embeds: [embed] });
            return;
          }
        } catch (e) {
          // El mensaje anterior fue borrado
        }
      }

      const nuevoMsg = await channel.send({ embeds: [embed] });
      mercado.ultimoCanalId = channelId;
      mercado.ultimoMensajeId = nuevoMsg.id;
      guardarMercado(mercado);
    } catch (err) {
      console.error('Error actualizando el ticker del mercado:', err.message);
    }
  };

  await actualizarMensaje();
  setInterval(actualizarMensaje, 5 * 60 * 1000); // Se actualiza cada 5 minutos
}

module.exports = { iniciarTickerService, construirEmbedTicker };
