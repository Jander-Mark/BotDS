const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { 
    carregarDadosAsync,
    getUserEconomyDataAsync,
    updateUserDataAsync,
    useFirebase
} = require('../dataHandler');
const config = require('../config');

// --- GERENCIADOR DE TRANSFERÊNCIAS PENDENTES ---
// Usamos um Map para guardar as transações que estão aguardando confirmação.
// Exportamos para que o interactionCreate.js possa acessá-lo.
const pendingTransfers = new Map();
module.exports.pendingTransfers = pendingTransfers;

// --- COMANDOS DE ECONOMIA ---

const carteiraCommand = {
    data: new SlashCommandBuilder()
        .setName('carteira')
        .setDescription('Verifica o seu saldo de moedas furradas ou o de outro membro.')
        .addUserOption(option =>
            option.setName('membro')
                .setDescription('O membro que você quer ver a carteira (opcional)')
                .setRequired(false)
        ),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('membro') || interaction.user;
        const userData = await getUserEconomyDataAsync(targetUser.id, config.ECONOMY_FILE);
        const saldo = userData.carteira || 0;

        const embed = new EmbedBuilder()
            .setTitle(`💰 Carteira de ${targetUser.displayName}`)
            .setDescription(`Você possui **${saldo.toLocaleString()}** moedas furradas!`)
            .setColor(0xFFD700);
        
        await interaction.reply({ embeds: [embed] });
    }
};

const dailyCommand = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Resgate suas 2000 moedas furradas diárias!'),
    async execute(interaction) {
        const userId = interaction.user.id;
        const agora = new Date();
        const userData = await getUserEconomyDataAsync(userId, config.ECONOMY_FILE);
        const ultimoDailyStr = userData.ultimo_daily;

        if (ultimoDailyStr) {
            const ultimoDaily = new Date(ultimoDailyStr);
            const timeDiff = agora - ultimoDaily;
            const hoursInMs = 24 * 60 * 60 * 1000;

            if (timeDiff < hoursInMs) {
                const tempoRestante = hoursInMs - timeDiff;
                const horas = Math.floor(tempoRestante / (60 * 60 * 1000));
                const minutos = Math.floor((tempoRestante % (60 * 60 * 1000)) / (60 * 1000));
                
                await interaction.reply({ 
                    content: `Calma aí, apressadinho! Você precisa esperar mais **${horas}h e ${minutos}m** para resgatar novamente.`, 
                    ephemeral: true 
                });
                return;
            }
        }

        userData.carteira += 2000;
        userData.ultimo_daily = agora.toISOString();
        await updateUserDataAsync(config.ECONOMY_FILE, userId, userData);
        
        await interaction.reply("🎉 Você resgatou suas **2000** moedas furradas diárias! Volte em 24 horas.");
    }
};

const transferirCommand = {
    data: new SlashCommandBuilder()
        .setName('transferir')
        .setDescription('Transfere moedas furradas para outro membro com confirmação.')
        .addUserOption(option =>
            option.setName('membro')
                .setDescription('O membro para quem você quer transferir')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('quantia')
                .setDescription('A quantidade de moedas a transferir')
                .setRequired(true)
                .setMinValue(1)
        ),
    async execute(interaction) {
        const remetente = interaction.user;
        const destinatario = interaction.options.getUser('membro');
        const quantia = interaction.options.getInteger('quantia');

        if (remetente.id === destinatario.id) {
            await interaction.reply({ content: "❌ Você não pode transferir moedas para si mesmo!", ephemeral: true });
            return;
        }
        if (destinatario.bot) {
            await interaction.reply({ content: "❌ Você não pode transferir moedas para um bot!", ephemeral: true });
            return;
        }

        const remetenteData = await getUserEconomyDataAsync(remetente.id, config.ECONOMY_FILE);

        if (remetenteData.carteira < quantia) {
            await interaction.reply({ 
                content: `❌ Você não tem moedas suficientes! Seu saldo é de ${remetenteData.carteira.toLocaleString()} moedas.`, 
                ephemeral: true 
            });
            return;
        }

        const transactionId = `${remetente.id}-${destinatario.id}-${Date.now()}`;
        const transferTimeLimit = 15 * 60 * 1000;
        const expirationTimestamp = Math.floor((Date.now() + transferTimeLimit) / 1000);

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle("🤝 Confirmação de Transferência")
            .setDescription(
                `**${remetente.displayName}** iniciou uma transferência de **${quantia.toLocaleString()}** moedas furradas para **${destinatario.displayName}**!\n\n` +
                `Para a transação ser concluída, ambos devem clicar no botão "Aceitar Transferência" abaixo.\n\n` +
                `A transação expira em <t:${expirationTimestamp}:R> (às <t:${expirationTimestamp}:T>).`
            )
            .addFields({
                name: "⚠️ Atenção",
                value: "Lembre-se: transferências são finais. Envie moedas apenas para pessoas de confiança."
            });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`accept_transfer_${transactionId}`)
                    .setLabel("Aceitar Transferência (0/2)")
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✔️')
            );
        
        await interaction.reply({
            content: `${remetente.toString()}, ${destinatario.toString()}`,
            embeds: [embed],
            components: [row]
        });

        const message = await interaction.fetchReply();

        pendingTransfers.set(transactionId, {
            remetenteId: remetente.id,
            destinatarioId: destinatario.id,
            quantia: quantia,
            accepted: new Set(),
            messageId: message.id,
            channelId: interaction.channel.id,
        });

        setTimeout(() => {
            const transfer = pendingTransfers.get(transactionId);
            if (transfer) {
                const expiredEmbed = new EmbedBuilder()
                    .setColor(0xED4245)
                    .setTitle("🚫 Transferência Expirada")
                    .setDescription(`A transferência de **${quantia.toLocaleString()}** moedas de ${remetente.toString()} para ${destinatario.toString()} não foi confirmada a tempo e expirou.`);
                
                const disabledButton = new ActionRowBuilder().addComponents(
                    ButtonBuilder.from(row.components[0]).setDisabled(true).setLabel("Expirado")
                );

                message.edit({ embeds: [expiredEmbed], components: [disabledButton] });
                pendingTransfers.delete(transactionId);
            }
        }, transferTimeLimit);
    }
};

