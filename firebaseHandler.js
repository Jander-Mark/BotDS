const admin = require("firebase-admin");
const fs = require('fs');
const path = require('path');

// Configuração do Firebase Admin SDK
let db = null;

function initializeFirebase() {
    // --- PASSO 1: Diagnóstico de Caminho ---
    // Cria o caminho absoluto para o arquivo de chave. Isso nos mostra exatamente onde o Node.js está procurando.
    const keyPath = path.resolve(__dirname, 'firebase-service-account.json');
    console.log(`[DEBUG] Procurando pela chave do Firebase em: ${keyPath}`);

    // --- PASSO 2: Diagnóstico de Existência do Arquivo ---
    // Verifica se o arquivo existe no caminho esperado ANTES de tentar carregá-lo.
    if (!fs.existsSync(keyPath)) {
        console.error(`\n[ERRO CRÍTICO] O arquivo 'firebase-service-account.json' NÃO foi encontrado no caminho acima.`);
        console.log("--> SOLUÇÃO: Verifique se o nome do arquivo está EXATAMENTE correto (tudo minúsculo) e se ele está na pasta principal do seu bot.\n");
        console.log("Continuando com armazenamento local JSON...\n");
        return false;
    }

    console.log(`[DEBUG] Arquivo de chave encontrado! Tentando inicializar a conexão com o Firebase...`);

    // --- PASSO 3: Tentativa de Inicialização ---
    try {
        const serviceAccount = require(keyPath);
        
        // Evita reinicializar o app se ele já estiver ativo
        if (admin.apps.length === 0) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
        
        db = admin.firestore();
        console.log("\n✅ Firebase inicializado com sucesso! O bot está conectado ao banco de dados online.\n");
        return true;

    } catch (error) {
        console.error("\n❌ Erro ao inicializar Firebase!", error);
        console.log("--> CAUSA PROVÁVEL: O arquivo de chave foi encontrado, mas seu conteúdo está corrompido, incompleto ou inválido.");
        console.log("--> SOLUÇÃO: Tente gerar uma nova chave privada no site do Firebase e substitua o arquivo.\n");
        console.log("Continuando com armazenamento local JSON...\n");
        return false;
    }
}

// Função para obter referência de coleção
function getCollection(collectionName) {
    if (!db) {
        throw new Error("Firebase não foi inicializado");
    }
    return db.collection(collectionName);
}

// Função para obter um documento
async function getDocument(collectionName, documentId) {
    try {
        const doc = await getCollection(collectionName).doc(documentId).get();
        if (doc.exists) {
            return { id: doc.id, ...doc.data() };
        }
        return null;
    } catch (error) {
        console.error(`Erro ao obter documento ${documentId} da coleção ${collectionName}:`, error);
        throw error;
    }
}

// Função para definir um documento
async function setDocument(collectionName, documentId, data) {
    try {
        await getCollection(collectionName).doc(documentId).set(data, { merge: true });
        return true;
    } catch (error) {
        console.error(`Erro ao definir documento ${documentId} na coleção ${collectionName}:`, error);
        throw error;
    }
}

// Função para atualizar um documento
async function updateDocument(collectionName, documentId, data) {
    try {
        await getCollection(collectionName).doc(documentId).update(data);
        return true;
    } catch (error) {
        console.error(`Erro ao atualizar documento ${documentId} na coleção ${collectionName}:`, error);
        throw error;
    }
}

// Função para deletar um documento
async function deleteDocument(collectionName, documentId) {
    try {
        await getCollection(collectionName).doc(documentId).delete();
        return true;
    } catch (error) {
        console.error(`Erro ao deletar documento ${documentId} da coleção ${collectionName}:`, error);
        throw error;
    }
}

// Função para obter todos os documentos de uma coleção
async function getAllDocuments(collectionName) {
    try {
        const snapshot = await getCollection(collectionName).get();
        const documents = {};
        snapshot.forEach(doc => {
            documents[doc.id] = doc.data();
        });
        return documents;
    } catch (error) {
        console.error(`Erro ao obter todos os documentos da coleção ${collectionName}:`, error);
        throw error;
    }
}

// Função para obter documentos com query
async function queryDocuments(collectionName, field, operator, value) {
    try {
        const snapshot = await getCollection(collectionName).where(field, operator, value).get();
        const documents = {};
        snapshot.forEach(doc => {
            documents[doc.id] = doc.data();
        });
        return documents;
    } catch (error) {
        console.error(`Erro ao fazer query na coleção ${collectionName}:`, error);
        throw error;
    }
}

// Função para incrementar um campo numérico
async function incrementField(collectionName, documentId, field, incrementValue = 1) {
    try {
        const docRef = getCollection(collectionName).doc(documentId);
        const increment = admin.firestore.FieldValue.increment(incrementValue);
        
        await docRef.set({
            [field]: increment
        }, { merge: true });
        return true;
    } catch (error) {
        console.error(`Erro ao incrementar campo ${field} do documento ${documentId}:`, error);
        throw error;
    }
}

// Função para usar transação
async function runTransaction(updateFunction) {
    try {
        return await db.runTransaction(updateFunction);
    } catch (error) {
        console.error("Erro ao executar transação:", error);
        throw error;
    }
}

// Função para usar batch
function createBatch() {
    return db.batch();
}

async function commitBatch(batch) {
    try {
        await batch.commit();
        return true;
    } catch (error) {
        console.error("Erro ao executar batch:", error);
        throw error;
    }
}

module.exports = {
    initializeFirebase,
    getDocument,
    setDocument,
    updateDocument,
    deleteDocument,
    getAllDocuments,
    queryDocuments,
    incrementField,
    runTransaction,
    createBatch,
    commitBatch,
    getCollection,
    admin,
    FieldValue: admin.firestore.FieldValue
};
