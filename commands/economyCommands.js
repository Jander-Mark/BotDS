const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { 
    carregarDados, 
    salvarDados, 
    getUserEconomyData,
    carregarDadosAsync,
    salvarDadosAsync,
    getUserEconomyDataAsync,
    setUserDataAsync,
    useFirebase
} = require('../dataHandler');
const config = require('../config');

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
        
        let userData;
        if (useFirebase()) {
            userData = await getUserEconomyDataAsync(targetUser.id, config.ECONOMY_FILE);
        } else {
            userData = getUserEconomyData(targetUser.id, config.ECONOMY_FILE);
        }
        
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
        const userIdStr = interaction.user.id.toString();
        const agora = new Date();
        
        let userData;
        if (useFirebase()) {
            userData = await getUserEconomyDataAsync(interaction.user.id, config.ECONOMY_FILE);
        } else {
            userData = getUserEconomyData(interaction.user.id, config.ECONOMY_FILE);
        }
        
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
        
        if (useFirebase()) {
            await setUserDataAsync(config.ECONOMY_FILE, interaction.user.id, userData);
        } else {
            const economia = carregarDados(config.ECONOMY_FILE);
            economia[userIdStr] = userData;
            salvarDados(config.ECONOMY_FILE, economia);
        }
        
        await interaction.reply("🎉 Você resgatou suas **2000** moedas furradas diárias! Volte em 24 horas.");
    }
};

const transferirCommand = {
    data: new SlashCommandBuilder()
        .setName('transferir')
        .setDescription('Transfere moedas furradas para outro membro.')
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
            await interaction.reply({ content: "Você não pode transferir moedas para si mesmo!", ephemeral: true });
            return;
        }

        let remetenteData, destinatarioData;
        
        if (useFirebase()) {
            remetenteData = await getUserEconomyDataAsync(remetente.id, config.ECONOMY_FILE);
            destinatarioData = await getUserEconomyDataAsync(destinatario.id, config.ECONOMY_FILE);
        } else {
            remetenteData = getUserEconomyData(remetente.id, config.ECONOMY_FILE);
            destinatarioData = getUserEconomyData(destinatario.id, config.ECONOMY_FILE);
        }

        if (remetenteData.carteira < quantia) {
            await interaction.reply({ 
                content: `Você não tem moedas suficientes! Seu saldo é de ${remetenteData.carteira.toLocaleString()} moedas.`, 
                ephemeral: true 
            });
            return;
        }

        remetenteData.carteira -= quantia;
        destinatarioData.carteira += quantia;
        
        if (useFirebase()) {
            await setUserDataAsync(config.ECONOMY_FILE, remetente.id, remetenteData);
            await setUserDataAsync(config.ECONOMY_FILE, destinatario.id, destinatarioData);
        } else {
            const economia = carregarDados(config.ECONOMY_FILE);
            economia[remetente.id.toString()] = remetenteData;
            economia[destinatario.id.toString()] = destinatarioData;
            salvarDados(config.ECONOMY_FILE, economia);
        }
        
        await interaction.reply({ 
            content: `✅ Você transferiu **${quantia.toLocaleString()}** moedas furradas para ${destinatario.toString()} com sucesso!`, 
            ephemeral: true 
        });
    }
};

const statusCarteiraCommand = {
    data: new SlashCommandBuilder()
        .setName('status_carteira')
        .setDescription('Mostra suas estatísticas do evento de carteira perdida.'),
    async execute(interaction) {
        let userData;
        if (useFirebase()) {
            userData = await getUserEconomyDataAsync(interaction.user.id, config.ECONOMY_FILE);
        } else {
            userData = getUserEconomyData(interaction.user.id, config.ECONOMY_FILE);
        }
        
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
        let economia;
        if (useFirebase()) {
            economia = await carregarDadosAsync(config.ECONOMY_FILE);
        } else {
            economia = carregarDados(config.ECONOMY_FILE);
        }
        
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
                const memberName = member.displayName;
                
                const rankEmoji = { 0: "🥇", 1: "🥈", 2: "🥉" }[i] || `**#${i + 1}**`;
                description += `${rankEmoji} **${memberName}** - ${(data.carteira || 0).toLocaleString()} moedas\n`;
            } catch (error) {
                const rankEmoji = { 0: "🥇", 1: "🥈", 2: "🥉" }[i] || `**#${i + 1}**`;
                description += `${rankEmoji} **ID: ${userId}** - ${(data.carteira || 0).toLocaleString()} moedas\n`;
            }
        }
        
        embed.setDescription(description);
        await interaction.reply({ embeds: [embed] });
    }
};

module.exports = { 
    carteiraCommand, 
    dailyCommand, 
    transferirCommand, 
    statusCarteiraCommand, 
    topcarteiraCommand 
};

