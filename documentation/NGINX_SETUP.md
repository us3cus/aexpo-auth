# Nginx Configuration for aexpo-auth

## Basic HTTP Configuration

Create configuration file:
```bash
sudo nano /etc/nginx/sites-available/aexpo-auth
```

Add the following configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to NestJS application
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        
        # Standard proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Disable proxy buffering for better performance
        proxy_buffering off;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Client max body size (for file uploads)
    client_max_body_size 10M;

    # Logging
    access_log /var/log/nginx/aexpo-auth_access.log;
    error_log /var/log/nginx/aexpo-auth_error.log;
}
```

Enable the configuration:
```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/aexpo-auth /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## SSL Configuration with Let's Encrypt

### Install Certbot
```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx
```

### Obtain SSL Certificate
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Follow the prompts:
1. Enter your email
2. Agree to Terms of Service
3. Choose whether to redirect HTTP to HTTPS (recommended: Yes)

### Auto-renewal
Certbot automatically adds a cron job. Test renewal:
```bash
sudo certbot renew --dry-run
```

### Final HTTPS Configuration

After Certbot, your config will look like:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL certificates (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to NestJS application
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_buffering off;
        proxy_cache_bypass $http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Client max body size
    client_max_body_size 10M;

    # Logging
    access_log /var/log/nginx/aexpo-auth_access.log;
    error_log /var/log/nginx/aexpo-auth_error.log;
}
```

## Performance Optimization

### Enable Gzip Compression
Edit `/etc/nginx/nginx.conf`:
```nginx
http {
    # ... existing config ...
    
    # Gzip Settings
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript 
               application/json application/javascript application/xml+rss 
               application/rss+xml font/truetype font/opentype 
               application/vnd.ms-fontobject image/svg+xml;
    gzip_disable "msie6";
}
```

### Rate Limiting (Optional)
Add to `http` block in `/etc/nginx/nginx.conf`:
```nginx
http {
    # ... existing config ...
    
    # Rate limiting zone
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
}
```

Add to server block:
```nginx
location /api {
    limit_req zone=api_limit burst=20 nodelay;
    proxy_pass http://127.0.0.1:3000;
    # ... rest of proxy config ...
}
```

## Useful Commands

```bash
# Test Nginx configuration
sudo nginx -t

# Reload Nginx (without downtime)
sudo systemctl reload nginx

# Restart Nginx
sudo systemctl restart nginx

# Check Nginx status
sudo systemctl status nginx

# View error logs
sudo tail -f /var/log/nginx/aexpo-auth_error.log

# View access logs
sudo tail -f /var/log/nginx/aexpo-auth_access.log

# Check SSL certificate expiry
sudo certbot certificates
```

## Troubleshooting

### Port 80/443 not accessible
```bash
# Check if Nginx is running
sudo systemctl status nginx

# Check if ports are open
sudo netstat -tulpn | grep nginx

# Check firewall
sudo ufw status
```

### SSL certificate issues
```bash
# Renew certificate manually
sudo certbot renew

# Check certificate status
sudo certbot certificates

# Test certificate renewal
sudo certbot renew --dry-run
```

### 502 Bad Gateway
- Check if NestJS app is running: `pm2 status`
- Check app logs: `pm2 logs aexpo-auth`
- Verify port 3000 is listening: `sudo netstat -tulpn | grep 3000`

### Update BASE_URL in .env
Don't forget to update the BASE_URL in your `.env` file:
```bash
nano /var/www/aexpo-auth/.env
```
Change to:
```env
BASE_URL=https://your-domain.com
```
Then restart the app:
```bash
pm2 restart aexpo-auth
```
