// embedSesion.js
const { EmbedBuilder } = require('discord.js');

/**
 * Genera el Embed principal con el estado del servidor.
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

/**
 * Genera el Embed decorado para la Votación de la Sesión.
 */
function generarEmbedVotacionSesion(totalVotos = 0, totalMods = 0) {
  return new EmbedBuilder()
    .setTitle('🗳️ Votación Oficial | Apertura de Sesión')
    .setColor(0x3498DB)
    .setDescription('> 📢 **¡Se está evaluando la apertura de una nueva sesión de Rol!**\nVota a continuación para confirmar tu asistencia.')
    .addFields(
      { 
        name: '👥 Votos de Usuarios', 
        value: `\`\`\`\n${totalVotos} Participante(s)\n\`\`\``, 
        inline: true 
      },
      { 
        name: '🛡️ Moderadores Confirmados', 
        value: `\`\`\`\n${totalMods} Staff(s)\n\`\`\``, 
        inline: true 
      },
      {
        name: '📌 Estado de Votación',
        value: '```\nEN PROCESO\n```',
        inline: false
      }
    )
    .setFooter({ 
      text: 'Usa los botones para registrar, cambiar tu voto o ver la lista' 
    })
    .setTimestamp();
}

module.exports = { 
  generarEmbedEstadoSesion, 
  generarEmbedVotacionSesion 
};
