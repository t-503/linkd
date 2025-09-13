#!/bin/bash
set -euo pipefail

get_stats() {
  CPU=$(top -bn1 | awk '/Cpu\(s\)/{print 100 - $8}')
  if [ -z "$CPU" ]; then
    CPU=$(awk -vOFS='' '{u=$2+$4; t=$2+$4+$5; if(t>0) print (u/t*100)}' /proc/stat 2>/dev/null || echo "0")
  fi

  RAM_TOTAL=$(free -m | awk '/Mem:/ {print $2+0}')
  RAM_USED=$(free -m | awk '/Mem:/ {print $3+0}')
  DISK=$(df -h --total 2>/dev/null | awk '/total/ {print $5}' || echo "N/A")
  UPTIME=$(uptime -p 2>/dev/null || awk '{print}' /proc/uptime)
  PROCS_JSON=$(ps -eo pid,comm,%cpu,%mem --sort=-%cpu | head -n 11 | tail -n +2 | awk '{
    gsub("\"","\\\"",$2);
    printf "{\"pid\":%s,\"comm\":\"%s\",\"cpu\":\"%s\",\"mem\":\"%s\"}", $1, $2, $3, $4;
    if (NR>0) printf ","
  }' | sed 's/,$//')
  PORTS=$(ss -tuln | awk 'NR>1 {print $1" "$5}' | tr '\n' '|' | sed 's/|$//')
  NETSTAT=$(ip -4 addr show 2>/dev/null | awk '/inet/ {print $2}' | tr '\n' ' ' || echo "")
  GPU=$(lspci 2>/dev/null | grep -i -E "vga|3d|nvidia|amd" | awk -F': ' '{print $2}' | tr '\n' ',' | sed 's/,$//')
  HOSTNAME=$(hostname)
  CPU=${CPU:-0}
  RAM_TOTAL=${RAM_TOTAL:-0}
  RAM_USED=${RAM_USED:-0}
  DISK=${DISK:-"N/A"}
  UPTIME=${UPTIME:-"Unknown"}
  PROCS_JSON=${PROCS_JSON:-""}
  PORTS=${PORTS:-""}
  NETSTAT=${NETSTAT:-""}
  GPU=${GPU:-""}
  cat <<JSON
{
  "host":"${HOSTNAME}",
  "cpu_usage_percent":"${CPU}",
  "ram": {
    "total_mb": ${RAM_TOTAL},
    "used_mb": ${RAM_USED}
  },
  "disk_usage": "${DISK}",
  "uptime": "${UPTIME}",
  "network_interfaces": "${NETSTAT}",
  "gpu": "${GPU}",
  "top_processes": [ ${PROCS_JSON} ],
  "open_ports": "${PORTS}",
  "timestamp": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
}
JSON
}
if [ "${1:-}" = "get" ]; then
  get_stats
  exit 0
fi
if ! command -v socat >/dev/null 2>&1; then
  echo "socat not found. install socat (e.g., yum install socat -y / apt install socat -y)" >&2
  exit 2
fi
PORT=5023
echo "Starting monitor server on 0.0.0.0:${PORT} - each connection executes: ${0} get"
SELF="$(readlink -f "$0")"
exec socat -T60 TCP-LISTEN:${PORT},reuseaddr,fork SYSTEM:"/bin/bash -c '${SELF} get'"

