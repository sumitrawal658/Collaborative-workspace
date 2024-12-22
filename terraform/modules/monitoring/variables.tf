variable "cluster_name" {
  description = "Name of the ECS cluster"
  type        = string
}

variable "service_name" {
  description = "Name of the ECS service"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "alarm_email" {
  description = "Email address for CloudWatch alarms"
  type        = string
}

variable "load_balancer_name" {
  description = "Name of the Application Load Balancer"
  type        = string
  default     = ""
} 