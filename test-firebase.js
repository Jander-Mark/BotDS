const { initializeDataHandler, useFirebase, getUserEconomyDataAsync, setUserDataAsync, carregarDadosAsync } = require('./dataHandler');
const config = require('./config');

// Script para testar a integração do Firebase

async function testFirebaseIntegration() {
    console.log('🧪 Iniciando testes de integração do Firebase...\n');
    
    // Inicializar sistema de dados
    const firebaseInitialized = initializeDataHandler();
    
    if (!firebaseInitialized) {
        console.log('⚠️ Firebase não configurado. Testando com JSON local...');
    } else {
        console.log('✅ Firebase inicializado com sucesso!');
    }
    
    console.log(`📊 Modo de armazenamento: ${useFirebase() ? 'Firebase' : 'JSON Local'}\n`);
    
    // Executar testes
    await testUserEconomyData();
    await testUserXpData();
    await testShopData();
    await testBulkOperations();
    
    console.log('\n🎉 Testes concluídos!');
}

async function testUserEconomyData() {
    console.log('💰 Testando dados de economia...');
    
    const testUserId = '123456789012345678'; // ID de teste
    
    try {
        // Teste 1: Obter dados de usuário (deve criar se não existir)
        console.log('  📝 Teste 1: Obtendo dados de usuário...');
        const userData = await getUserEconomyDataAsync(testUserId, config.ECONOMY_FILE);
        console.log('  ✅ Dados obtidos:', userData);
        
        // Teste 2: Atualizar dados
        console.log('  📝 Teste 2: Atualizando dados...');
        userData.carteira = 5000;
        userData.carteiras_devolvidas = 10;
        await setUserDataAsync(config.ECONOMY_FILE, testUserId, userData);
        console.log('  ✅ Dados atualizados com sucesso!');
        
        // Teste 3: Verificar se os dados foram salvos
        console.log('  📝 Teste 3: Verificando dados salvos...');
        const updatedData = await getUserEconomyDataAsync(testUserId, config.ECONOMY_FILE);
        if (updatedData.carteira === 5000 && updatedData.carteiras_devolvidas === 10) {
            console.log('  ✅ Dados verificados com sucesso!');
        } else {
            console.log('  ❌ Erro: Dados não foram salvos corretamente');
        }
        
    } catch (error) {
        console.log('  ❌ Erro nos testes de economia:', error.message);
    }
    
    console.log('');
}

async function testUserXpData() {
    console.log('⭐ Testando dados de XP...');
    
    const testUserId = '123456789012345678'; // ID de teste
    
    try {
        // Teste 1: Obter dados de XP
        console.log('  📝 Teste 1: Obtendo dados de XP...');
        const { getUserXpDataAsync } = require('./dataHandler');
        const xpData = await getUserXpDataAsync(testUserId, config.XP_FILE);
        console.log('  ✅ Dados de XP obtidos:', xpData);
        
        // Teste 2: Atualizar XP
        console.log('  📝 Teste 2: Atualizando XP...');
        xpData.xp = 15000;
        xpData.level = 25;
        await setUserDataAsync(config.XP_FILE, testUserId, xpData);
        console.log('  ✅ Dados de XP atualizados!');
        
        // Teste 3: Verificar dados
        console.log('  📝 Teste 3: Verificando dados de XP...');
        const updatedXpData = await getUserXpDataAsync(testUserId, config.XP_FILE);
        if (updatedXpData.xp === 15000 && updatedXpData.level === 25) {
            console.log('  ✅ Dados de XP verificados com sucesso!');
        } else {
            console.log('  ❌ Erro: Dados de XP não foram salvos corretamente');
        }
        
    } catch (error) {
        console.log('  ❌ Erro nos testes de XP:', error.message);
    }
    
    console.log('');
}

async function testShopData() {
    console.log('🛍️ Testando dados da loja...');
    
    try {
        // Teste 1: Obter dados da loja
        console.log('  📝 Teste 1: Obtendo dados da loja...');
        const { getUserDataAsync } = require('./dataHandler');
        let shopData = await getUserDataAsync(config.SHOP_DATA_FILE, 'moon_data');
        
        if (!shopData || Object.keys(shopData).length === 0) {
            shopData = {
                moon_price: 400000,
                moon_owner_id: null
            };
        }
        
        console.log('  ✅ Dados da loja obtidos:', shopData);
        
        // Teste 2: Atualizar dados da loja
        console.log('  📝 Teste 2: Atualizando dados da loja...');
        shopData.moon_price = 800000;
        shopData.moon_owner_id = '123456789012345678';
        await setUserDataAsync(config.SHOP_DATA_FILE, 'moon_data', shopData);
        console.log('  ✅ Dados da loja atualizados!');
        
        // Teste 3: Verificar dados da loja
        console.log('  📝 Teste 3: Verificando dados da loja...');
        const updatedShopData = await getUserDataAsync(config.SHOP_DATA_FILE, 'moon_data');
        if (updatedShopData.moon_price === 800000) {
            console.log('  ✅ Dados da loja verificados com sucesso!');
        } else {
            console.log('  ❌ Erro: Dados da loja não foram salvos corretamente');
        }
        
    } catch (error) {
        console.log('  ❌ Erro nos testes da loja:', error.message);
    }
    
    console.log('');
}

