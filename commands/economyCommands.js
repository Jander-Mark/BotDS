const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { 
    getUserEconomyDataAsync,
    updateUserDataAsync,
    logTransaction,
    getUserDataAsync,
    carregarDadosAsync, // Adicionado para o topcarteira
    HISTORICO_FILE
} = require('../dataHandler');
const config = require('../config');

const pendingTransfers = new Map();

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
        // ADICIONADO: Deferir a resposta para evitar timeout
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('membro') || interaction.user;
        const userData = await getUserEconomyDataAsync(targetUser.id, config.ECONOMY_FILE);
        const saldo = userData.carteira || 0;

        const embed = new EmbedBuilder()
            .setTitle(`💰 Carteira de ${targetUser.displayName}`)
            .setDescription(`Você possui **${saldo.toLocaleString()}** moedas furradas!`)
            .setColor(0xFFD700);
        
        // ALTERADO: de .reply para .editReply
        await interaction.editReply({ embeds: [embed] });
    }
};

const dailyCommand = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Resgate suas 2000 moedas furradas diárias!'),
    async execute(interaction) {
        // ADICIONADO: Deferir a resposta. O ephemeral será definido no editReply.
        await interaction.deferReply({ ephemeral: true });

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
                
                // ALTERADO: para editReply. Já é ephemeral por causa do defer.
                await interaction.editReply({ 
                    content: `Calma aí, apressadinho! Você precisa esperar mais **${horas}h e ${minutos}m** para resgatar novamente.`
                });
                return;
            }
        }

        const ganhoDaily = 2000;
        userData.carteira = (userData.carteira || 0) + ganhoDaily;
        userData.ultimo_daily = agora.toISOString();
        await updateUserDataAsync(config.ECONOMY_FILE, userId, userData);
        
        await logTransaction(userId, 'DAILY', ganhoDaily, 'Resgate diário');
        
        // ALTERADO: para editReply e removendo o ephemeral, tornando a resposta pública
        await interaction.editReply({
            content: `🎉 Você resgatou suas **${ganhoDaily.toLocaleString()}** moedas furradas diárias! Volte em 24 horas.`,
            ephemeral: false
        });
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
        // Este comando é mais complexo, a resposta inicial precisa ser imediata
        // para pingar os usuários. A lógica de defer não se aplica da mesma forma.
        // O getUserEconomyDataAsync aqui é uma checagem. Se ela demorar, pode dar erro.
        // A correção principal nos outros comandos deve resolver a maior parte dos casos.
        
        await interaction.deferReply({ ephemeral: true }); // Deferir de forma efêmera para a checagem

        const remetente = interaction.user;
        const destinatario = interaction.options.getUser('membro');
        const quantia = interaction.options.getInteger('quantia');

        if (remetente.id === destinatario.id) {
            await interaction.editReply({ content: "❌ Você não pode transferir moedas para si mesmo!" });
            return;
        }
        if (destinatario.bot) {
            await interaction.editReply({ content: "❌ Você não pode transferir moedas para um bot!" });
            return;
        }

        const remetenteData = await getUserEconomyDataAsync(remetente.id, config.ECONOMY_FILE);

        if (remetenteData.carteira < quantia) {
            await interaction.editReply({ 
                content: `❌ Você não tem moedas suficientes! Seu saldo é de ${remetenteData.carteira.toLocaleString()} moedas.`
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
        
        // Enviando a mensagem pública
        const message = await interaction.channel.send({
            content: `${remetente.toString()}, ${destinatario.toString()}`,
            embeds: [embed],
            components: [row]
        });

        // Editando a resposta inicial (deferida) para confirmar ao usuário que a ação foi enviada
        await interaction.editReply({ content: 'Sua proposta de transferência foi enviada no canal!', ephemeral: true });

        pendingTransfers.set(transactionId, {
            remetenteId: remetente.id,
            remetenteName: remetente.displayName,
            destinatarioId: destinatario.id,
            destinatarioName: destinatario.displayName,
            quantia: quantia,
            accepted: new Set(),
            messageId: message.id,
            channelId: interaction.channel.id,
        });

        setTimeout(() => {
            const transfer = pendingTransfers.get(transactionId);
            if (transfer) {
                const expiredEmbed = new EmbedBuilder().setColor(0xED4245).setTitle("🚫 Transferência Expirada").setDescription(`A transferência de **${quantia.toLocaleString()}** moedas de ${remetente.toString()} para ${destinatario.toString()} não foi confirmada a tempo e expirou.`);
                const disabledButton = new ActionRowBuilder().addComponents(ButtonBuilder.from(row.components[0]).setDisabled(true).setLabel("Expirado"));
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
        await interaction.deferReply();
        const userData = await getUserEconomyDataAsync(interaction.user.id, config.ECONOMY_FILE);
        
        const embed = new EmbedBuilder()
            .setTitle(`📊 Status de Carteiras de ${interaction.user.displayName}`)
            .setColor(0x0099FF)
            .addFields(
                { name: "😇 Carteiras Devolvidas", value: `\`${userData.carteiras_devolvidas || 0}\``, inline: true },
                { name: "🏃 Carteiras Pegas", value: `\`${userData.carteiras_pegas || 0}\``, inline: true },
                { name: "\u200b", value: "\u200b", inline: false },
                { name: "💸 Ganhos Devolvendo", value: `\`${(userData.ganhos_devolvendo || 0).toLocaleString()}\` moedas`, inline: true },
                { name: "💰 Ganhos Pegando", value: `\`${(userData.ganhos_pegando || 0).toLocaleString()}\` moedas`, inline: true },
                { name: "🚓 Multas da Pawlice", value: `\`${(userData.perdas_policia || 0).toLocaleString()}\` moedas`, inline: true }
            );
        
        await interaction.editReply({ embeds: [embed] });
    }
};

const topcarteiraCommand = {
    data: new SlashCommandBuilder()
        .setName('topcarteira')
        .setDescription('Mostra o ranking de moedas do servidor.'),
    async execute(interaction) {
        await interaction.deferReply();
        const economia = await carregarDadosAsync(config.ECONOMY_FILE);
        
        if (!economia || Object.keys(economia).length === 0) {
            await interaction.editReply("Ainda não há ninguém no ranking de carteiras!");
            return;
        }
        
        const sortedWallets = Object.entries(economia)
            .sort((a, b) => (b[1].carteira || 0) - (a[1].carteira || 0))
            .filter(entry => !interaction.client.users.cache.get(entry[0])?.bot);
        
        const embed = new EmbedBuilder()
            .setTitle("💰 Ranking de Moedas Furradas")
            .setColor(0xFFD700);
        
        let description = "";
        const top10 = sortedWallets.slice(0, 10);

        for (let i = 0; i < top10.length; i++) {
            const [userId, data] = top10[i];
            try {
                const member = await interaction.guild.members.fetch(userId);
                description += `**#${i + 1}** ${member.displayName} - ${(data.carteira || 0).toLocaleString()} moedas\n`;
            } catch (error) { /* Ignora membros que saíram */ }
        }
        
        if (!description) {
            description = "Nenhum membro com moedas no ranking ainda.";
        }

        embed.setDescription(description);
        await interaction.editReply({ embeds: [embed] });
    }
};

const historicoCarteiraCommand = {
    data: new SlashCommandBuilder()
        .setName('historico_carteira')
        .setDescription('Mostra o histórico de transações da sua carteira.')
        .addUserOption(option =>
            option.setName('membro')
                .setDescription('Ver o histórico de outro membro (apenas para staff)')
                .setRequired(false)
        ),
    async execute(interaction) {
        // Deferir de forma efêmera pois a resposta final é efêmera
        await interaction.deferReply({ ephemeral: true });

        const targetUser = interaction.options.getUser('membro') || interaction.user;

        if (targetUser.id !== interaction.user.id && !interaction.member.roles.cache.has(config.STAFF_ROLE_ID)) {
            await interaction.editReply({ content: "❌ Você só pode ver o seu próprio histórico." });
            return;
        }

        const historicoData = await getUserDataAsync(HISTORICO_FILE, targetUser.id);
        const userTransactions = historicoData.transacoes || [];

        if (userTransactions.length === 0) {
            await interaction.editReply({ content: "Nenhuma transação encontrada no seu histórico." });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle(`📜 Histórico da Carteira de ${targetUser.displayName}`)
            .setColor(0x3498DB)
            .setDescription("Mostrando as últimas 15 transações.");

        const recentTransactions = userTransactions.slice(0, 15);

        for (const t of recentTransactions) {
            const timestamp = Math.floor(new Date(t.timestamp).getTime() / 1000);
            const emoji = t.quantia > 0 ? '🟢' : '🔴';
            const quantiaStr = `${t.quantia > 0 ? '+' : ''}${t.quantia.toLocaleString()}`;

            embed.addFields({ 
                name: `${emoji} ${quantiaStr} moedas | <t:${timestamp}:R>`, 
                value: t.descricao 
            });
        }
        
        await interaction.editReply({ embeds: [embed] });
    }
};

module.exports = { 
    pendingTransfers,
    carteiraCommand, 
    dailyCommand, 
    transferirCommand, 
    statusCarteiraCommand, 
    topcarteiraCommand,
    historicoCarteiraCommand 
};
