const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { 
    carregarDados, 
    salvarDados, 
    getUserEconomyData, 
    getUserXpData,
    getUserEconomyDataAsync,
    getUserXpDataAsync,
    setUserDataAsync,
    useFirebase,
    updateUserLevel // <--- IMPORTAÇÃO DA FUNÇÃO ATUALIZADA
} = require('../dataHandler');
const config = require('../config');
const { LojaView } = require('../views/LojaView');
const { CarteiraPerdidaView, CristalMisteriosoView } = require('../views/EventViews');

// Comandos de Economia Admin (sem alterações)
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

        let userData = await getUserEconomyDataAsync(membro.id, config.ECONOMY_FILE);

        switch (subcommand) {
            case 'definir':
                userData.carteira = quantia;
                break;
            case 'adicionar':
                userData.carteira += quantia;
                break;
            case 'remover':
                userData.carteira = Math.max(0, userData.carteira - quantia);
                break;
        }

        if (useFirebase()) {
            await setUserDataAsync(config.ECONOMY_FILE, membro.id, userData);
        } else {
            const economia = carregarDados(config.ECONOMY_FILE);
            economia[membro.id.toString()] = userData;
            salvarDados(config.ECONOMY_FILE, economia);
        }
        
        await interaction.reply({ 
            content: `✅ A carteira de ${membro.toString()} foi atualizada para **${userData.carteira.toLocaleString()}** moedas.`, 
            ephemeral: true 
        });
    }
};

// Comandos de XP Admin (COM ALTERAÇÕES)
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

        let userData = await getUserXpDataAsync(membro.id, config.XP_FILE);

        if (subcommand === 'adicionar') {
            userData.xp += quantia;
        } else if (subcommand === 'remover') {
            userData.xp = Math.max(0, userData.xp - quantia);
        }

        // Recalcula o nível do usuário com base no novo total de XP
        userData = updateUserLevel(userData);

        if (useFirebase()) {
            await setUserDataAsync(config.XP_FILE, membro.id, userData);
        } else {
            const xpData = carregarDados(config.XP_FILE);
            xpData[membro.id.toString()] = userData;
            salvarDados(config.XP_FILE, xpData);
        }
        
        await interaction.reply({ 
            content: `✅ O XP de ${membro.toString()} foi atualizado. XP Total: **${userData.xp.toLocaleString()}**, Nível Atual: **${userData.level}**.`,
            ephemeral: true 
        });
    }
};

// Comando para postar loja (código da resposta anterior)
const postarLojaCommand = {
    data: new SlashCommandBuilder()
        .setName('postar_loja')
        .setDescription('[Admin] Posta a mensagem da loja no canal atual.'),
    async execute(interaction) {
        if (!interaction.member.roles.cache.has(config.BAN_COMMAND_ROLE_ID)) {
            await interaction.reply({ content: "Você não tem permissão para usar este comando.", ephemeral: true });
            return;
        }

        const embed = await LojaView.createShopEmbed();
        const lojaView = new LojaView();
        const row = lojaView.createActionRow();

        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: "✅ Mensagem da loja postada!", ephemeral: true });
    }
};

// Comando para dropar carteira (sem alterações)
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

// Comando para dropar cristal (sem alterações)
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
