const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const config = require('../config');

class PainelDeControle {
    constructor(novoMembro) {
        this.novoMembro = novoMembro;
    }

    async enviarLogModeracao(title, color, interaction) {
        const logChannel = interaction.client.channels.cache.get(config.LOG_CHANNEL_ID);
        if (!logChannel) return;

        const embedLog = new EmbedBuilder()
            .setTitle(title)
            .setColor(color)
            .addFields(
                { name: "Membro", value: this.novoMembro.toString(), inline: false },
                { name: "Moderador", value: interaction.user.toString(), inline: false }
            )
            .setTimestamp();

        await logChannel.send({ embeds: [embedLog] });
    }

    createActionRow() {
        const boasVindasButton = new ButtonBuilder()
            .setCustomId('boas_vindas')
            .setLabel('Boas-vindas')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('👋');

        const expulsarButton = new ButtonBuilder()
            .setCustomId('expulsar')
            .setLabel('Expulsar')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🚪');

        const banirButton = new ButtonBuilder()
            .setCustomId('banir')
            .setLabel('Banir')
            .setStyle(ButtonStyle.Danger);

        return new ActionRowBuilder()
            .addComponents(boasVindasButton, expulsarButton, banirButton);
    }

    async handleBoasVindas(interaction) {
        const publicWelcomeChannel = interaction.client.channels.cache.get(config.PUBLIC_WELCOME_CHANNEL_ID);
        if (!publicWelcomeChannel) {
            await interaction.reply({ content: "❌ Canal público de boas-vindas não configurado!", ephemeral: true });
            return;
        }

        const mensagem = `**Olá ${this.novoMembro.toString()}! Seja muito bem vind@ em nosso servidor!!!** ✨\n\n` +
                        `➡️ Acesse nosso <#${config.SUMMARY_CHANNEL_ID}> e conheça seu novo cantinho.\n` +
                        `• Confira nossas <#${config.GUIDELINES_CHANNEL_ID}>!\n` +
                        `• Envio de imagem é liberado no nível 10. 🐘\n\n` +
                        `espero que se divirta! 🐶`;

        const roleToMention = interaction.guild.roles.cache.get(config.WELCOME_GANG_ROLE_ID);
        const roleMentionText = roleToMention ? roleToMention.toString() : "";

        await publicWelcomeChannel.send(`${mensagem}\n\n${roleMentionText}`);

        // Desabilitar o botão
        const row = this.createActionRow();
        row.components[0].setDisabled(true).setLabel('Boas-vindas (Enviado)');

        await interaction.update({ components: [row] });
        await this.enviarLogModeracao("👋 Ação de Boas-vindas Realizada", 0x00FF00, interaction);
    }

    async handleExpulsar(interaction) {
        if (!interaction.member.permissions.has('KickMembers')) {
            await interaction.reply({ content: "❌ Você não tem permissão para expulsar.", ephemeral: true });
            return;
        }

        try {
            await this.novoMembro.kick(`Expulso por ${interaction.user.username}`);
            
            // Desabilitar todos os botões
            const row = this.createActionRow();
            row.components.forEach(component => component.setDisabled(true));

            await interaction.update({ components: [row] });
            await interaction.followUp({ content: `✅ ${this.novoMembro.user.username} foi expulso.`, ephemeral: true });
            await this.enviarLogModeracao("🚪 Membro Expulso", 0xFFA500, interaction);
        } catch (error) {
            await interaction.reply({ content: "❌ Eu não tenho permissão para expulsar este membro.", ephemeral: true });
        }
    }

    async handleBanir(interaction) {
        const requiredRole = interaction.guild.roles.cache.get(config.BAN_COMMAND_ROLE_ID);
        if (requiredRole && !interaction.member.roles.cache.has(config.BAN_COMMAND_ROLE_ID)) {
            await interaction.reply({ content: `❌ Você precisa do cargo \`${requiredRole.name}\` para usar este botão.`, ephemeral: true });
            return;
        }

        try {
            await this.novoMembro.ban({ reason: `Banido por ${interaction.user.username}` });
            
            // Desabilitar todos os botões
            const row = this.createActionRow();
            row.components.forEach(component => component.setDisabled(true));

            await interaction.update({ components: [row] });
            await interaction.followUp({ content: `✅ ${this.novoMembro.user.username} foi banido.`, ephemeral: true });
            await this.enviarLogModeracao("🔨 Membro Banido", 0xFF0000, interaction);
        } catch (error) {
            await interaction.reply({ content: "❌ Eu não tenho permissão para banir este membro.", ephemeral: true });
        }
    }
}

module.exports = PainelDeControle;

