server {
    listen 80;
    server_name livekit.vervel.ru;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name livekit.vervel.ru;

    ssl_certificate /etc/letsencrypt/live/livekit.vervel.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/livekit.vervel.ru/privkey.pem;

    # WebSocket support — required for LiveKit
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Long timeouts for video calls
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;

    location / {
        proxy_pass http://localhost:7880;
    }
}
