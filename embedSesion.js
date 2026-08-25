// embedSesion.js
const { EmbedBuilder } = require('discord.js');

/**
 * Genera el Embed con el diseño visual del estado de la sesión.
 */
function generarEmbedEstadoSesion(datos = {}) {
  const {
    estado = '🟢 **ROL ACTIVO**',
    vias = 'Desconocido',
    limiteVelocidad = 'Desconocido',
    adelantamiento = 'Desconocido',
    metodoUnirse = 'Desconocido',
    evento = 'Sin eventos',
    ultimaActualizacion = 'Recién iniciada'
  } = datos;

  return new EmbedBuilder()
    .setTitle('🚓 Estado del Servidor | RP')
    .setColor(0x2ECC71)
    .setDescription(`> ${estado}`)
    .addFields(
      { 
        name: '🗺️ Vías Autorizadas', 
        value: `\`\`\`\n${vias}\n\`\`\``, 
        inline: true 
      },
      { 
        name: '🏎️ Límite de Velocidad', 
        value: `\`\`\`\n${limiteVelocidad}\n\`\`\``, 
        inline: true 
      },
      { 
        name: '⚠️ Adelantamiento', 
        value: `\`\`\`\n${adelantamiento}\n\`\`\``, 
        inline: true 
      },
      { 
        name: '🔑 Método de Unirse', 
        value: `\`\`\`\n${metodoUnirse}\n\`\`\``, 
        inline: true 
      },
      { 
        name: '📢 Evento Global', 
        value: `\`\`\`\n${evento}\n\`\`\``, 
        inline: true 
      },
      { 
        name: '🕒 Última actualización', 
        value: `\`\`\`\n${ultimaActualizacion}\n\`\`\``, 
        inline: false 
      }
    )
    .setFooter({ 
      text: 'Solo el personal de Staff autorizado puede modificar este panel' 
    })
    .setTimestamp();
}

module.exports = { generarEmbedEstadoSesion };
