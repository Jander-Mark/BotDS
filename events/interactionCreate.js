const { Events } = require('discord.js');
const { LojaView, ItemSelect } = require('../views/LojaView');
const { CarteiraPerdidaView, CristalMisteriosoView } = require('../views/EventViews');
const PainelDeControle = require('../views/PainelDeControle');

// --- Mapas para gerenciar instâncias de views ---
// Isso garante que cada mensagem de evento tenha sua própria instância
// para controlar quem já interagiu, evitando que uma pessoa clique em múltiplos eventos.
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
            } 
            
            // --- Handlers de Menus de Seleção ---
            else if (interaction.isStringSelectMenu()) {
                if (interaction.customId.startsWith('shop_category_')) {
                    const category = interaction.customId.replace('shop_category_', '');
                    const itemKey = interaction.values[0];
                    const itemSelect = new ItemSelect(category);
                    await itemSelect.handleSelection(interaction, itemKey);
                }
            } 
            
            // --- Handlers de Botões ---
            else if (interaction.isButton()) {
                const lojaView = new LojaView();
                
                // --- Lógica da Loja ---
                if (interaction.customId === 'cat_funcoes_persist') {
                    await lojaView.handleFuncoes(interaction);
                } else if (interaction.customId === 'cat_cosmeticos_persist') {
                    await lojaView.handleCosmeticos(interaction);
                } else if (interaction.customId === 'cat_especiais_persist') {
                    await lojaView.handleEspeciais(interaction);
                }
                
                // --- Lógica do Painel de Controle de Membro ---
                else if (interaction.customId.startsWith('ban_') || interaction.customId.startsWith('kick_')) {
                    const userId = interaction.customId.split('_')[1];
                    const member = await interaction.guild.members.fetch(userId).catch(() => null);
                    if (member) {
                        const painel = new PainelDeControle(member);
                        if (interaction.customId.startsWith('ban_')) {
                            await painel.handleBan(interaction);
                        } else {
                            await painel.handleKick(interaction);
                        }
                    } else {
                        await interaction.reply({ content: "Membro não encontrado.", ephemeral: true });
                    }
                }

                // --- Lógica dos Eventos (Carteira e Cristal) ---
                // Para cada evento, criamos uma view única baseada no ID da mensagem
                const messageId = interaction.message.id;

                // --- Evento de Carteira Perdida ---
                if (interaction.customId.startsWith('pegar_carteira') || interaction.customId.startsWith('devolver_carteira')) {
                    if (!carteiraPerdidaViews.has(messageId)) {
                        carteiraPerdidaViews.set(messageId, new CarteiraPerdidaView());
                    }
                    const carteiraPerdidaView = carteiraPerdidaViews.get(messageId);
                    
                    // --- CORREÇÃO APLICADA AQUI ---
                    // Nomes das funções atualizados para `handlePegar` e `handleDevolver`
                    if (interaction.customId === carteiraPerdidaView.pegarId) {
                        await carteiraPerdidaView.handlePegar(interaction);
                    } else if (interaction.customId === carteiraPerdidaView.devolverId) {
                        await carteiraPerdidaView.handleDevolver(interaction);
                    }
                    
                    // Limpa a instância da view da memória após um tempo para não acumular lixo
                    setTimeout(() => carteiraPerdidaViews.delete(messageId), 200000); 
                }
                
                // --- Evento de Cristal Misterioso ---
                else if (interaction.customId.includes('_cristal_')) {
                    if (!cristalMisteriosoViews.has(messageId)) {
                        cristalMisteriosoViews.set(messageId, new CristalMisteriosoView());
                    }
                    const cristalMisteriosoView = cristalMisteriosoViews.get(messageId);

                    // --- CORREÇÃO APLICADA AQUI ---
                    // Nomes das funções atualizados para `handleLamber`, `handleColetar` e `handleVender`
                    if (interaction.customId === cristalMisteriosoView.lamberId) {
                        await cristalMisteriosoView.handleLamber(interaction);
                    } else if (interaction.customId === cristalMisteriosoView.coletarId) {
                        await cristalMisteriosoView.handleColetar(interaction);
                    } else if (interaction.customId === cristalMisteriosoView.venderId) {
                        await cristalMisteriosoView.handleVender(interaction);
                    }
                    
                    setTimeout(() => cristalMisteriosoViews.delete(messageId), 200000);
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
