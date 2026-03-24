server {
    server_name livekit.vervel.ru;

    location / {
        proxy_pass http://localhost:7880;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/livekit.vervel.ru/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/livekit.vervel.ru/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

}
server {
    if ($host = livekit.vervel.ru) {
        return 301 https://$host$request_uri;
    } # managed by Certbot


    listen 80;
    server_name livekit.vervel.ru;
    return 404; # managed by Certbot


}
