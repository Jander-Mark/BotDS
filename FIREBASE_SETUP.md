# 🔥 Guia de Configuração do Firebase

Este guia irá te ajudar a configurar o Firebase Firestore para o seu bot Discord, permitindo armazenamento em nuvem dos dados dos usuários.

## 📋 Pré-requisitos

- Conta Google
- Projeto Discord Bot já configurado
- Node.js instalado

## 🚀 Passo a Passo

### 1. Criar Projeto Firebase

1. Acesse o [Console do Firebase](https://console.firebase.google.com/)
2. Clique em "Adicionar projeto"
3. Digite um nome para o projeto (ex: `meu-discord-bot`)
4. Desabilite o Google Analytics (opcional)
5. Clique em "Criar projeto"

### 2. Configurar Firestore Database

1. No painel do projeto, clique em "Firestore Database"
2. Clique em "Criar banco de dados"
3. Escolha "Iniciar no modo de teste" (por enquanto)
4. Selecione uma localização próxima (ex: `southamerica-east1`)
5. Clique em "Concluído"

### 3. Configurar Regras de Segurança

1. Na aba "Regras" do Firestore, substitua o conteúdo por:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Bloquear acesso público - apenas o bot pode acessar
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

2. Clique em "Publicar"

### 4. Criar Conta de Serviço

1. Vá para "Configurações do projeto" (ícone de engrenagem)
2. Clique na aba "Contas de serviço"
3. Clique em "Gerar nova chave privada"
4. Confirme clicando em "Gerar chave"
5. Um arquivo JSON será baixado automaticamente

### 5. Configurar o Bot

1. Renomeie o arquivo baixado para `firebase-service-account.json`
2. Mova o arquivo para a pasta raiz do seu bot
3. Abra o arquivo `firebaseHandler.js`
4. Substitua a URL do banco na linha 12:
   ```javascript
   credential: admin.credential.cert(serviceAccount)
   ```

   A `databaseURL` não é necessária para o Firestore ao usar o Admin SDK, pois a conexão é feita diretamente com o Firestore.

### 6. Testar a Configuração

Execute o script de teste:

```bash
node test-firebase.js
```

Se tudo estiver configurado corretamente, você verá:
```
✅ Firebase inicializado com sucesso!
📊 Modo de armazenamento: Firebase
```

## 🔄 Migrar Dados Existentes

Se você já tem dados em arquivos JSON, migre-os para o Firebase:

```bash
node migrate-to-firebase.js migrate
```

## 📊 Estrutura do Banco de Dados

O bot criará automaticamente as seguintes coleções:

### `economia`
Armazena dados financeiros dos usuários:
```json
{
  "userId": {
    "carteira": 5000,
    "ultimo_daily": "2024-01-15T10:30:00.000Z",
    "carteiras_devolvidas": 10,
    "ganhos_devolvendo": 2500,
    "ganhos_pegando": 1000,
    "perdas_policia": 500,
    "carteiras_pegas": 5
  }
}
```

### `xp_data`
Armazena dados de experiência dos usuários:
```json
{
  "userId": {
    "xp": 15000,
    "level": 25,
    "last_message_timestamp": 1705312200
  }
}
```

### `contagem_entradas`
Armazena contador de entradas no servidor:
```json
{
  "userId": {
    "count": 3
  }
}
```

### `shop_data`
Armazena dados especiais da loja:
```json
{
  "moon_data": {
    "moon_price": 800000,
    "moon_owner_id": "123456789012345678"
  }
}
```

## 🔒 Segurança

### Proteger Credenciais

1. **NUNCA** compartilhe o arquivo `firebase-service-account.json`
2. Adicione ao `.gitignore`:
   ```
   firebase-service-account.json
   *.backup.*
   ```

### Variáveis de Ambiente (Opcional)

Para maior segurança, você pode usar variáveis de ambiente:

1. Instale o dotenv:
   ```bash
   npm install dotenv
   ```

2. Crie um arquivo `.env`:
   ```
   FIREBASE_PROJECT_ID=seu-projeto-id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@seu-projeto.iam.gserviceaccount.com
   ```

3. Modifique o `firebaseHandler.js` para usar as variáveis.

## 🛠️ Comandos Úteis

### Fazer Backup
```bash
node migrate-to-firebase.js backup
```

### Ver Status
```bash
node test-firebase.js
```

### Migrar Dados
```bash
node migrate-to-firebase.js migrate
```

## 🐛 Solução de Problemas

### Erro: "Cannot find module './firebase-service-account.json'"
- Verifique se o arquivo está na pasta raiz do projeto
- Confirme se o nome está correto (exatamente `firebase-service-account.json`)

### Erro: "Permission denied"
- Verifique as regras de segurança do Firestore
- Confirme se a conta de serviço tem as permissões corretas

### Erro: "Invalid project ID"
- Verifique se a URL do banco está correta no `firebaseHandler.js`
- Confirme se o projeto existe no Console do Firebase

### Bot funciona mas não salva dados
- Execute `node test-firebase.js` para verificar a conexão
- Verifique os logs do console para erros específicos
- O bot funcionará com JSON local se o Firebase falhar

## 📈 Monitoramento

### Console do Firebase
- Acesse o Console do Firebase
- Vá para "Firestore Database"
- Você pode ver todos os dados em tempo real

### Logs do Bot
O bot mostra no console qual modo está usando:
```
✅ Firebase inicializado com sucesso!
Sistema de dados: Firebase
```

## 🔄 Fallback Automático

O bot tem um sistema de fallback automático:
- Se o Firebase falhar, usa JSON local
- Não há perda de funcionalidade
- Logs indicam qual sistema está sendo usado

## 💡 Dicas

1. **Teste primeiro localmente** antes de migrar dados importantes
2. **Faça backups regulares** usando o script de backup
3. **Monitore o uso** no Console do Firebase para evitar custos
4. **Use regras de segurança restritivas** para proteger os dados
5. **Mantenha as credenciais seguras** e nunca as compartilhe

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs do console
2. Execute o script de teste
3. Consulte a documentação do Firebase
4. Teste com JSON local primeiro

## 🎯 Próximos Passos

Após configurar o Firebase:
1. Teste todos os comandos do bot
2. Migre os dados existentes
3. Configure backups automáticos
4. Monitore o desempenho
5. Ajuste as regras de segurança conforme necessário

