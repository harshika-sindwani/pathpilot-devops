output "observability_namespace" {
  description = "Name of the Kubernetes namespace managed by Terraform"
  value       = kubernetes_namespace.observability.metadata[0].name
}
