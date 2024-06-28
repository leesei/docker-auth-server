FROM node:20-slim
ENV NODE_ENV "production"

ENV NPM_CONFIG_CACHE="/cache/.npm"
ENV YARN_CACHE_FOLDER="/cache/.yarn"
RUN mkdir -m 777 /cache
VOLUME [ "/cache" ]

# config, see `README.md`
ENV EXPIRY="1d"
ENV PUBLIC_KEY_PATH="/configs/jwt_public.pem"
ENV PRIVATE_KEY_PATH="/configs/jwt_private.pem"
ENV USERS_PATH="/configs/users.json"

WORKDIR /opt/app
COPY app/package.json package-lock.json ./
RUN yarn install
COPY app .

COPY entrypoint.sh /opt/

VOLUME "/configs"
ENTRYPOINT ["/opt/entrypoint.sh"]
# CMD ["--captcha"]
EXPOSE 8000
