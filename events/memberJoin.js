const { EmbedBuilder } = require('discord.js');
const { 
    getUserDataAsync,
    incrementUserFieldAsync,
} = require('../dataHandler');
const config = require('../config');
const PainelDeControle = require('../views/PainelDeControle');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        const canalEntrada = member.client.channels.cache.get(config.WELCOME_CHANNEL_ID);
        if (!canalEntrada) {
            console.error(`Canal de entrada com ID ${config.WELCOME_CHANNEL_ID} não encontrado.`);
            return;
        }

        try {
            // Passo 1: Incrementa o contador de entradas usando a função centralizada do dataHandler.
            // Isso funciona tanto para Firebase quanto para o JSON local.
            await incrementUserFieldAsync(config.ENTRY_COUNT_FILE, member.id, 'count', 1);

            // Passo 2: Obtém os dados atualizados do usuário.
            const userData = await getUserDataAsync(config.ENTRY_COUNT_FILE, member.id);

            // Passo 3: Extrai o valor do contador. userData será um objeto como { count: N }.
            const totalEntradas = userData.count || 1;

            const embed = new EmbedBuilder()
                .setTitle("🎯 Painel de entrada")
                .setDescription(`Informações sobre ${member.toString()}`)
                .setColor(0x5865F2)
                .addFields(
                    { name: "🏷️ Tag do Discord", value: `\`${member.user.tag}\``, inline: false },
                    { name: "🆔 ID do Discord", value: `\`${member.id}\``, inline: false },
                    // A variável 'totalEntradas' agora será sempre um número, corrigindo o bug.
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

        } catch (error) {
            console.error("Ocorreu um erro no evento guildMemberAdd:", error);
        }
    }
};
