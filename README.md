**Checkout com Mercado Pago (Transparente)**

**Introdução**
- **Descrição**: Projeto de checkout com pagamento por cartão de crédito usando a API do Mercado Pago (modo Transparente). Frontend em React (Vite), backend com AWS Lambda (Python) e infraestrutura gerenciada por Terraform.
- **Objetivo**: Fornecer uma integração segura e transparente onde a coleta dos dados sensíveis fica no backend (tokenização) e o frontend consome apenas o necessário (public key).

**Stack**
- **Frontend**: React + Vite (pasta lojas-omena)
- **Backend**: AWS Lambda (Python) — funções em `backend/lambda-functions`
- **Infra**: Terraform em `backend/terraform` para provisionar recursos AWS
- **Pagamento**: Mercado Pago API (modo Transparente)

**Requisitos**
- **Geral**: Conta Mercado Pago (credenciais), conta AWS com permissões para criar Lambda/IAM/S3 (ou o que o Terraform definir).
- **Windows**: Node.js (>=16), npm ou yarn, Python 3.10+, Terraform, AWS CLI configurado.
- **macOS**: Node.js, npm/yarn, Python 3.10+, Terraform, AWS CLI (via Homebrew recomendado).

**Variáveis de ambiente (essenciais)**
- **MP_ACCESS_TOKEN**: Token de acesso Mercado Pago (server-side)
- **MP_PUBLIC_KEY**: Public key Mercado Pago (client-side)
- **AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_REGION**: credenciais AWS para Terraform/deploy

**Execução local — Frontend (Windows / macOS)**
- **Instalar dependências**:

Windows PowerShell:

```powershell
cd lojas-omena
npm install
```

macOS / Linux (bash / zsh):

```bash
cd lojas-omena
npm install
```

- **Executar em modo dev**:

```bash
npm run dev
```

- **Acessar**: abra `http://localhost:5173` (ou porta mostrada pelo Vite).

- Observação: coloque a `MP_PUBLIC_KEY` no arquivo de configuração do frontend ou em variáveis de ambiente que o projeto suporte (ex.: uso de `.env` com Vite: `VITE_MP_PUBLIC_KEY`). Nunca coloque o `MP_ACCESS_TOKEN` no frontend.

**Execução backend / deploy — Terraform + AWS (Windows / macOS)**
- **Pré-requisitos**: Ter AWS CLI configurado (credenciais) e Terraform instalado.
- **Passos**:

```bash
cd backend/terraform
terraform init
terraform plan
terraform apply
```

- O Terraform irá provisionar os recursos (Lambda, IAM, S3, etc.) conforme `main.tf`.
- Antes do deploy, configure as variáveis que o Terraform ou as Lambdas esperam (ex.: `MP_ACCESS_TOKEN`) via método suportado (variáveis de ambiente no provider, arquivo Terraform `variables.tf`, ou via console/Secrets Manager). Se o `main.tf` estiver configurado para ler variáveis de ambiente, exporte-as localmente:

Windows PowerShell:

```powershell
$env:MP_ACCESS_TOKEN = "SEU_TOKEN_MP"
$env:AWS_ACCESS_KEY_ID = "..."
$env:AWS_SECRET_ACCESS_KEY = "..."
$env:AWS_REGION = "us-east-1"
```

macOS / Linux:

```bash
export MP_ACCESS_TOKEN="SEU_TOKEN_MP"
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_REGION="us-east-1"
```

**Observações sobre a Lambda**
- As funções Lambda estão em `backend/lambda-functions`.
- O código do backend deve usar `MP_ACCESS_TOKEN` para chamar a API do Mercado Pago e gerar tokens/parcelamentos, retornando apenas o necessário ao frontend.

**Testes locais e fluxo**
- Fluxo típico:
  - Frontend coleta dados do cartão e chama o backend para tokenização/processamento seguro.
  - Backend (Lambda) usa `MP_ACCESS_TOKEN` para comunicar com Mercado Pago e efetuar a cobrança ou criar o pagamento.
- Para testar sem deploy (opcional): simular chamadas HTTP às Lambdas usando `curl` ou configurar um mock local. Se necessário, posso adicionar instruções específicas para executar uma função Lambda localmente.

**Dicas e Troubleshooting**
- Erro de permissão no Terraform: verifique as credenciais AWS e políticas (IAM).
- Problemas com dependências Python: crie um virtualenv:

```bash
python -m venv .venv
source .venv/bin/activate   # macOS / Linux
.\\.venv\\Scripts\\Activate  # Windows PowerShell
pip install -r backend/requirements.txt  # se existir
```

- Credenciais Mercado Pago inválidas: confirme `MP_ACCESS_TOKEN` e o modo (sandbox vs produção). Use endpoints sandbox quando estiver testando.

**Segurança**
- Nunca comite `MP_ACCESS_TOKEN` nem chaves AWS ao repositório.
- Use Secrets Manager / Parameter Store ou variáveis de ambiente seguras para produção.

**Próximos passos recomendados**
- Validar rotas do frontend para garantir uso correto da `MP_PUBLIC_KEY`.
- Garantir que as Lambdas retornem erros claros e tratáveis pelo frontend.
- Adicionar instruções de CI/CD (opcional): pipeline para aplicar Terraform e deploy das Lambdas.

**Contato / Suporte**
- Se quiser, posso: gerar exemplos de `.env`, adicionar script de empacotamento para Lambda, ou criar instruções para testes locais com SAM/LocalStack. Diga qual opção prefere.

Fim do README
