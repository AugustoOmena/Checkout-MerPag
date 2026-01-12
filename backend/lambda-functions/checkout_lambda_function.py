import json
import mercadopago
import os

def lambda_handler(event, context):
    # Log estruturado para o CloudWatch (Fundamental para debug Sênior)
    print("🚀 Início da execução Lambda")
    
    # 1. Verificação de Ambiente (Fail Fast)
    access_token = os.environ.get("MP_ACCESS_TOKEN")
    if not access_token:
        print("❌ ERRO CRÍTICO: Variável MP_ACCESS_TOKEN não encontrada.")
        return http_response(500, {"error": "Configuração de servidor inválida"})
    
    # Log mascarado para debug (verificamos se o token começa certo sem vazar a senha)
    print(f"🔑 Token carregado (Início): {access_token[:10]}...")

    # 2. Setup SDK
    try:
        sdk = mercadopago.SDK(access_token)
    except Exception as e:
        print(f"❌ Erro ao instanciar SDK: {str(e)}")
        return http_response(500, {"error": "Falha no SDK de Pagamento"})

    # 3. Parse do Body
    try:
        if not event.get("body"):
            return http_response(400, {"error": "Body vazio"})
        payload = json.loads(event["body"])
    except Exception as e:
        print(f"❌ Erro JSON: {str(e)}")
        return http_response(400, {"error": "JSON inválido"})

    # 4. Construção do Payload (Mapping)
    payment_data = {
        "transaction_amount": float(payload.get("transaction_amount", 0)),
        "token": payload.get("token"),
        "description": "Venda Lojas Omena",
        "installments": int(payload.get("installments", 1)),
        "payment_method_id": payload.get("payment_method_id"),
        "payer": {
            "email": payload.get("payer", {}).get("email")
        }
    }
    
    print(f"📦 Enviando ao Mercado Pago: R$ {payment_data['transaction_amount']} - Método: {payment_data['payment_method_id']}")

    # 5. Chamada Externa
    try:
        request_options = mercadopago.config.RequestOptions()
        # Custom header para garantir idempotência (Boas práticas de pagamentos)
        # request_options.custom_headers = {'x-idempotency-key': ...} 
        
        payment_response = sdk.payment().create(payment_data, request_options)
        payment = payment_response["response"]
        status_code = payment_response["status"]

        print(f"✅ Resposta MP Status: {status_code}")
        
        # Tratamento de erro vindo do Mercado Pago (400, 401, etc)
        if status_code >= 400:
            print(f"⚠️ Erro do MP: {json.dumps(payment)}")
            return http_response(status_code, payment)

        return http_response(201, payment)

    except Exception as e:
        print(f"❌ Erro Crítico no Processamento: {str(e)}")
        return http_response(500, {"error": str(e)})

def http_response(status_code, body):
    # SÊNIOR TIP: Não enviamos headers de CORS aqui. Deixamos a AWS Function URL cuidar disso.
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json"
        },
        "body": json.dumps(body)
    }