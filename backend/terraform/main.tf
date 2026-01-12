provider "aws" {
  region = var.aws_region
  profile = "pessoal"
}

# Compacta o código Python automaticamente antes do deploy
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir = "../lambda-functions"
  output_path = "lambda_function.zip"
}

# Role
resource "aws_iam_role" "lambda_exec_role" {
  name = "${var.project_name}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

# Cloud Watch
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Função Lambda checkout de pagamentos
resource "aws_lambda_function" "create_order" {
  function_name = "${var.project_name}-create-order"
  
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  
  role    = aws_iam_role.lambda_exec_role.arn
  handler = "checkout_lambda_function.lambda_handler" # NomeDoArquivo.NomeDaFuncao
  runtime = "python3.9"

  environment {
    variables = {
      MP_ACCESS_TOKEN = var.mp_access_token
    }
  }

  timeout     = 10
  memory_size = 128
}

# Habilita a Function URL (Endpoint HTTPS Público)
resource "aws_lambda_function_url" "url" {
  function_name      = aws_lambda_function.create_order.function_name
  authorization_type = "NONE" # Autenticação é feita via Token no código, não na infra

  cors {
    # SEGURANÇA: allow_credentials = false.
    # Como estamos passando dados via JSON Body (não Cookies), não precisamos de credentials.
    # Isso elimina metade dos problemas de conflito de CORS.
    allow_credentials = false 

    # SEGURANÇA: Whitelist Explícita.
    # Aqui definimos quem pode chamar. Adicione a URL de prod aqui depois.
    allow_origins     = ["http://localhost:5173"] 

    # MÉTODOS: Apenas o necessário. Nada de DELETE, PUT ou GET.
    allow_methods     = ["POST"]

    # HEADERS: Apenas o que seu app realmente envia.
    allow_headers     = ["content-type", "authorization"]
    
    # CACHE: 0 para desenvolvimento (para o navegador não lembrar da regra antiga errada)
    # Em produção mudamos para 86400
    max_age           = 0 
  }
}