const statusCarteiraCommand = {
    data: new SlashCommandBuilder()
        .setName('status_carteira')
        .setDescription('Mostra suas estatísticas do evento de carteira perdida.'),
    async execute(interaction) {
        const userData = await getUserEconomyDataAsync(interaction.user.id, config.ECONOMY_FILE);
        
        const embed = new EmbedBuilder()
            .setTitle(`📊 Status de Carteiras de ${interaction.user.displayName}`)
            .setColor(0x0099FF)
            .addFields(
                { name: "😇 Carteiras Devolvidas", value: `\`${userData.carteiras_devolvidas}\``, inline: true },
                { name: "🏃 Carteiras Pegas", value: `\`${userData.carteiras_pegas}\``, inline: true },
                { name: "\u200b", value: "\u200b", inline: false },
                { name: "💸 Ganhos Devolvendo", value: `\`${userData.ganhos_devolvendo.toLocaleString()}\` moedas`, inline: true },
                { name: "💰 Ganhos Pegando", value: `\`${userData.ganhos_pegando.toLocaleString()}\` moedas`, inline: true },
                { name: "🚓 Multas da Pawlice", value: `\`${userData.perdas_policia.toLocaleString()}\` moedas`, inline: true }
            );
        
        await interaction.reply({ embeds: [embed] });
    }
};

const topcarteiraCommand = {
    data: new SlashCommandBuilder()
        .setName('topcarteira')
        .setDescription('Mostra o ranking de moedas do servidor.'),
    async execute(interaction) {
        const economia = await carregarDadosAsync(config.ECONOMY_FILE);
        
        if (!economia || Object.keys(economia).length === 0) {
            await interaction.reply("Ainda não há ninguém no ranking de carteiras!");
            return;
        }
        
        const sortedWallets = Object.entries(economia).sort((a, b) => (b[1].carteira || 0) - (a[1].carteira || 0));
        
        const embed = new EmbedBuilder()
            .setTitle("💰 Ranking de Moedas Furradas")
            .setColor(0xFFD700);
        
        let description = "";
        for (let i = 0; i < Math.min(10, sortedWallets.length); i++) {
            const [userId, data] = sortedWallets[i];
            try {
                const member = await interaction.guild.members.fetch(userId);
                description += `**#${i + 1}** ${member.displayName} - ${(data.carteira || 0).toLocaleString()} moedas\n`;
            } catch (error) {
                description += `**#${i + 1}** *Membro Desconhecido (ID: ${userId})* - ${(data.carteira || 0).toLocaleString()} moedas\n`;
            }
        }
        
        embed.setDescription(description);
        await interaction.reply({ embeds: [embed] });
    }
};

module.exports = { 
    pendingTransfers,
    carteiraCommand, 
    dailyCommand, 
    transferirCommand, 
    statusCarteiraCommand, 
    topcarteiraCommand 
};
