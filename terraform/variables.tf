variable "observability_namespace" {
  description = "Kubernetes namespace for PathPilot monitoring tools"
  type        = string
  default     = "pathpilot-observability"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "development"
}
