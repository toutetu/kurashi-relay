# くらしリレー API（検証用 / ECS移設しやすい最小構成）
# PHP 組み込みサーバー相当のルーティングで $PORT 待ち受け。

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

# Artisan実行前に書込先を用意し、ビルド時だけ仮APP_KEYを渡して
# dump-autoload（= post-autoload-dump 内の package:discover を1回）を実行する。
# 仮キーは ENV に残さない。実行時は Render の APP_KEY を使う。
RUN mkdir -p \
        storage/framework/cache \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs \
        bootstrap/cache \
    && chmod -R ug+rwx storage bootstrap/cache \
    && export APP_KEY="$(php -r 'echo '\''base64:'\'' . base64_encode(random_bytes(32));')" \
    && composer dump-autoload --optimize --no-dev \
    && unset APP_KEY

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENV PORT=8000
EXPOSE 8000

ENTRYPOINT ["entrypoint.sh"]
