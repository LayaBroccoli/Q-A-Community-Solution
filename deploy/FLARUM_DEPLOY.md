# Flarum 部署指南

## 系统要求

- **操作系统**: Linux (CentOS/RHEL 7+)
- **Web服务器**: Nginx 1.18+
- **PHP**: 8.1+ (推荐 8.3)
- **数据库**: MySQL 5.7+ / MariaDB 10.3+
- **内存**: 最低 512MB，推荐 1GB

---

## 快速部署

### 1. 安装依赖

```bash
# 安装 EPEL 和 Remi 仓库
yum install -y epel-release
yum install -y https://rpms.remirepo.net/enterprise/remi-release-8.rpm

# 启用 PHP 8.3
yum module enable php:remi-8.3 -y

# 安装 PHP 和扩展
yum install -y php php-fpm php-mysqlnd php-curl php-json php-zip php-mbstring php-xml php-gd

# 安装 Nginx
yum install -y nginx

# 安装 Composer
curl -sS https://getcomposer.org/installer | php
mv composer.phar /usr/local/bin/composer
chmod +x /usr/local/bin/composer
```

### 2. 创建数据库

```bash
mysql -u root -p
```

```sql
CREATE DATABASE flarum CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'flarum'@'localhost' IDENTIFIED BY 'Flarum@2026!';
GRANT ALL PRIVILEGES ON flarum.* TO 'flarum'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. 安装 Flarum

```bash
# 创建目录
mkdir -p /var/www/flarum
cd /var/www/flarum

# 安装 Flarum
composer create-project flarum/flarum . --no-dev

# 设置权限
chown -R apache:apache /var/www/flarum
chmod -R 755 /var/www/flarum/storage
```

### 4. 配置 PHP-FPM

编辑 `/etc/php-fpm.d/www.conf`:

```ini
listen = /run/php-fpm/www.sock
listen.owner = apache
listen.group = apache
listen.mode = 0666
user = apache
group = apache
```

重启 PHP-FPM:

```bash
systemctl restart php-fpm
systemctl enable php-fpm
```

### 5. 配置 Nginx

复制配置文件:

```bash
cp deploy/flarum/flarum.conf /etc/nginx/conf.d/flarum.conf
```

配置文件内容见 `deploy/flarum/flarum.conf`

重启 Nginx:

```bash
nginx -t
systemctl restart nginx
systemctl enable nginx
```

### 6. 访问论坛

打开浏览器访问 `http://your-server-ip`

---

## 配置文件

### Nginx 配置

位置: `/etc/nginx/conf.d/flarum.conf`

```nginx
server {
    listen 80;
    server_name _;
    root /var/www/flarum/public;
    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/run/php-fpm/www.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_param PATH_INFO $fastcgi_path_info;
        # ... 更多参数见完整配置文件
    }
}
```

### Flarum 配置

位置: `/var/www/flarum/config.php`

```php
<?php
return [
    'debug' => false,
    'database' => [
        'driver' => 'mysql',
        'host' => 'localhost',
        'port' => 3306,
        'database' => 'flarum',
        'username' => 'flarum',
        'password' => 'Flarum@2026!',
        'charset' => 'utf8mb4',
        'collation' => 'utf8mb4_unicode_ci',
    ],
    'url' => 'http://your-domain.com',
    'timezone' => 'Asia/Shanghai',
];
```

---

## 常见问题

### 502 Bad Gateway

**原因**: PHP-FPM 未运行或 socket 路径错误

**解决**:
```bash
systemctl status php-fpm
ls -la /run/php-fpm/www.sock
```

### 权限错误

**解决**:
```bash
chown -R apache:apache /var/www/flarum
chmod -R 755 /var/www/flarum/storage
```

### 数据库连接失败

**检查**:
```bash
mysql -u flarum -p'Flarum@2026!' flarum -e "SELECT 1"
```

---

## 维护命令

### 清理缓存
```bash
php /var/www/flarum/flarum cache:clear
```

### 更新 Flarum
```bash
cd /var/www/flarum
composer update flarum/core
php flarum migrate
php flarum cache:clear
```

### 备份数据库
```bash
mysqldump -u flarum -p'Flarum@2026!' flarum > backup_$(date +%Y%m%d).sql
```

---

## 安全建议

1. **修改默认密码**: 更改数据库密码和管理员密码
2. **HTTPS**: 配置 SSL 证书（Let's Encrypt）
3. **防火墙**: 只开放必要端口
4. **更新**: 定期更新 Flarum 和依赖

---

## 性能优化

1. **启用 OPcache**: PHP 自带，确保配置正确
2. **配置缓存**: 使用 Redis/Memcached
3. **CDN**: 配置静态资源 CDN
4. **数据库优化**: 定期清理日志

---

## 相关链接

- [Flarum 官网](https://flarum.org/)
- [Flarum 文档](https://docs.flarum.org/)
- [Flarum 扩展](https://extiverse.com/)

---

**部署时间**: 2026-02-24
**状态**: ✅ 已测试
