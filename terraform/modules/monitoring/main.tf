# SNS Topic for Alarms
resource "aws_sns_topic" "alarm_topic" {
  name = "${var.cluster_name}-alarms"
}

resource "aws_sns_topic_subscription" "alarm_subscription" {
  topic_arn = aws_sns_topic.alarm_topic.arn
  protocol  = "email"
  endpoint  = var.alarm_email
}

# CPU Utilization Alarm
resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "${var.service_name}-cpu-utilization-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period             = "300"
  statistic          = "Average"
  threshold          = "85"
  alarm_description  = "CPU utilization is too high"
  alarm_actions      = [aws_sns_topic.alarm_topic.arn]

  dimensions = {
    ClusterName = var.cluster_name
    ServiceName = var.service_name
  }
}

# Memory Utilization Alarm
resource "aws_cloudwatch_metric_alarm" "memory_high" {
  alarm_name          = "${var.service_name}-memory-utilization-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period             = "300"
  statistic          = "Average"
  threshold          = "85"
  alarm_description  = "Memory utilization is too high"
  alarm_actions      = [aws_sns_topic.alarm_topic.arn]

  dimensions = {
    ClusterName = var.cluster_name
    ServiceName = var.service_name
  }
}

# Service Health Dashboard
resource "aws_cloudwatch_dashboard" "service_dashboard" {
  dashboard_name = "${var.service_name}-dashboard"
  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ServiceName", var.service_name, "ClusterName", var.cluster_name],
            [".", "MemoryUtilization", ".", ".", ".", "."]
          ]
          period = 300
          stat   = "Average"
          region = data.aws_region.current.name
          title  = "Service Resource Utilization"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", var.load_balancer_name],
            [".", "HTTPCode_Target_4XX_Count", ".", "."],
            [".", "HTTPCode_Target_5XX_Count", ".", "."]
          ]
          period = 300
          stat   = "Sum"
          region = data.aws_region.current.name
          title  = "Request Metrics"
        }
      }
    ]
  })
}

# Log Metric Filters
resource "aws_cloudwatch_log_metric_filter" "error_logs" {
  name           = "${var.service_name}-error-logs"
  pattern        = "[timestamp, level=ERROR, message]"
  log_group_name = "/ecs/${var.cluster_name}/${var.service_name}"

  metric_transformation {
    name          = "ErrorCount"
    namespace     = "CustomMetrics"
    value         = "1"
    default_value = "0"
  }
}

# Error Log Alarm
resource "aws_cloudwatch_metric_alarm" "error_logs_alarm" {
  alarm_name          = "${var.service_name}-error-logs-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ErrorCount"
  namespace           = "CustomMetrics"
  period             = "300"
  statistic          = "Sum"
  threshold          = "10"
  alarm_description  = "High number of error logs detected"
  alarm_actions      = [aws_sns_topic.alarm_topic.arn]
}

data "aws_region" "current" {} 