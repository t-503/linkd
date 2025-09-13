#!/bin/bash
get_stats() {
  CPU=$(top -bn1 | grep "Cpu(s)" | awk '{print 100 - $8}')
  RAM_TOTAL=$(free -m | awk '/Mem:/ {print $2}')
  RAM_USED=$(free -m | awk '/Mem:/ {print $3}')
  DISK=$(df -h --total | awk '/total/ {print $5}')
  UPTIME=$(uptime -p)
  PROCS=$(ps -eo pid,comm,%cpu,%mem --sort=-%cpu | head -n 10 | awk '{print $1":"$2":"$3"%:"$4"%"}' | paste -sd "," -)
  PORTS=$(ss -tuln | awk 'NR>1 {print $1":"$5}' | paste -sd "," -)
  NETSTAT=$(ip -4 addr show | grep inet | awk '{print $2}' | paste -sd "," -)
  GPU=$(lspci 2>/dev/null | grep -i vga | awk -F': ' '{print $2}' | paste -sd "," -)

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
  "top_processes": "${PROCS}",
  "open_ports": "${PORTS}"
}
EOF
}

PORT=6223
echo "Starting monitor server on 0.0.0.0:${PORT}"
while true; do
  socat -T60 TCP-LISTEN:${PORT},reuseaddr,fork SYSTEM:"/bin/bash -c 'get_stats'"
done
