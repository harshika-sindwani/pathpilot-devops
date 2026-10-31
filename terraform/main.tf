terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.38"
    }
  }
}

provider "kubernetes" {
  config_path    = pathexpand("~/.kube/config")
  config_context = "minikube"
}

resource "kubernetes_namespace" "observability" {
  metadata {
    name = var.observability_namespace

    labels = {
      app         = "pathpilot"
      environment = var.environment
      managed-by  = "terraform"
    }
  }
}
