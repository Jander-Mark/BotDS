const admin = require("firebase-admin");

// Configuração do Firebase Admin SDK
let db = null;

function initializeFirebase() {
    try {
        // Verificar se já foi inicializado
        if (admin.apps.length === 0) {
            // Inicializar com credenciais do arquivo de serviço
            // Você deve colocar o arquivo de credenciais na pasta do projeto
            const serviceAccount = require("./firebase-service-account.json");
            
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
        
        db = admin.firestore();
        console.log("Firebase inicializado com sucesso!");
        return true;
    } catch (error) {
        console.error("Erro ao inicializar Firebase:", error);
        console.log("Continuando com armazenamento local JSON...");
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
        const increment = admin.firestore.FieldValue.increment(incrementValue);
        await getCollection(collectionName).doc(documentId).update({
            [field]: increment
        });
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
    // Exportar admin para casos especiais
    admin
};

