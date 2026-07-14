# くらしリレー API（検証用 / ECS移設しやすい最小構成）
# PHP 組み込みサーバー + artisan 相当のルーティングで $PORT 待ち受け。

FROM php:8.2-cli-bookworm

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# ランタイムに必要な拡張（Laravel 基本セット。DB拡張は第1実装では不要）
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git \
        unzip \
        libzip-dev \
    && docker-php-ext-install zip \
    && rm -rf /var/lib/apt/lists/*

# 依存関係の定義だけ先にコピーしてレイヤーキャッシュを効かせる
COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-progress \
    --prefer-dist \
    --optimize-autoloader \
    --no-scripts

# アプリケーション本体（.env は .dockerignore で除外）
COPY . .

# package:discover など、ベンダー同梱後に必要な scripts のみ実行
# ビルド時のみの仮キー（実行時は Render の APP_KEY を使う。イメージへ .env は含めない）
RUN composer dump-autoload --optimize --no-dev \
    && mkdir -p \
        storage/framework/cache \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs \
        bootstrap/cache \
    && APP_KEY=base64:dGVtcG9yYXJ5LWtleS1mb3ItZG9ja2VyLWJ1aWxkLW9ubHk= \
        php artisan package:discover --ansi \
    && chmod -R ug+rwx storage bootstrap/cache

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENV PORT=8000
EXPOSE 8000

ENTRYPOINT ["entrypoint.sh"]
