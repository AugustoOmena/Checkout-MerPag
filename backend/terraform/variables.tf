variable "aws_region" {
  description = "Região da AWS"
  default     = "us-east-1"
}

variable "project_name" {
  description = "Nome do projeto para prefixar recursos"
  default     = "lojas-omena"
}

variable "mp_access_token" {
  description = "Token de acesso do Mercado Pago (Sensitive)"
  type        = string
  sensitive   = true
}