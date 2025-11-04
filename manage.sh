#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

APP_NAME="aexpo-auth"
APP_DIR="/var/www/aexpo-auth"

echo -e "${GREEN}=== aexpo-auth Management Script ===${NC}\n"

# Function to show menu
show_menu() {
    echo "Please select an option:"
    echo "1) Show app status"
    echo "2) Show logs (live)"
    echo "3) Show last 100 log lines"
    echo "4) Restart app"
    echo "5) Stop app"
    echo "6) Start app"
    echo "7) Show app info"
    echo "8) Show environment variables"
    echo "9) Backup database"
    echo "10) Check health"
    echo "0) Exit"
    echo ""
}

# Function to show status
show_status() {
    echo -e "${GREEN}App Status:${NC}"
    pm2 status $APP_NAME
}

# Function to show live logs
show_logs_live() {
    echo -e "${GREEN}Live logs (Ctrl+C to exit):${NC}"
    pm2 logs $APP_NAME
}

# Function to show last logs
show_logs_last() {
    echo -e "${GREEN}Last 100 log lines:${NC}"
    pm2 logs $APP_NAME --lines 100 --nostream
}

# Function to restart app
restart_app() {
    echo -e "${YELLOW}Restarting $APP_NAME...${NC}"
    pm2 restart $APP_NAME
    sleep 2
    show_status
}

# Function to stop app
stop_app() {
    echo -e "${YELLOW}Stopping $APP_NAME...${NC}"
    pm2 stop $APP_NAME
    show_status
}

# Function to start app
start_app() {
    echo -e "${GREEN}Starting $APP_NAME...${NC}"
    cd $APP_DIR
    pm2 start ecosystem.config.js
    sleep 2
    show_status
}

# Function to show app info
show_info() {
    echo -e "${GREEN}App Information:${NC}"
    pm2 show $APP_NAME
}

# Function to show env
show_env() {
    echo -e "${GREEN}Environment Variables:${NC}"
    if [ -f "$APP_DIR/.env" ]; then
        cat $APP_DIR/.env | grep -v "PASSWORD\|SECRET"
    else
        echo -e "${RED}.env file not found${NC}"
    fi
}

# Function to backup database
backup_db() {
    echo -e "${YELLOW}Creating database backup...${NC}"
    
    # Load .env
    if [ -f "$APP_DIR/.env" ]; then
        export $(cat $APP_DIR/.env | grep -v '^#' | xargs)
    fi
    
    BACKUP_DIR="$APP_DIR/backups"
    mkdir -p $BACKUP_DIR
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql"
    
    PGPASSWORD=$DB_PASSWORD pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USERNAME -d $DB_NAME > $BACKUP_FILE
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Backup created: $BACKUP_FILE${NC}"
        # Compress backup
        gzip $BACKUP_FILE
        echo -e "${GREEN}Compressed: ${BACKUP_FILE}.gz${NC}"
    else
        echo -e "${RED}Backup failed${NC}"
    fi
}

# Function to check health
check_health() {
    echo -e "${GREEN}Health Check:${NC}\n"
    
    # Check if app is running
    if pm2 list | grep -q $APP_NAME; then
        echo -e "PM2 Process: ${GREEN}✓ Running${NC}"
    else
        echo -e "PM2 Process: ${RED}✗ Not running${NC}"
        return 1
    fi
    
    # Check if port is listening
    if netstat -tulpn 2>/dev/null | grep -q ":5000"; then
        echo -e "Port 5000: ${GREEN}✓ Listening${NC}"
    else
        echo -e "Port 5000: ${RED}✗ Not listening${NC}"
    fi
    
    # Check HTTP response
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000 2>/dev/null)
    if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "404" ]; then
        echo -e "HTTP Response: ${GREEN}✓ Responding (${HTTP_CODE})${NC}"
    else
        echo -e "HTTP Response: ${RED}✗ Not responding${NC}"
    fi
    
    # Check database connection
    if [ -f "$APP_DIR/.env" ]; then
        export $(cat $APP_DIR/.env | grep -v '^#' | xargs)
        if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USERNAME -d $DB_NAME -c "SELECT 1" > /dev/null 2>&1; then
            echo -e "Database: ${GREEN}✓ Connected${NC}"
        else
            echo -e "Database: ${RED}✗ Cannot connect${NC}"
        fi
    fi
    
    # Check disk space
    DISK_USAGE=$(df -h $APP_DIR | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$DISK_USAGE" -lt 80 ]; then
        echo -e "Disk Space: ${GREEN}✓ ${DISK_USAGE}% used${NC}"
    else
        echo -e "Disk Space: ${YELLOW}⚠ ${DISK_USAGE}% used${NC}"
    fi
    
    # Check memory usage
    MEM_USAGE=$(pm2 jlist | grep -A 10 $APP_NAME | grep '"memory"' | awk '{print $2}' | sed 's/,//')
    if [ ! -z "$MEM_USAGE" ]; then
        MEM_MB=$((MEM_USAGE / 1024 / 1024))
        echo -e "Memory Usage: ${GREEN}${MEM_MB} MB${NC}"
    fi
}

# Main loop
while true; do
    show_menu
    read -p "Enter option: " choice
    echo ""
    
    case $choice in
        1) show_status ;;
        2) show_logs_live ;;
        3) show_logs_last ;;
        4) restart_app ;;
        5) stop_app ;;
        6) start_app ;;
        7) show_info ;;
        8) show_env ;;
        9) backup_db ;;
        10) check_health ;;
        0) 
            echo -e "${GREEN}Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid option${NC}"
            ;;
    esac
    
    echo -e "\n${YELLOW}Press Enter to continue...${NC}"
    read
    clear
done
