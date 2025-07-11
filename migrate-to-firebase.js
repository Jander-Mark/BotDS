const fs = require('fs');
const firebaseHandler = require('./firebaseHandler');
const config = require('./config');

// Script para migrar dados JSON existentes para o Firebase

async function migrateData() {
    console.log('🚀 Iniciando migração de dados para Firebase...');
    
    // Inicializar Firebase
    const firebaseInitialized = firebaseHandler.initializeFirebase();
    if (!firebaseInitialized) {
        console.error('❌ Erro: Firebase não foi inicializado. Verifique as credenciais.');
        return;
    }

    const filesToMigrate = [
        { file: config.ECONOMY_FILE, collection: 'economia' },
        { file: config.XP_FILE, collection: 'xp_data' },
        { file: config.ENTRY_COUNT_FILE, collection: 'contagem_entradas' },
        { file: config.SHOP_DATA_FILE, collection: 'shop_data' }
    ];

    for (const { file, collection } of filesToMigrate) {
        await migrateFile(file, collection);
    }

    console.log('✅ Migração concluída!');
}

async function migrateFile(fileName, collectionName) {
    console.log(`\n📁 Migrando ${fileName} para coleção ${collectionName}...`);
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(fileName)) {
        console.log(`⚠️ Arquivo ${fileName} não encontrado. Pulando...`);
        return;
    }

    try {
        // Carregar dados do arquivo JSON
        const jsonData = JSON.parse(fs.readFileSync(fileName, 'utf8'));
        
        if (Object.keys(jsonData).length === 0) {
            console.log(`⚠️ Arquivo ${fileName} está vazio. Pulando...`);
            return;
        }

        // Migrar dados especiais da loja
        if (collectionName === 'shop_data') {
            await migrateShopData(jsonData, collectionName);
            return;
        }

        // Migrar dados de usuários
        const batch = firebaseHandler.createBatch();
        let count = 0;

        for (const [userId, userData] of Object.entries(jsonData)) {
            // Para contagem de entradas, converter formato
            if (collectionName === 'contagem_entradas') {
                const docRef = firebaseHandler.getCollection(collectionName).doc(userId);
                batch.set(docRef, { count: userData }, { merge: true });
            } else {
                const docRef = firebaseHandler.getCollection(collectionName).doc(userId);
                batch.set(docRef, userData, { merge: true });
            }
            count++;

            // Executar batch a cada 500 documentos (limite do Firestore)
            if (count % 500 === 0) {
                await firebaseHandler.commitBatch(batch);
                console.log(`   📊 Migrados ${count} registros...`);
                batch = firebaseHandler.createBatch();
            }
        }

        // Executar batch final
        if (count % 500 !== 0) {
            await firebaseHandler.commitBatch(batch);
        }

        console.log(`✅ ${fileName}: ${count} registros migrados com sucesso!`);

        // Criar backup do arquivo original
        const backupName = `${fileName}.backup.${Date.now()}`;
        fs.copyFileSync(fileName, backupName);
        console.log(`💾 Backup criado: ${backupName}`);

    } catch (error) {
        console.error(`❌ Erro ao migrar ${fileName}:`, error);
    }
}

async function migrateShopData(shopData, collectionName) {
    try {
        // Dados da loja são armazenados como um documento especial
        await firebaseHandler.setDocument(collectionName, 'moon_data', shopData);
        console.log(`✅ Dados da loja migrados com sucesso!`);
    } catch (error) {
        console.error(`❌ Erro ao migrar dados da loja:`, error);
    }
}

// Função para fazer backup dos dados do Firebase para JSON
async function backupFromFirebase() {
    console.log('📥 Fazendo backup dos dados do Firebase...');
    
    const firebaseInitialized = firebaseHandler.initializeFirebase();
    if (!firebaseInitialized) {
        console.error('❌ Erro: Firebase não foi inicializado.');
        return;
    }

    const collections = ['economia', 'xp_data', 'contagem_entradas', 'shop_data'];
    
    for (const collectionName of collections) {
        try {
            const data = await firebaseHandler.getAllDocuments(collectionName);
            const fileName = `backup_${collectionName}_${Date.now()}.json`;
            
            fs.writeFileSync(fileName, JSON.stringify(data, null, 4));
            console.log(`✅ Backup criado: ${fileName}`);
        } catch (error) {
            console.error(`❌ Erro ao fazer backup de ${collectionName}:`, error);
        }
    }
}

// Função para limpar dados do Firebase (use com cuidado!)
async function clearFirebaseData() {
    console.log('⚠️ ATENÇÃO: Esta operação irá DELETAR todos os dados do Firebase!');
    console.log('Esta operação não pode ser desfeita.');
    
    // Descomente as linhas abaixo apenas se tiver certeza
    /*
    const collections = ['economia', 'xp_data', 'contagem_entradas', 'shop_data'];
    
    for (const collectionName of collections) {
        try {
            const snapshot = await firebaseHandler.getCollection(collectionName).get();
            const batch = firebaseHandler.createBatch();
            
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await firebaseHandler.commitBatch(batch);
            console.log(`🗑️ Coleção ${collectionName} limpa.`);
        } catch (error) {
            console.error(`❌ Erro ao limpar ${collectionName}:`, error);
        }
    }
    */
    
    console.log('⚠️ Operação de limpeza desabilitada por segurança.');
    console.log('Descomente o código no arquivo migrate-to-firebase.js se necessário.');
}

// Verificar argumentos da linha de comando
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
    case 'migrate':
        migrateData();
        break;
    case 'backup':
        backupFromFirebase();
        break;
    case 'clear':
        clearFirebaseData();
        break;
    default:
        console.log('📋 Comandos disponíveis:');
        console.log('  node migrate-to-firebase.js migrate  - Migrar dados JSON para Firebase');
        console.log('  node migrate-to-firebase.js backup   - Fazer backup do Firebase para JSON');
        console.log('  node migrate-to-firebase.js clear    - Limpar dados do Firebase (cuidado!)');
        break;
}

