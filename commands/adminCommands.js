const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { 
    carregarDados, 
    salvarDados, 
    getUserEconomyData, 
    getUserXpData,
    getUserEconomyDataAsync,
    getUserXpDataAsync,
    setUserDataAsync,
    useFirebase
} = require('../dataHandler');
const config = require('../config');
const { LojaView } = require('../views/LojaView');
const { CarteiraPerdidaView, CristalMisteriosoView } = require('../views/EventViews');

// Comandos de Economia Admin
const economiaAdminGroup = {
    data: new SlashCommandBuilder()
        .setName('economia_admin')
        .setDescription('Comandos de administrador para gerenciar a economia')
        .addSubcommand(subcommand =>
            subcommand
                .setName('definir')
                .setDescription('Define o saldo de um membro para um valor específico')
                .addUserOption(option =>
                    option.setName('membro')
                        .setDescription('O membro a ter o saldo alterado')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('quantia')
                        .setDescription('A nova quantia de moedas')
                        .setRequired(true)
                        .setMinValue(0)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('adicionar')
                .setDescription('Adiciona moedas à carteira de um membro')
                .addUserOption(option =>
                    option.setName('membro')
                        .setDescription('O membro que receberá as moedas')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('quantia')
                        .setDescription('A quantia a ser adicionada')
                        .setRequired(true)
                        .setMinValue(1)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remover')
                .setDescription('Remove moedas da carteira de um membro')
                .addUserOption(option =>
                    option.setName('membro')
                        .setDescription('O membro que perderá as moedas')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('quantia')
                        .setDescription('A quantia a ser removida')
                        .setRequired(true)
                        .setMinValue(1)
                )
        ),
    async execute(interaction) {
        if (!interaction.member.roles.cache.has(config.BAN_COMMAND_ROLE_ID)) {
            await interaction.reply({ content: "Você não tem permissão para usar este comando.", ephemeral: true });
            return;
        }

        const subcommand = interaction.options.getSubcommand();
        const membro = interaction.options.getUser('membro');
        const quantia = interaction.options.getInteger('quantia');

        let userData;
        if (useFirebase()) {
            userData = await getUserEconomyDataAsync(membro.id, config.ECONOMY_FILE);
        } else {
            userData = getUserEconomyData(membro.id, config.ECONOMY_FILE);
        }

        switch (subcommand) {
            case 'definir':
                userData.carteira = quantia;
                if (useFirebase()) {
                    await setUserDataAsync(config.ECONOMY_FILE, membro.id, userData);
                } else {
                    const economia = carregarDados(config.ECONOMY_FILE);
                    economia[membro.id.toString()] = userData;
                    salvarDados(config.ECONOMY_FILE, economia);
                }
                await interaction.reply({ 
                    content: `✅ O saldo de ${membro.toString()} foi definido para **${quantia.toLocaleString()}** moedas furradas.`, 
                    ephemeral: true 
                });
                break;

            case 'adicionar':
                userData.carteira += quantia;
                if (useFirebase()) {
                    await setUserDataAsync(config.ECONOMY_FILE, membro.id, userData);
                } else {
                    const economia = carregarDados(config.ECONOMY_FILE);
                    economia[membro.id.toString()] = userData;
                    salvarDados(config.ECONOMY_FILE, economia);
                }
                await interaction.reply({ 
                    content: `✅ Foram adicionadas **${quantia.toLocaleString()}** moedas à carteira de ${membro.toString()}. Novo saldo: ${userData.carteira.toLocaleString()}`, 
                    ephemeral: true 
                });
                break;

            case 'remover':
                const saldoAntigo = userData.carteira;
                userData.carteira = Math.max(0, saldoAntigo - quantia);
                if (useFirebase()) {
                    await setUserDataAsync(config.ECONOMY_FILE, membro.id, userData);
                } else {
                    const economia = carregarDados(config.ECONOMY_FILE);
                    economia[membro.id.toString()] = userData;
                    salvarDados(config.ECONOMY_FILE, economia);
                }
                await interaction.reply({ 
                    content: `✅ Foram removidas **${quantia.toLocaleString()}** moedas da carteira de ${membro.toString()}. Novo saldo: ${userData.carteira.toLocaleString()}`, 
                    ephemeral: true 
                });
                break;
        }
    }
};

// Comandos de XP Admin
const xpAdminGroup = {
    data: new SlashCommandBuilder()
        .setName('xp_admin')
        .setDescription('Comandos de administrador para gerenciar o XP')
        .addSubcommand(subcommand =>
            subcommand
                .setName('adicionar')
                .setDescription('Adiciona XP a um membro')
                .addUserOption(option =>
                    option.setName('membro')
                        .setDescription('O membro que receberá o XP')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('quantia')
                        .setDescription('A quantia de XP a ser adicionada')
                        .setRequired(true)
                        .setMinValue(1)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remover')
                .setDescription('Remove XP de um membro')
                .addUserOption(option =>
                    option.setName('membro')
                        .setDescription('O membro que perderá o XP')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('quantia')
                        .setDescription('A quantia de XP a ser removida')
                        .setRequired(true)
                        .setMinValue(1)
                )
        ),
    async execute(interaction) {
        if (!interaction.member.roles.cache.has(config.BAN_COMMAND_ROLE_ID)) {
            await interaction.reply({ content: "Você não tem permissão para usar este comando.", ephemeral: true });
            return;
        }

        const subcommand = interaction.options.getSubcommand();
        const membro = interaction.options.getUser('membro');
        const quantia = interaction.options.getInteger('quantia');

        let userData;
        if (useFirebase()) {
            userData = await getUserXpDataAsync(membro.id, config.XP_FILE);
        } else {
            userData = getUserXpData(membro.id, config.XP_FILE);
        }

        switch (subcommand) {
            case 'adicionar':
                userData.xp += quantia;
                if (useFirebase()) {
                    await setUserDataAsync(config.XP_FILE, membro.id, userData);
                } else {
                    const xpData = carregarDados(config.XP_FILE);
                    xpData[membro.id.toString()] = userData;
                    salvarDados(config.XP_FILE, xpData);
                }
                await interaction.reply({ 
                    content: `✅ Foram adicionados **${quantia.toLocaleString()}** XP para ${membro.toString()}. XP total: ${userData.xp.toLocaleString()}`, 
                    ephemeral: true 
                });
                break;

            case 'remover':
                userData.xp = Math.max(0, userData.xp - quantia);
                if (useFirebase()) {
                    await setUserDataAsync(config.XP_FILE, membro.id, userData);
                } else {
                    const xpData = carregarDados(config.XP_FILE);
                    xpData[membro.id.toString()] = userData;
                    salvarDados(config.XP_FILE, xpData);
                }
                await interaction.reply({ 
                    content: `✅ Foram removidos **${quantia.toLocaleString()}** XP de ${membro.toString()}. XP total: ${userData.xp.toLocaleString()}`, 
                    ephemeral: true 
                });
                break;
        }
    }
};

// Comando para postar loja
const postarLojaCommand = {
    data: new SlashCommandBuilder()
        .setName('postar_loja')
        .setDescription('[Admin] Posta a mensagem da loja no canal atual.'),
    async execute(interaction) {
        if (!interaction.member.roles.cache.has(config.BAN_COMMAND_ROLE_ID)) {
            await interaction.reply({ content: "Você não tem permissão para usar este comando.", ephemeral: true });
            return;
        }

        // --- CORREÇÃO APLICADA AQUI ---
        // Aguarda a criação do embed, pois a função agora é assíncrona
        const embed = await LojaView.createShopEmbed();
        const lojaView = new LojaView();
        const row = lojaView.createActionRow();

        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: "✅ Mensagem da loja postada!", ephemeral: true });
    }
};

// Comando para dropar carteira
const droparCarteiraCommand = {
    data: new SlashCommandBuilder()
        .setName('dropar_carteira')
        .setDescription('[Admin] Inicia um evento de carteira perdida no canal.'),
    async execute(interaction) {
        if (!interaction.member.roles.cache.has(config.BAN_COMMAND_ROLE_ID)) {
            await interaction.reply({ content: "Você não tem permissão para usar este comando.", ephemeral: true });
            return;
        }

        const { EmbedBuilder } = require('discord.js');
        const embed = new EmbedBuilder()
            .setTitle("👜 Uma Carteira Perdida!")
            .setDescription("Oh não! Alguém deixou uma carteira cair aqui!\nO que você vai fazer?")
            .setColor(0xD3D3D3);

        const carteiraPerdidaView = new CarteiraPerdidaView();
        const row = carteiraPerdidaView.createActionRow();

        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: "Evento de carteira perdida iniciado!", ephemeral: true });
    }
};

// Comando para dropar cristal
const droparCristalCommand = {
    data: new SlashCommandBuilder()
        .setName('dropar_cristal')
        .setDescription('[Admin] Inicia um evento de cristal misterioso.'),
    async execute(interaction) {
        if (!interaction.member.roles.cache.has(config.BAN_COMMAND_ROLE_ID)) {
            await interaction.reply({ content: "Você não tem permissão para usar este comando.", ephemeral: true });
            return;
        }

        const { EmbedBuilder } = require('discord.js');
        const embed = new EmbedBuilder()
            .setTitle("🔮 O que é isso?")
            .setDescription("Um cristal brilhante misterioso surgiu, sua energia o atrai em direção a ele, o que você deseja fazer?")
            .setColor(0xAB8FE9);

        const cristalMisteriosoView = new CristalMisteriosoView();
        const row = cristalMisteriosoView.createActionRow();

        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: "Evento de cristal iniciado!", ephemeral: true });
    }
};

module.exports = { 
    economiaAdminGroup, 
    xpAdminGroup, 
    postarLojaCommand, 
    droparCarteiraCommand, 
    droparCristalCommand 
};
