const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionsBitField } = require('discord.js');
const config = require('../config');

class PainelDeControle {
    constructor(novoMembro) {
        this.novoMembro = novoMembro;
    }

    async enviarLogModeracao(title, color, interaction) {
        const logChannel = interaction.client.channels.cache.get(config.LOG_CHANNEL_ID);
        if (!logChannel) {
            console.warn("[AVISO] ID do canal de log (LOG_CHANNEL_ID) não encontrado ou inválido no config.js.");
            return;
        }

        const embedLog = new EmbedBuilder()
            .setTitle(title)
            .setColor(color)
            .addFields(
                { name: "Membro", value: `${this.novoMembro.user.tag} (${this.novoMembro.id})`, inline: false },
                { name: "Moderador", value: `${interaction.user.tag} (${interaction.user.id})`, inline: false }
            )
            .setTimestamp();

        try {
            await logChannel.send({ embeds: [embedLog] });
        } catch (error) {
            console.error("Erro ao enviar log de moderação:", error);
        }
    }

    createActionRow() {
        const memberId = this.novoMembro.id;

        const boasVindasButton = new ButtonBuilder().setCustomId(`boas_vindas_${memberId}`).setLabel('Boas-vindas').setStyle(ButtonStyle.Primary).setEmoji('👋');
        const expulsarButton = new ButtonBuilder().setCustomId(`expulsar_${memberId}`).setLabel('Expulsar').setStyle(ButtonStyle.Secondary).setEmoji('🚪');
        const banirButton = new ButtonBuilder().setCustomId(`banir_${memberId}`).setLabel('Banir').setStyle(ButtonStyle.Danger);

        return new ActionRowBuilder().addComponents(boasVindasButton, expulsarButton, banirButton);
    }

    async handleBoasVindas(interaction) {
        // Passo 1: Responde imediatamente para o Discord não dar timeout.
        await interaction.deferUpdate();
        console.log(`[DEBUG] handleBoasVindas: Interação recebida e deferida para o membro ${this.novoMembro.id}.`);

        // Passo 2: Verifica a existência do canal de boas-vindas.
        const publicWelcomeChannel = interaction.client.channels.cache.get(config.PUBLIC_WELCOME_CHANNEL_ID);
        if (!publicWelcomeChannel) {
            console.error(`[ERRO CRÍTICO] O canal de boas-vindas público (ID: ${config.PUBLIC_WELCOME_CHANNEL_ID}) NÃO FOI ENCONTRADO.`);
            await interaction.followUp({ content: "❌ O canal público de boas-vindas não está configurado ou não foi encontrado! Verifique o ID em `config.js`.", ephemeral: true });
            return;
        }
        console.log(`[DEBUG] Canal de boas-vindas encontrado: ${publicWelcomeChannel.name}`);

        // Passo 3: Verifica explicitamente as permissões do bot no canal.
        const permissions = publicWelcomeChannel.permissionsFor(interaction.client.user);
        if (!permissions.has(PermissionsBitField.Flags.ViewChannel)) {
             console.error(`[ERRO CRÍTICO] O bot NÃO TEM PERMISSÃO para VER o canal de boas-vindas.`);
             await interaction.followUp({ content: "❌ Falha crítica: Eu não tenho permissão para **ver** o canal de boas-vindas!", ephemeral: true });
             return;
        }
        if (!permissions.has(PermissionsBitField.Flags.SendMessages)) {
            console.error(`[ERRO CRÍTICO] O bot NÃO TEM PERMISSÃO para ENVIAR MENSAGENS no canal de boas-vindas.`);
            await interaction.followUp({ content: "❌ Falha crítica: Eu não tenho permissão para **enviar mensagens** no canal de boas-vindas!", ephemeral: true });
            return;
        }
        console.log(`[DEBUG] Permissões verificadas. O bot pode ver e enviar mensagens no canal.`);

        // Passo 4: Constrói a mensagem e verifica os IDs internos.
        const summaryChannel = `<#${config.SUMMARY_CHANNEL_ID}>`;
        const guidelinesChannel = `<#${config.GUIDELINES_CHANNEL_ID}>`;
        const welcomeRole = interaction.guild.roles.cache.get(config.WELCOME_GANG_ROLE_ID);
        console.log(`[DEBUG] IDs da mensagem: Resumo: ${config.SUMMARY_CHANNEL_ID}, Diretrizes: ${config.GUIDELINES_CHANNEL_ID}, Cargo: ${config.WELCOME_GANG_ROLE_ID} (Encontrado: ${!!welcomeRole})`);
        
        const mensagem = `**Olá ${this.novoMembro.toString()}! Seja muito bem-vind@ em nosso servidor!!!** ✨\n\n` +
                        `➡️ Acesse nosso ${summaryChannel} e conheça seu novo cantinho.\n` +
                        `• Confira nossas ${guidelinesChannel}!\n` +
                        `• Envio de imagem é liberado no nível 10. 🐘\n\n` +
                        `espero que se divirta! 🐶`;
        const roleMentionText = welcomeRole ? welcomeRole.toString() : "";

        // Passo 5: Tenta enviar a mensagem.
        try {
            console.log(`[DEBUG] Tentando enviar a mensagem final para o canal ${publicWelcomeChannel.name}...`);
            await publicWelcomeChannel.send(`${mensagem}\n\n${roleMentionText}`);
            console.log(`[SUCESSO] Mensagem de boas-vindas enviada.`);
            
            const newRow = ActionRowBuilder.from(interaction.message.components[0]);
            newRow.components[0].setDisabled(true).setLabel('Boas-vindas (Enviado)');
            
            await interaction.editReply({ components: [newRow] });
            await this.enviarLogModeracao("👋 Ação de Boas-vindas Realizada", 0x00FF00, interaction);

        } catch (error) {
            console.error("[ERRO CRÍTICO] O envio da mensagem falhou! Detalhes do erro:", error);
            await interaction.followUp({ 
                content: "❌ Ocorreu um erro inesperado ao tentar enviar a mensagem. Verifique o console do bot para mais detalhes sobre a falha.", 
                ephemeral: true 
            });
        }
    }

