variable "cluster_name" {
  description = "Name of the ECS cluster"
  type        = string
}

variable "service_name" {
  description = "Name of the ECS service"
  type        = string
}

variable "min_capacity" {
  description = "Minimum number of tasks"
  type        = number
}

variable "max_capacity" {
  description = "Maximum number of tasks"
  type        = number
}

variable "target_cpu_value" {
  description = "Target CPU utilization percentage"
  type        = number
}

variable "target_memory_value" {
  description = "Target memory utilization percentage"
  type        = number
} 