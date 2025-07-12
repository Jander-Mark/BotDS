const { Events, ActionRowBuilder, ButtonBuilder, EmbedBuilder } = require('discord.js');
const { LojaView, ItemSelect } = require('../views/LojaView');
const { CarteiraPerdidaView, CristalMisteriosoView } = require('../views/EventViews');
const PainelDeControle = require('../views/PainelDeControle');
const { getUserEconomyDataAsync, updateUserDataAsync } = require('../dataHandler');
const config = require('../config');

// Importa o Map de transferências pendentes
const { pendingTransfers } = require('../commands/economyCommands');

const carteiraPerdidaViews = new Map();
const cristalMisteriosoViews = new Map();

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        try {
            // --- Handlers de Comandos ---
            if (interaction.isChatInputCommand()) {
                const command = interaction.client.commands.get(interaction.commandName);
                if (!command) {
                    console.error(`Nenhum comando correspondente a ${interaction.commandName} foi encontrado.`);
                    return;
                }
                await command.execute(interaction);
                return;
            } 
            
            // --- Handlers de Menus de Seleção ---
            if (interaction.isStringSelectMenu()) {
                if (interaction.customId.startsWith('shop_category_')) {
                    const category = interaction.customId.replace('shop_category_', '');
                    const itemKey = interaction.values[0];
                    const itemSelect = new ItemSelect(category);
                    await itemSelect.handleSelection(interaction, itemKey);
                }
                return;
            } 
            
            // --- Handlers de Botões ---
            if (interaction.isButton()) {
                const customId = interaction.customId;

                // --- Lógica da Loja ---
                if (customId.startsWith('cat_')) {
                    const lojaView = new LojaView();
                    if (customId === 'cat_funcoes_persist') await lojaView.handleFuncoes(interaction);
                    else if (customId === 'cat_cosmeticos_persist') await lojaView.handleCosmeticos(interaction);
                    else if (customId === 'cat_especiais_persist') await lojaView.handleEspeciais(interaction);
                    return;
                }

                // --- Lógica do Painel de Controle de Membro ---
                if (customId.startsWith('ban_') || customId.startsWith('kick_') || customId.startsWith('boas_vindas')) {
                    const userId = customId.split('_')[1];
                    const member = await interaction.guild.members.fetch(userId).catch(() => null);
                    if (member) {
                        const painel = new PainelDeControle(member);
                        if (customId.startsWith('ban_')) await painel.handleBanir(interaction);
                        else if (customId.startsWith('kick_')) await painel.handleExpulsar(interaction);
                        else await painel.handleBoasVindas(interaction);
                    } else {
                        await interaction.reply({ content: "Membro não encontrado.", ephemeral: true });
                    }
                    return;
                }

                // --- Lógica dos Eventos ---
                const messageId = interaction.message.id;

                // Carteira Perdida
                if (customId.startsWith('pegar_carteira') || customId.startsWith('devolver_carteira')) {
                    if (!carteiraPerdidaViews.has(messageId)) carteiraPerdidaViews.set(messageId, new CarteiraPerdidaView());
                    const view = carteiraPerdidaViews.get(messageId);
                    if (customId === view.pegarId) await view.handlePegar(interaction);
                    else if (customId === view.devolverId) await view.handleDevolver(interaction);
                    setTimeout(() => carteiraPerdidaViews.delete(messageId), 200000); 
                    return;
                }

                // Cristal Misterioso
                if (customId.includes('_cristal_')) {
                    if (!cristalMisteriosoViews.has(messageId)) cristalMisteriosoViews.set(messageId, new CristalMisteriosoView());
                    const view = cristalMisteriosoViews.get(messageId);
                    if (customId === view.lamberId) await view.handleLamber(interaction);
                    else if (customId === view.coletarId) await view.handleColetar(interaction);
                    else if (customId === view.venderId) await view.handleVender(interaction);
                    setTimeout(() => cristalMisteriosoViews.delete(messageId), 200000);
                    return;
                }

                // --- LÓGICA PARA CONFIRMAÇÃO DE TRANSFERÊNCIA ---
                if (customId.startsWith('accept_transfer_')) {
                    const transactionId = customId.replace('accept_transfer_', '');
                    const transfer = pendingTransfers.get(transactionId);

                    if (!transfer) {
                        await interaction.reply({ content: "Esta transferência não é mais válida ou já foi concluída.", ephemeral: true });
                        const disabledButton = ButtonBuilder.from(interaction.component).setDisabled(true).setLabel("Inválido");
                        await interaction.message.edit({ components: [new ActionRowBuilder().addComponents(disabledButton)] });
                        return;
                    }

                    const { remetenteId, destinatarioId, quantia, accepted } = transfer;

                    if (interaction.user.id !== remetenteId && interaction.user.id !== destinatarioId) {
                        await interaction.reply({ content: "Você não faz parte desta transação.", ephemeral: true });
                        return;
                    }
                    
                    if (accepted.has(interaction.user.id)) {
                        await interaction.reply({ content: "Você já aceitou esta transferência.", ephemeral: true });
                        return;
                    }

                    accepted.add(interaction.user.id);
                    await interaction.deferUpdate();

                    const newButton = new ActionRowBuilder().addComponents(
                        ButtonBuilder.from(interaction.component).setLabel(`Aceitar Transferência (${accepted.size}/2)`)
                    );

                    if (accepted.size === 2) {
                        const remetenteData = await getUserEconomyDataAsync(remetenteId, config.ECONOMY_FILE);
                        const destinatarioData = await getUserEconomyDataAsync(destinatarioId, config.ECONOMY_FILE);

                        if (remetenteData.carteira < quantia) {
                            const failedEmbed = new EmbedBuilder().setColor(0xED4245).setTitle("❌ Transferência Falhou").setDescription(`A transferência falhou porque <@${remetenteId}> não possui mais a quantia necessária.`);
                            await interaction.message.edit({ embeds: [failedEmbed], components: [new ActionRowBuilder().addComponents(ButtonBuilder.from(newButton.components[0]).setDisabled(true).setLabel("Falhou"))] });
                            pendingTransfers.delete(transactionId);
                            return;
                        }

                        remetenteData.carteira -= quantia;
                        destinatarioData.carteira += quantia;

                        await updateUserDataAsync(config.ECONOMY_FILE, remetenteId, { carteira: remetenteData.carteira });
                        await updateUserDataAsync(config.ECONOMY_FILE, destinatarioId, { carteira: destinatarioData.carteira });
                        
                        const successEmbed = new EmbedBuilder()
                            .setColor(0x57F287)
                            .setTitle("✅ Transferência Concluída!")
                            .setDescription(`**${quantia.toLocaleString()}** moedas furradas foram transferidas de <@${remetenteId}> para <@${destinatarioId}> com sucesso!`);
                        
                        await interaction.message.edit({ content: "", embeds: [successEmbed], components: [new ActionRowBuilder().addComponents(ButtonBuilder.from(newButton.components[0]).setDisabled(true).setLabel("Concluído"))] });
                        pendingTransfers.delete(transactionId);

                    } else {
                        await interaction.message.edit({ components: [newButton] });
                    }
                }
            }
        } catch (error) {
            console.error(`Erro ao processar interação:`, error);
            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({ content: 'Ocorreu um erro ao executar esta ação!', ephemeral: true });
            } else {
                await interaction.reply({ content: 'Ocorreu um erro ao executar esta ação!', ephemeral: true });
            }
        }
    },
};
