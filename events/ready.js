const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const { CarteiraPerdidaView, CristalMisteriosoView } = require('../views/EventViews');

module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        console.log(`Bot conectado como ${client.user.tag}`);
        
        // Iniciar tarefa de drop automático
        startAutoDropTask(client);
    }
};

function startAutoDropTask(client) {
    console.log("Tarefa de drop automático iniciada.");
    
    setInterval(async () => {
        if (!config.AUTO_DROP_CHANNELS || config.AUTO_DROP_CHANNELS.length === 0) {
            return;
        }

        if (Math.random() * 100 <= config.AUTO_DROP_CHANCE) {
            const channelId = config.AUTO_DROP_CHANNELS[Math.floor(Math.random() * config.AUTO_DROP_CHANNELS.length)];
            const channel = client.channels.cache.get(channelId);
            
            if (channel) {
                const isCarteira = Math.random() < 0.5;
                
                if (isCarteira) {
                    console.log(`Dropando carteira automaticamente no canal: ${channel.name}`);
                    const embed = new EmbedBuilder()
                        .setTitle("👜 Uma Carteira Perdida!")
                        .setDescription("Oh não! Alguém deixou uma carteira cair aqui!\nO que você vai fazer?")
                        .setColor(0xD3D3D3);
                    
                    const carteiraPerdidaView = new CarteiraPerdidaView();
                    const row = carteiraPerdidaView.createActionRow();
                    
                    await channel.send({ embeds: [embed], components: [row] });
                } else {
                    console.log(`Dropando cristal automaticamente no canal: ${channel.name}`);
                    const embed = new EmbedBuilder()
                        .setTitle("🔮 O que é isso?")
                        .setDescription("Um cristal brilhante misterioso surgiu, sua energia o atrai em direção a ele, o que você deseja fazer?")
                        .setColor(0xAB8FE9);
                    
                    const cristalMisteriosoView = new CristalMisteriosoView();
                    const row = cristalMisteriosoView.createActionRow();
                    
                    await channel.send({ embeds: [embed], components: [row] });
                }
            }
        }
    }, 5 * 60 * 1000); // 5 minutos
}

