#!/bin/bash

get_stats() {
  CPU=$(top -bn1 | grep "Cpu(s)" | awk '{print 100 - $8}')
  RAM_TOTAL=$(free -m | awk '/Mem:/ {print $2}')
  RAM_USED=$(free -m | awk '/Mem:/ {print $3}')
  DISK=$(df -h --total | awk '/total/ {print $5}')
  UPTIME=$(uptime -p)
  PROCS=$(ps -eo pid,comm,%cpu,%mem --sort=-%cpu | head -n 10)
  PORTS=$(ss -tuln | awk 'NR>1 {print $1,$5}')
  NETSTAT=$(ip -4 addr show | grep inet | awk '{print $2}' | tr '\n' ' ')
  GPU=$(lspci | grep -i vga | awk -F': ' '{print $2}' | tr '\n' ',')
  cat <<EOF
{
  "cpu_usage": "${CPU}%",
  "ram": {
    "total_mb": ${RAM_TOTAL},
    "used_mb": ${RAM_USED}
  },
  "disk_usage": "${DISK}",
  "uptime": "${UPTIME}",
  "network_interfaces": "${NETSTAT}",
  "gpu": "${GPU}",
  "top_processes": "$(echo "$PROCS" | tr '\n' '|' )",
  "open_ports": "$(echo "$PORTS" | tr '\n' '|' )"
}
EOF
}
while true; do
  socat -T60 TCP-LISTEN:5023,reuseaddr,fork SYSTEM:"get_stats"
done
