const { EmbedBuilder } = require('discord.js');
const { 
    carregarDados, 
    salvarDados,
    getUserDataAsync,
    setUserDataAsync,
    incrementUserFieldAsync,
    useFirebase
} = require('../dataHandler');
const config = require('../config');
const PainelDeControle = require('../views/PainelDeControle');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        const canalEntrada = member.client.channels.cache.get(config.WELCOME_CHANNEL_ID);
        if (!canalEntrada) return;

        let totalEntradas;
        
        if (useFirebase()) {
            // Incrementar contador no Firebase
            await incrementUserFieldAsync(config.ENTRY_COUNT_FILE, member.id, 'count', 1);
            const userData = await getUserDataAsync(config.ENTRY_COUNT_FILE, member.id);
            totalEntradas = userData.count || 1;
        } else {
            // Usar JSON local
            const contagens = carregarDados(config.ENTRY_COUNT_FILE);
            const idMembroStr = member.id.toString();
            contagens[idMembroStr] = (contagens[idMembroStr] || 0) + 1;
            salvarDados(config.ENTRY_COUNT_FILE, contagens);
            totalEntradas = contagens[idMembroStr];
        }

        const embed = new EmbedBuilder()
            .setTitle("🎯 Painel de entrada")
            .setDescription(`Informações sobre ${member.toString()}`)
            .setColor(0x5865F2)
            .addFields(
                { name: "🏷️ Tag do Discord", value: `\`${member.user.tag}\``, inline: false },
                { name: "🆔 ID do Discord", value: `\`${member.id}\``, inline: false },
                { name: "📈 Total entradas", value: `Entrou **${totalEntradas}** vez(es).`, inline: false },
                { name: "📅 Criação da conta", value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`, inline: false }
            )
            .setFooter({ text: `ID do Servidor: ${member.guild.id}` })
            .setTimestamp();

        if (member.user.avatarURL()) {
            embed.setThumbnail(member.user.avatarURL());
        } else {
            embed.setThumbnail(member.user.defaultAvatarURL);
        }

        const painelDeControle = new PainelDeControle(member);
        const row = painelDeControle.createActionRow();

        const staffRole = member.guild.roles.cache.get(config.STAFF_ROLE_ID);
        const staffMentionText = staffRole ? staffRole.toString() : "";

        await canalEntrada.send({ 
            content: staffMentionText, 
            embeds: [embed], 
            components: [row] 
        });
    }
};