    async handleExpulsar(interaction) {
        if (!interaction.member.permissions.has('KickMembers')) {
            await interaction.reply({ content: "❌ Você não tem permissão para expulsar membros.", ephemeral: true });
            return;
        }
        try {
            await this.novoMembro.kick(`Expulso por ${interaction.user.tag} através do painel de entrada.`);
            const newRow = ActionRowBuilder.from(interaction.message.components[0]);
            newRow.components.forEach(component => component.setDisabled(true));
            await interaction.update({ components: [newRow] });
            await interaction.followUp({ content: `✅ ${this.novoMembro.user.username} foi expulso com sucesso.`, ephemeral: true });
            await this.enviarLogModeracao("🚪 Membro Expulso", 0xFFA500, interaction);
        } catch (error) {
            console.error("Erro ao expulsar membro:", error);
            await interaction.reply({ content: "❌ Falha ao expulsar o membro. Verifique se meu cargo está acima do dele e se tenho as permissões necessárias.", ephemeral: true });
        }
    }

    async handleBanir(interaction) {
        if (!interaction.member.permissions.has('BanMembers')) {
            await interaction.reply({ content: "❌ Você não tem permissão para banir membros.", ephemeral: true });
            return;
        }
        try {
            await this.novoMembro.ban({ reason: `Banido por ${interaction.user.tag} através do painel de entrada.` });
            const newRow = ActionRowBuilder.from(interaction.message.components[0]);
            newRow.components.forEach(component => component.setDisabled(true));
            await interaction.update({ components: [newRow] });
            await interaction.followUp({ content: `✅ ${this.novoMembro.user.username} foi banido com sucesso.`, ephemeral: true });
            await this.enviarLogModeracao("🔨 Membro Banido", 0xFF0000, interaction);
        } catch (error) {
            console.error("Erro ao banir membro:", error);
            await interaction.reply({ content: "❌ Falha ao banir o membro. Verifique se meu cargo está acima do dele e se tenho as permissões necessárias.", ephemeral: true });
        }
    }
}

module.exports = PainelDeControle;
