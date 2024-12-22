terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
  backend "s3" {
    bucket = "collaborative-workspace-terraform-state"
    key    = "terraform.tfstate"
    region = "us-west-2"
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC Configuration
module "vpc" {
  source = "./modules/vpc"
  
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
  environment        = var.environment
}

# ECS Cluster
module "ecs" {
  source = "./modules/ecs"
  
  cluster_name    = "${var.project_name}-${var.environment}"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids
  container_image = var.container_image
  environment     = var.environment
}

# Auto Scaling
module "autoscaling" {
  source = "./modules/autoscaling"
  
  cluster_name        = module.ecs.cluster_name
  service_name        = module.ecs.service_name
  min_capacity       = var.min_capacity
  max_capacity       = var.max_capacity
  target_cpu_value    = var.target_cpu_value
  target_memory_value = var.target_memory_value
}

# CloudWatch Monitoring
module "monitoring" {
  source = "./modules/monitoring"
  
  cluster_name     = module.ecs.cluster_name
  service_name     = module.ecs.service_name
  environment      = var.environment
  alarm_email      = var.alarm_email
}

# Application Load Balancer
module "alb" {
  source = "./modules/alb"
  
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.public_subnet_ids
  environment     = var.environment
  certificate_arn = var.certificate_arn
} 