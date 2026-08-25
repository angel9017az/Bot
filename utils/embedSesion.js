// embedSesion.js
const { EmbedBuilder } = require('discord.js');

/**
 * Genera el Embed con la plantilla visual requerida.
 * Si no se pasan parámetros, los campos tomarán el valor por defecto ("Desconocido").
 */
function generarEmbedEstadoSesion(datos = {}) {
  const {
    estado = '🟢 **ROL ACTIVO**',
    vias = 'Desconocido',
    limiteVelocidad = 'Desconocido',
    adelantamiento = 'Desconocido',
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