async function testBulkOperations() {
    console.log('📊 Testando operações em lote...');
    
    try {
        // Teste 1: Carregar todos os dados de economia
        console.log('  📝 Teste 1: Carregando todos os dados de economia...');
        const economiaData = await carregarDadosAsync(config.ECONOMY_FILE);
        console.log(`  ✅ ${Object.keys(economiaData).length} registros de economia carregados`);
        
        // Teste 2: Carregar todos os dados de XP
        console.log('  📝 Teste 2: Carregando todos os dados de XP...');
        const xpData = await carregarDadosAsync(config.XP_FILE);
        console.log(`  ✅ ${Object.keys(xpData).length} registros de XP carregados`);
        
        // Teste 3: Performance
        console.log('  📝 Teste 3: Testando performance...');
        const startTime = Date.now();
        
        for (let i = 0; i < 5; i++) {
            const testId = `test_user_${i}`;
            const userData = await getUserEconomyDataAsync(testId, config.ECONOMY_FILE);
            userData.carteira = Math.floor(Math.random() * 10000);
            await setUserDataAsync(config.ECONOMY_FILE, testId, userData);
        }
        
        const endTime = Date.now();
        console.log(`  ✅ 5 operações completadas em ${endTime - startTime}ms`);
        
    } catch (error) {
        console.log('  ❌ Erro nos testes em lote:', error.message);
    }
    
    console.log('');
}

async function testErrorHandling() {
    console.log('🚨 Testando tratamento de erros...');
    
    try {
        // Teste com ID inválido
        console.log('  📝 Teste 1: Testando com dados inválidos...');
        const invalidData = await getUserEconomyDataAsync('', config.ECONOMY_FILE);
        console.log('  ✅ Tratamento de erro funcionando:', invalidData);
        
    } catch (error) {
        console.log('  ✅ Erro capturado corretamente:', error.message);
    }
    
    console.log('');
}

async function cleanupTestData() {
    console.log('🧹 Limpando dados de teste...');
    
    try {
        const testUserIds = ['123456789012345678', 'test_user_0', 'test_user_1', 'test_user_2', 'test_user_3', 'test_user_4'];
        
        if (useFirebase()) {
            const { deleteDocument, getCollectionName } = require('./dataHandler');
            const firebaseHandler = require('./firebaseHandler');
            
            for (const userId of testUserIds) {
                try {
                    await firebaseHandler.deleteDocument(getCollectionName(config.ECONOMY_FILE), userId);
                    await firebaseHandler.deleteDocument(getCollectionName(config.XP_FILE), userId);
                } catch (error) {
                    // Ignorar erros de documentos que não existem
                }
            }
            
            // Resetar dados da loja
            await firebaseHandler.setDocument(getCollectionName(config.SHOP_DATA_FILE), 'moon_data', {
                moon_price: 400000,
                moon_owner_id: null
            });
            
        } else {
            // Para JSON local, apenas remover os IDs de teste
            const { carregarDados, salvarDados } = require('./dataHandler');
            
            const economia = carregarDados(config.ECONOMY_FILE);
            const xpData = carregarDados(config.XP_FILE);
            
            testUserIds.forEach(id => {
                delete economia[id];
                delete xpData[id];
            });
            
            salvarDados(config.ECONOMY_FILE, economia);
            salvarDados(config.XP_FILE, xpData);
        }
        
        console.log('  ✅ Dados de teste removidos com sucesso!');
        
    } catch (error) {
        console.log('  ⚠️ Erro ao limpar dados de teste:', error.message);
    }
    
    console.log('');
}

// Executar testes
if (require.main === module) {
    testFirebaseIntegration()
        .then(() => cleanupTestData())
        .then(() => {
            console.log('🎯 Todos os testes concluídos!');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Erro durante os testes:', error);
            process.exit(1);
        });
}

module.exports = {
    testFirebaseIntegration,
    testUserEconomyData,
    testUserXpData,
    testShopData,
    testBulkOperations,
    cleanupTestData
};

