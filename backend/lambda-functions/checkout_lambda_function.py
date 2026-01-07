import json
import urllib.request
import urllib.error
import os
import uuid

# Constantes
MP_API_URL = "https://api.mercadopago.com/v1/orders"

def lambda_handler(event, context):
    """
    Recebe os dados do Frontend e cria a Order no Mercado Pago.
    """
    headers_cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,POST"
    }

    # Resposta para pre-flight request do navegador
    if event.get('requestContext', {}).get('http', {}).get('method') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers_cors,
            'body': ''
        }

    try:
        body = json.loads(event.get('body', '{}'))
        
        if 'token' not in body:
            return build_response(400, {'error': 'Token do cartão não fornecido'}, headers_cors)

        mp_payload = {
            "type": "online",
            "processing_mode": "automatic",
            "total_amount": str(body.get('transactionAmount')),
            "external_reference": f"order_{uuid.uuid4().hex[:10]}",
            "payer": {
                "email": body.get('email')
            },
            "transactions": {
                "payments": [
                    {
                        "amount": str(body.get('transactionAmount')),
                        "payment_method": {
                            "id": body.get('paymentMethodId'),
                            "type": "credit_card",
                            "token": body.get('token'),
                            "installments": int(body.get('installments', 1)),
                            "issuer_id": body.get('issuer') if body.get('issuer') else None
                        }
                    }
                ]
            }
        }

        # Remove campos nulos (como issuer se não tiver)
        mp_payload["transactions"]["payments"][0]["payment_method"] = {
            k: v for k, v in mp_payload["transactions"]["payments"][0]["payment_method"].items() if v is not None
        }

        # Envio da Requisição ao Mercado Pago
        data = json.dumps(mp_payload).encode('utf-8')
        
        req = urllib.request.Request(MP_API_URL, data=data, method='POST')
        req.add_header('Content-Type', 'application/json')
        req.add_header('Authorization', f"Bearer {os.environ.get('MP_ACCESS_TOKEN')}")
        req.add_header('X-Idempotency-Key', str(uuid.uuid4()))

        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            return build_response(201, result, headers_cors)

    except urllib.error.HTTPError as e:
        # Erro retornado pela API do Mercado Pago
        error_body = e.read().decode()
        print(f"Erro MP: {error_body}")
        return build_response(e.code, json.loads(error_body), headers_cors)
        
    except Exception as e:
        # Erro genérico do servidor
        print(f"Erro Interno: {str(e)}")
        return build_response(500, {'error': str(e)}, headers_cors)

def build_response(status_code, body, headers):
    return {
        'statusCode': status_code,
        'headers': headers,
        'body': json.dumps(body)
    }