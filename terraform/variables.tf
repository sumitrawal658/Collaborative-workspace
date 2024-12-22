variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-west-2"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "collaborative-workspace"
}

variable "environment" {
  description = "Environment (e.g., dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-west-2a", "us-west-2b", "us-west-2c"]
}

variable "container_image" {
  description = "Docker image for the application"
  type        = string
}

variable "min_capacity" {
  description = "Minimum number of tasks"
  type        = number
  default     = 2
}

variable "max_capacity" {
  description = "Maximum number of tasks"
  type        = number
  default     = 10
}

variable "target_cpu_value" {
  description = "Target CPU utilization percentage"
  type        = number
  default     = 70
}

variable "target_memory_value" {
  description = "Target memory utilization percentage"
  type        = number
  default     = 80
}

variable "alarm_email" {
  description = "Email address for CloudWatch alarms"
  type        = string
}

variable "certificate_arn" {
  description = "ARN of SSL certificate for HTTPS"
  type        = string
} 